"""
Split workout.html (output of merge_to_single_html.py) into css/, js/, and index.html.

Re-run any time after merging. Markers /* --- workout-*.js --- */ must remain in the head bundle.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "workout.html"

MARKERS = [
    ("workout-core.js", "/* --- workout-core.js --- */"),
    ("workout-library.js", "/* --- workout-library.js --- */"),
    ("workout-strength-data.js", "/* --- workout-strength-data.js --- */"),
    ("workout-data.js", "/* --- workout-data.js --- */"),
]


def main() -> None:
    if not SRC.is_file():
        raise SystemExit(f"Missing {SRC}")
    text = SRC.read_text(encoding="utf-8")

    m_style = re.search(r"<style>\s*(.*?)\s*</style>", text, re.DOTALL)
    if not m_style:
        raise SystemExit("No <style> block found")
    (ROOT / "css").mkdir(parents=True, exist_ok=True)
    (ROOT / "js").mkdir(parents=True, exist_ok=True)
    (ROOT / "css" / "workout.css").write_text(m_style.group(1).strip() + "\n", encoding="utf-8")

    m_bundle = re.search(r"</style>\s*<script>\s*(.*?)\s*</script>\s*</head>", text, re.DOTALL)
    if not m_bundle:
        raise SystemExit("No head bundle </style>…<script>…</script></head>")
    bundle = m_bundle.group(1)

    for i, (fname, marker) in enumerate(MARKERS):
        start = bundle.find(marker)
        if start == -1:
            raise SystemExit(f"Marker not found: {marker}")
        body_start = start + len(marker)
        if i + 1 < len(MARKERS):
            next_m = MARKERS[i + 1][1]
            end = bundle.find(next_m, body_start)
            if end == -1:
                raise SystemExit(f"Next marker not found after {marker}")
        else:
            end = len(bundle)
        chunk = bundle[body_start:end].strip("\n")
        (ROOT / "js" / fname).write_text(chunk + "\n", encoding="utf-8")

    m_body_block = re.search(
        r"<body>\s*(.*)\s*<script>\s*(.*?)\s*</script>\s*</body>",
        text,
        re.DOTALL,
    )
    if not m_body_block:
        raise SystemExit("Could not parse body + trailing app script")
    body_inner = m_body_block.group(1).rstrip()
    app = m_body_block.group(2).strip()
    (ROOT / "js" / "workout-app.js").write_text(app + "\n", encoding="utf-8")

    m_head = re.search(
        r"(<!DOCTYPE html>.*?<script src=\"https://cdnjs\.cloudflare\.com/ajax/libs/Chart\.js/4\.4\.1/chart\.umd\.min\.js\"></script>)",
        text,
        re.DOTALL,
    )
    if not m_head:
        raise SystemExit("Could not find head through Chart.js")

    index_html = (
        m_head.group(1).strip()
        + "\n\n<link href=\"https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap\" rel=\"stylesheet\"/>\n"
        + "<title>Workout</title>\n"
        + '<link rel="stylesheet" href="css/workout.css"/>\n'
        + '<script src="js/workout-core.js"></script>\n'
        + '<script src="js/workout-library.js"></script>\n'
        + '<script src="js/workout-strength-data.js"></script>\n'
        + '<script src="js/workout-data.js"></script>\n'
        + "</head>\n<body>\n"
        + body_inner
        + "\n<script src=\"js/workout-app.js\"></script>\n</body>\n</html>\n"
    )
    (ROOT / "index.html").write_text(index_html, encoding="utf-8")

    print("Split into css/workout.css, js/*.js, index.html")


if __name__ == "__main__":
    main()
