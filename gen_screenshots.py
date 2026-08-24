# -*- coding: utf-8 -*-
"""用系统 Chrome 无头模式，为全部 HTML 页面生成指定分辨率截图。"""
import os, subprocess, sys

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
HTML_ROOT = r"D:\dev\pro_orangemodel\html"
OUT_ROOT = r"D:\dev\pro_orangemodel\docs\screenshots"
os.makedirs(OUT_ROOT, exist_ok=True)

# (relpath, width, height)
pages = []
for base, w, h in [("backhand", 1920, 1080), ("dataanlye", 1920, 1080), ("mobile", 430, 932)]:
    d = os.path.join(HTML_ROOT, base)
    for root, _, files in os.walk(d):
        for f in files:
            if f.endswith(".html"):
                full = os.path.join(root, f)
                rel = os.path.relpath(full, HTML_ROOT).replace("/", "\\")
                pages.append((rel, w, h))

print(f"TOTAL PAGES: {len(pages)}", flush=True)

done = 0
fail = []
for rel, w, h in pages:
    url = "file:///D:/dev/pro_orangemodel/html/" + rel.replace("\\", "/")
    out_name = rel.replace("\\", "__").rsplit(".", 1)[0] + ".png"
    out_path = os.path.join(OUT_ROOT, out_name)
    cmd = [
        CHROME, "--headless=new", "--no-sandbox", "--disable-gpu",
        "--hide-scrollbars", "--force-device-scale-factor=1",
        "--no-first-run", "--no-default-browser-check",
        f"--user-data-dir={OUT_ROOT}\\_chrome_profile",
        f"--window-size={w},{h}", f"--virtual-time-budget=20000",
        f"--screenshot={out_path}", url,
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=90)
    except Exception as e:
        fail.append((rel, str(e)))
    if os.path.exists(out_path) and os.path.getsize(out_path) > 2000:
        done += 1
    else:
        fail.append((rel, "empty/missing"))
    if done % 10 == 0:
        print(f"  progress: {done}/{len(pages)}", flush=True)

print(f"DONE: {done}/{len(pages)}", flush=True)
if fail:
    print("FAILURES:", flush=True)
    for rel, msg in fail:
        print("  ", rel, msg, flush=True)
