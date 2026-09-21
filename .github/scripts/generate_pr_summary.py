#!/usr/bin/env python3
"""
-----------------------------------------------------------------------------
Script      : generate_pr_summary.py
Project     : Smart Solar Microgrid Trading System
Description : Reads the filtered git diff, constructs an AI prompt with token
              guardrails, calls the local open-source Ollama model, and writes
              a structured Pull Request summary markdown document.
-----------------------------------------------------------------------------
"""

import json
import os
import sys
import urllib.request

MAX_DIFF_CHARS = 12000
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5-coder:1.5b")
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")

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

    # Truncate large diffs to avoid exceeding model context window
    if len(diff_text) > MAX_DIFF_CHARS:
        diff_text = diff_text[:MAX_DIFF_CHARS] + "\n\n... [Remaining diff truncated to fit model context] ..."

    system_prompt = (
        "You are an expert senior software engineer and code reviewer.\n"
        "Analyze the following git diff and generate a concise, professional Pull Request description.\n\n"
        "Requirements:\n"
        "1. Write a clear summary explaining WHAT changed and WHY.\n"
        "2. Break down the key changes grouped logically by component (Backend, Web, Mobile, Docs).\n"
        "3. Include a concise testing / verification checklist.\n"
        "4. Follow the markdown structure below strictly. Do not hallucinate files not present in the diff.\n\n"
        "Structure:\n"
        "## 📋 Pull Request Summary\n\n"
        "### 🎯 Overview & Purpose\n"
        "<2-3 sentence overview>\n\n"
        "### 🔍 Key Changes by Component\n"
        "- **Component**: Details of changes.\n\n"
        "### 🧪 Verification & Testing\n"
        "- [ ] Verification step 1\n"
        "- [ ] Verification step 2\n\n"
        "---\n"
        f"> 🤖 *Generated automatically by Open-Source AI (`{OLLAMA_MODEL}`)*\n"
    )

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": f"{system_prompt}\n\nGit Diff:\n```diff\n{diff_text}\n```\n",
        "stream": False,
        "options": {
            "temperature": 0.2,
            "top_p": 0.9
        }
    }

    print(f"Sending diff ({len(diff_text)} chars) to {OLLAMA_MODEL}...")

    try:
        req = urllib.request.Request(
            OLLAMA_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=180) as response:
            result = json.loads(response.read().decode("utf-8"))
            summary = result.get("response", "").strip()

        with open(output_file, "w", encoding="utf-8") as f:
            f.write(summary)

        print(f"Successfully generated summary in '{output_file}'.")

    except Exception as ex:
        print(f"Error calling Ollama API: {ex}", file=sys.stderr)
        # Fallback graceful markdown if inference fails
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(
                "## 📋 Pull Request Summary\n\n"
                "*Note: Automated AI summary generation timed out or encountered an error. Please refer to git commit history.*\n"
            )

if __name__ == "__main__":
    main()
