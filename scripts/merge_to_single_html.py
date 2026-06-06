"""
Optional: rebuild a single-file workout.html from index.html + css/ + js/
(for sharing or opening one file without relative paths).

Run from repo root:  python scripts/merge_to_single_html.py

Output: ../workout.html (overwrites). Day-to-day dev uses index.html + split files only.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
OUT = ROOT / "workout.html"


def escape_script(s: str) -> str:
    return s.replace("</script>", "<\\/script>")


def main() -> None:
    html = INDEX.read_text(encoding="utf-8")
    css = (ROOT / "css" / "workout.css").read_text(encoding="utf-8")
    core = (ROOT / "js" / "workout-core.js").read_text(encoding="utf-8")
    lib = (ROOT / "js" / "workout-library.js").read_text(encoding="utf-8")
    strength = (ROOT / "js" / "workout-strength-data.js").read_text(encoding="utf-8")
    data = (ROOT / "js" / "workout-data.js").read_text(encoding="utf-8")
    app = (ROOT / "js" / "workout-app.js").read_text(encoding="utf-8")

    bundled = (
        f"/* --- workout-core.js --- */\n{escape_script(core)}\n"
        f"/* --- workout-library.js --- */\n{escape_script(lib)}\n"
        f"/* --- workout-strength-data.js --- */\n{escape_script(strength)}\n"
        f"/* --- workout-data.js --- */\n{escape_script(data)}\n"
    )

    html = re.sub(
        r'<link rel="stylesheet" href="css/workout\.css"/>',
        f"<style>\n{css}\n</style>",
        html,
        count=1,
    )
    block = (
        '<script src="js/workout-core.js"></script>\n'
        '<script src="js/workout-library.js"></script>\n'
        '<script src="js/workout-strength-data.js"></script>\n'
        '<script src="js/workout-data.js"></script>\n'
    )
    if block not in html:
        raise SystemExit("Expected script block not found in index.html")
    html = html.replace(block, f"<script>\n{bundled}</script>\n", 1)

    html = html.replace(
        '<script src="js/workout-app.js"></script>',
        f"<script>\n{escape_script(app)}\n</script>",
        1,
    )

    OUT.write_text(html, encoding="utf-8")
    print(f"Wrote {OUT} ({len(html):,} chars)")


if __name__ == "__main__":
    main()
