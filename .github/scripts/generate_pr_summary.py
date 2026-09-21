#!/usr/bin/env python3
"""
-----------------------------------------------------------------------------
Script      : generate_pr_summary.py
Project     : Smart Solar Microgrid Trading System
Description : Reads the filtered git diff, constructs an AI prompt, calls the
              Google Gemini API, and writes a structured Pull Request summary
              markdown document.
-----------------------------------------------------------------------------
"""

import json
import os
import sys
import urllib.request
import urllib.error

SUPPORTED_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview",
    "gemini-3-flash-preview",
]

MAX_DIFF_CHARS = 50000
DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", SUPPORTED_MODELS[0])
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

def main():
    diff_file = sys.argv[1] if len(sys.argv) > 1 else "diff.txt"
    output_file = sys.argv[2] if len(sys.argv) > 2 else "pr_summary.md"
    title_file = sys.argv[3] if len(sys.argv) > 3 else "pr_title.txt"

    if not os.path.exists(diff_file):
        print(f"Error: Diff file '{diff_file}' not found.")
        sys.exit(1)

    with open(diff_file, "r", encoding="utf-8", errors="ignore") as f:
        diff_text = f.read()

    if not diff_text.strip():
        print("Diff is empty. Writing default placeholder.")
        with open(output_file, "w", encoding="utf-8") as f:
            f.write("No significant code changes detected in diff.")
        with open(title_file, "w", encoding="utf-8") as f:
            f.write("")
        return

    # Check for missing API Key
    if not GEMINI_API_KEY:
        print("Warning: GEMINI_API_KEY is not set.")
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(
                "## Pull Request Summary\n\n"
                "> **Gemini API Key Required**: Please add `GEMINI_API_KEY` to your repository secrets "
                "(**Settings** → **Secrets and variables** → **Actions** → **New repository secret**) "
                "to enable automated PR summaries with Google Gemini.\n"
            )
        with open(title_file, "w", encoding="utf-8") as f:
            f.write("")
        return

    # Truncate if diff exceeds safety limit
    if len(diff_text) > MAX_DIFF_CHARS:
        diff_text = diff_text[:MAX_DIFF_CHARS] + "\n\n... [Remaining diff truncated for prompt safety] ..."

    # Build prioritized candidate list
    candidate_models = [DEFAULT_MODEL] + [m for m in SUPPORTED_MODELS if m != DEFAULT_MODEL]
    last_error = None

    for model in candidate_models:
        print(f"Calling Google Gemini API ({model}) with {len(diff_text)} chars diff...")

        prompt = (
            "You are an expert software engineer and technical lead.\n"
            "Analyze the following git diff and generate a clear, professional Pull Request title and summary.\n\n"
            "Requirements:\n"
            "1. Output a concise Conventional Commit title on the very first line starting with 'TITLE: <type>(<scope>): <subject>' (e.g. 'TITLE: feat(stations): add battery slot management and node deletion'). Keep title under 72 chars.\n"
            "2. Write a 2-3 sentence overview explaining WHAT changed and WHY.\n"
            "3. Break down the key changes grouped logically by component (e.g. Backend API, Web App, Mobile, Documentation).\n"
            "4. Provide a practical verification / testing checklist based on the changes.\n"
            "5. Do NOT use any emojis anywhere in your response.\n"
            "6. Output STRICTLY the markdown template below. Do not add conversational intro/outro.\n\n"
            "Template to follow:\n"
            "TITLE: <type>(<scope>): <concise subject>\n\n"
            "## Pull Request Summary\n\n"
            "### Overview & Purpose\n"
            "<2-3 sentence summary>\n\n"
            "### Key Changes by Component\n"
            "- **Component Name**: Description of key changes\n\n"
            "### Verification Checklist\n"
            "- [ ] Test item 1\n"
            "- [ ] Test item 2\n\n"
            "---\n"
            f"> *Generated automatically by Google Gemini (`{model}`)*\n\n"
            f"Git Diff:\n```diff\n{diff_text}\n```"
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 2048
            }
        }

        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"

        try:
            req = urllib.request.Request(
                api_url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=45) as response:
                result = json.loads(response.read().decode("utf-8"))
                candidates = result.get("candidates", [])
                if candidates:
                    content = candidates[0].get("content", {})
                    parts = content.get("parts", [])
                    summary = parts[0].get("text", "").strip() if parts else ""
                    if summary:
                        # Extract TITLE: line
                        extracted_title = ""
                        body_lines = []
                        for line in summary.splitlines():
                            if not extracted_title and line.strip().upper().startswith("TITLE:"):
                                extracted_title = line.strip()[6:].strip()
                            else:
                                body_lines.append(line)

                        clean_summary = "\n".join(body_lines).strip()

                        with open(output_file, "w", encoding="utf-8") as f:
                            f.write(clean_summary if clean_summary else summary)

                        if extracted_title:
                            with open(title_file, "w", encoding="utf-8") as f:
                                f.write(extracted_title)
                            print(f"Extracted PR title: '{extracted_title}' written to '{title_file}'.")

                        print(f"Successfully generated summary in '{output_file}' using model '{model}'.")
                        return

            print(f"Model '{model}' returned empty candidate response, trying next model...")
            last_error = "Empty candidate response"

        except urllib.error.HTTPError as ex:
            err_msg = ex.read().decode("utf-8", errors="ignore")
            print(f"Model '{model}' failed with HTTP {ex.code}: {err_msg}", file=sys.stderr)
            last_error = f"HTTP {ex.code}"
            continue
        except Exception as ex:
            print(f"Model '{model}' failed with error: {ex}", file=sys.stderr)
            last_error = str(ex)
            continue

    # Fallback if all candidate models failed
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(
            f"## Pull Request Summary\n\n"
            f"*Error calling Gemini API across models: {SUPPORTED_MODELS} (Last error: {last_error}). "
            f"Please check your GEMINI_API_KEY repository secret.*\n"
        )

if __name__ == "__main__":
    main()

