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

MAX_DIFF_CHARS = 40000  # Gemini Flash has a large context window (1M tokens)
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

def main():
    diff_file = sys.argv[1] if len(sys.argv) > 1 else "diff.txt"
    output_file = sys.argv[2] if len(sys.argv) > 2 else "pr_summary.md"

    if not os.path.exists(diff_file):
        print(f"Error: Diff file '{diff_file}' not found.")
        sys.exit(1)

    with open(diff_file, "r", encoding="utf-8", errors="ignore") as f:
        diff_text = f.read()

    if not diff_text.strip():
        print("Diff is empty. Writing default placeholder.")
        with open(output_file, "w", encoding="utf-8") as f:
            f.write("No significant code changes detected in diff.")
        return

    # Check for missing API Key
    if not GEMINI_API_KEY:
        print("Warning: GEMINI_API_KEY is not set.")
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(
                "## 📋 Pull Request Summary\n\n"
                "> ⚠️ **Gemini API Key Required**: Please add `GEMINI_API_KEY` to your repository secrets "
                "(**Settings** → **Secrets and variables** → **Actions** → **New repository secret**) "
                "to enable automated PR summaries with Google Gemini.\n"
            )
        return

    # Truncate if diff exceeds safety limit
    if len(diff_text) > MAX_DIFF_CHARS:
        diff_text = diff_text[:MAX_DIFF_CHARS] + "\n\n... [Remaining diff truncated for prompt safety] ..."

    prompt = (
        "You are an expert software engineer and technical lead.\n"
        "Analyze the following git diff and generate a clear, professional Pull Request summary.\n\n"
        "Requirements:\n"
        "1. Write a 2-3 sentence overview explaining WHAT changed and WHY.\n"
        "2. Break down the key changes grouped logically by component (e.g. Backend API, Web App, Mobile, Documentation).\n"
        "3. Provide a practical verification / testing checklist based on the changes.\n"
        "4. Output STRICTLY the markdown template below. Do not add conversational intro/outro.\n\n"
        "Template to follow:\n"
        "## Pull Request Summary\n\n"
        "### Overview & Purpose\n"
        "<2-3 sentence summary>\n\n"
        "### Key Changes by Component\n"
        "- **Component Name**: Description of key changes\n\n"
        "### Verification Checklist\n"
        "- [ ] Test item 1\n"
        "- [ ] Test item 2\n\n"
        "---\n"
        f">  *Generated automatically by Google Gemini (`{GEMINI_MODEL}`)*\n\n"
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

    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    print(f"Calling Google Gemini API ({GEMINI_MODEL}) with {len(diff_text)} chars diff...")

    try:
        req = urllib.request.Request(
            api_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))
            candidates = result.get("candidates", [])
            if candidates:
                content = candidates[0].get("content", {})
                parts = content.get("parts", [])
                summary = parts[0].get("text", "").strip() if parts else ""
            else:
                summary = "Failed to extract summary from Gemini response."

        with open(output_file, "w", encoding="utf-8") as f:
            f.write(summary)

        print(f"Successfully generated summary in '{output_file}'.")

    except urllib.error.HTTPError as ex:
        err_msg = ex.read().decode("utf-8")
        print(f"Gemini API HTTP Error {ex.code}: {err_msg}", file=sys.stderr)
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(
                f"## 📋 Pull Request Summary\n\n"
                f"*Error calling Gemini API (HTTP {ex.code}). Please check your GEMINI_API_KEY repository secret.*\n"
            )
    except Exception as ex:
        print(f"Error calling Gemini API: {ex}", file=sys.stderr)
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(
                "## 📋 Pull Request Summary\n\n"
                "*Error calling Gemini API. Please refer to commit history.*\n"
            )

if __name__ == "__main__":
    main()

