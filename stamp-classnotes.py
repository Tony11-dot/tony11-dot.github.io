#!/usr/bin/env python3
"""Cache-busting for /classnotes/. Run after editing any asset:  python3 stamp-classnotes.py
One version string (a hash of every CSS, JS and image the pages use) is written into every
local asset URL (?v=...) in every page, so a deploy can never pair new HTML with an old
cached stylesheet. GitHub Pages serves assets with max-age=600."""
import hashlib, pathlib, re
root = pathlib.Path(__file__).resolve().parent / "classnotes"
exts = (".css", ".js", ".png", ".webp", ".svg", ".mp4", ".woff2")
assets = sorted(p for p in root.rglob("*") if p.is_file() and p.suffix in exts and "fonts" not in p.parts[-2:-1])
h = hashlib.sha1()
for p in assets:
    h.update(p.relative_to(root).as_posix().encode()); h.update(p.read_bytes())
v = h.hexdigest()[:10]
pat = re.compile(r'((?:href|src|data-img|poster)=")((?!https?:|mailto:|#|data:)[^"?#]+\.(?:css|js|png|webp|svg|mp4))(?:\?v=[0-9a-f]+)?(")')
for page in sorted(root.glob("*.html")):
    s = page.read_text()
    t = pat.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={v}{m.group(3)}", s)
    if t != s: page.write_text(t)
print("version", v)
