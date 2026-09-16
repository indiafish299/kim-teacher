#!/usr/bin/env python3
"""폰에서 볼 정적 사이트를 만든다 — Cloudflare Pages 에 그대로 올라간다.

    python3 printables/tools/build_web.py

-> printables/web/   (이 폴더는 커밋한다. Pages 가 빌드 없이 그대로 서빙한다)

       index.html        게시물 7장 목록
       01.html … 07.html 각 게시물
       assets/           print.css · fonts.css · 글꼴 · svg
       thumb/01.png …    목록용 작은 그림
       _headers          검색 색인 차단
       robots.txt        같은 목적

풀어야 하는 것이 둘 있다.

1. 종이가 화면보다 크다
   .sheet 는 420mm 같은 고정 mm 값이다. 폰(390px)에 그대로 두면 화면 밖으로 나간다.
   번들과 같은 방법을 쓴다 — mm 수치는 건드리지 않고 바깥 래퍼에 transform: scale 을
   걸어 화면 폭에 맞춘다. mm 를 줄이면 배치가 흐트러지고 인쇄 규격과 달라진다.

2. 학생 이름
   이 저장소는 공개이고 이 폴더는 웹에 그대로 올라간다. 출결표의 이름 칸을 여기서
   한 번 더 비우고, 만든 결과에 명단의 이름이 하나라도 남아 있으면 실패시킨다.
   (커밋되는 02 는 원래 빈칸이지만, apply_roster.py 로 채워 둔 상태에서 이 명령을
   돌릴 수 있다. 그때 조용히 웹에 올라가는 일이 없어야 한다.)
"""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

from PIL import Image

from _chrome import BARE, PAPERS, PX_PER_MM, launch
from apply_roster import ROSTER, cells, rewrite
from build_bundle import SHEETS, extract, split_at_page

HERE = Path(__file__).resolve().parent.parent
ASSETS = HERE / "assets"
OUT = HERE / "web"
THUMB_LONG = 600


# ────────────────────────────────────────────────────────── 낱장 페이지

SHELL = """<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<!-- 종이 폭(px)을 뷰포트 폭으로 선언한다. 그러면 폰이 알아서 화면 폭에 맞춰 줄이고,
     손가락으로 벌리면 커진다. JS 로 재서 scale 을 거는 방법도 되지만, 재는 시점과
     글꼴 도착 시점이 어긋나면 조용히 잘린 채로 나온다. 선언이 더 안전하다. -->
<!-- minimum-scale 을 낮춰 둔다. 기본값 0.25 면 레이아웃 폭이 화면의 4배로
     제한돼서, A2(1587px)가 390px 폰에서 1560px 로 잘린다. -->
<meta name="viewport" content="width=WPX, minimum-scale=0.1">
<title>TITLE</title>
<link rel="stylesheet" href="assets/fonts.css">
<link rel="stylesheet" href="assets/print.css">
<style>
SHEETCSS
</style>
<style>
/* ───── 폰 껍데기 ─────
   위 뷰포트 선언 때문에 이 페이지는 항상 WPX 폭으로 조판된 뒤 화면 크기로 줄어든다.
   그래서 껍데기 치수도 WPX 에 비례해 잡아야 종이와 같은 비율로 줄어든다.
   고정 px 로 잡으면 A2(1587px)에서는 깨알같이, A4(794px)에서는 큼직하게 나온다. */
@media screen {
  html, body { padding: 0; margin: 0; background: #4A3223; display: block;
               width: WPXpx; }
}
#top {
  display: flex; align-items: center; gap: GAPpx;
  padding: PADTOPpx PADpx; background: #4A3223; color: #FDF6E9;
  font-family: var(--font-body); font-size: SMALLpx;
}
#top a { color: #FDF6E9; text-decoration: none; opacity: .75; font-size: BIGpx;
         line-height: 1; }
#top b { font-family: var(--font-title); font-weight: 400; font-size: BIGpx; }
#top i { font-style: normal; opacity: .5; font-size: SMALLpx; margin-left: auto; }
/* 종이 폭이 곧 뷰포트 폭이다. 좌우 여백을 주면 딱 그만큼 가로로 넘친다. */
#wrap { padding: 0; }
.sheet { box-shadow: 0 3px 16px rgba(0,0,0,.4); }
#hint { color: #FDF6E9; opacity: .5; font-family: var(--font-body);
        font-size: SMALLpx; text-align: center; padding: PADpx 0 PADENDpx; }
</style>
</head>
<body>
<div id="top"><a href="index.html">&#8592;</a><b>LABEL</b><i>PAPER</i></div>
<div id="wrap"><div class="sheet">BODY</div></div>
<div id="hint">두 손가락으로 벌리면 커집니다</div>
</body>
</html>
"""


def sheet_page(fname: str, label: str, paper: str, wmm: int) -> str:
    """낱장 하나를 폰용 페이지로 만든다.

    한 문서에 한 장뿐이라 번들처럼 #sNN 으로 가둘 필요가 없다. 낱장 CSS 를 그대로 쓴다.
    """
    style, body, _ = extract(HERE / fname)
    style, _size = split_at_page(style)   # 웹에서는 용지 지정이 의미가 없다
    wpx = round(wmm * PX_PER_MM)
    # 껍데기 치수는 전부 종이 폭에 대한 비율이다. 화면에서 줄어든 뒤의 크기가
    # 어느 용지에서나 같아지도록.
    subs = [("WPX", "%d" % wpx),
            ("BIG", "%.1f" % (wpx / 26)),
            ("SMALL", "%.1f" % (wpx / 34)),
            ("GAP", "%.1f" % (wpx / 55)),
            ("PADTOP", "%.1f" % (wpx / 48)),
            ("PADEND", "%.1f" % (wpx / 20)),
            ("PAD", "%.1f" % (wpx / 42))]
    out = (SHELL.replace("TITLE", "%s · 1학년 3반" % label)
                .replace("SHEETCSS", style)
                .replace("LABEL", label)
                .replace("PAPER", paper)
                .replace("BODY", body))
    for k, v in subs:
        out = out.replace(k, v)
    return out


# ────────────────────────────────────────────────────────── 목록

INDEX = """<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>1학년 3반 학급 칠판 게시물</title>
<link rel="stylesheet" href="assets/fonts.css">
<style>
:root { --cream:#FDF6E9; --ink:#4A3223; --maple:#B33A2B; --line:#DCD0BC; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--ink); color: var(--cream);
       font-family: var(--font-body); word-break: keep-all; }
header { padding: 22px 18px 16px; }
header h1 { margin: 0; font-family: var(--font-title); font-weight: 400;
            font-size: 22px; line-height: 1.3; }
header p { margin: 7px 0 0; font-family: var(--font-hand); color: #E2762F;
           font-size: 14px; line-height: 1.45; }
ul { list-style: none; margin: 0; padding: 0 12px 28px; display: grid;
     grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (min-width: 620px) { ul { grid-template-columns: repeat(3, 1fr); } }
a.card { display: block; text-decoration: none; color: var(--ink);
         background: var(--cream); border-radius: 10px; overflow: hidden; }
a.card img { display: block; width: 100%; height: auto; background: #fff;
             border-bottom: 1px solid var(--line); }
a.card .t { display: block; font-family: var(--font-title); font-size: 14px;
            padding: 9px 10px 2px; line-height: 1.3; }
a.card .p { display: block; font-size: 11px; opacity: .55; padding: 0 10px 10px; }
footer { padding: 0 18px 30px; font-size: 12px; opacity: .45; line-height: 1.6; }
</style>
</head>
<body>
<header>
  <h1>1학년 3반 학급 칠판 게시물</h1>
  <p>눌러서 크게 보세요. 고칠 거 있으면 학급회의 때 말해 주세요</p>
</header>
<ul>
CARDS
</ul>
<footer>소프트웨어개발과 · 담임 김종석</footer>
</body>
</html>
"""


# ────────────────────────────────────────────────────────── 만들기

def build() -> int:
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "thumb").mkdir(parents=True)
    shutil.copytree(ASSETS, OUT / "assets")

    cards = []
    for i, ((fname, sid, wmm, hmm), (_f, label, paper)) in enumerate(
            zip(PAPERS, SHEETS), 1):
        page = OUT / ("%02d.html" % i)
        html = sheet_page(fname, label, paper, wmm)
        # 이름이 채워진 상태에서 돌렸더라도 웹에는 안 나가게 한다
        html = rewrite(html, [""] * len(cells(html))) if cells(html) else html
        page.write_text(html, encoding="utf-8")

        # 썸네일 — 낱장 파일을 그대로 찍는다. 화면용 장식은 걷어낸다.
        tmp = HERE / ("_web-" + fname)
        tmp.write_text((HERE / fname).read_text(encoding="utf-8")
                       .replace("</body>", BARE), encoding="utf-8")
        shot = OUT / "thumb" / ("%02d.png" % i)
        try:
            launch(["--virtual-time-budget=9000", "--force-device-scale-factor=1",
                    "--window-size=%d,%d" % (round(wmm * PX_PER_MM),
                                             round(hmm * PX_PER_MM)),
                    "--screenshot=%s" % shot, tmp.as_uri()])
        finally:
            tmp.unlink(missing_ok=True)
        if not shot.exists():
            raise RuntimeError("%s: 썸네일이 안 만들어졌다" % fname)
        im = Image.open(shot).convert("RGB")
        k = THUMB_LONG / max(im.size)
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        im.save(shot, optimize=True)

        cards.append('  <li><a class="card" href="%02d.html">'
                     '<img src="thumb/%02d.png" alt="" loading="lazy">'
                     '<span class="t">%s</span><span class="p">%s</span>'
                     '</a></li>' % (i, i, label, paper))
        print("  %02d.html  %-16s %4dx%-4d" % (i, label, im.width, im.height))

    (OUT / "index.html").write_text(INDEX.replace("CARDS", "\n".join(cards)),
                                    encoding="utf-8")
    # 이름을 뺐어도 학급 정보가 검색에 잡힐 이유가 없다
    (OUT / "_headers").write_text("/*\n  X-Robots-Tag: noindex, nofollow\n",
                                  encoding="utf-8")
    (OUT / "robots.txt").write_text("User-agent: *\nDisallow: /\n",
                                    encoding="utf-8")
    return 0


def check_names() -> bool:
    """만든 결과에 명단의 이름이 남아 있으면 True."""
    if not ROSTER.exists():
        print("  (명단 파일이 없어 이름 검사는 건너뜁니다)")
        return False
    names = json.loads(ROSTER.read_text(encoding="utf-8"))["이름"]
    found = False
    for p in OUT.rglob("*"):
        if not p.is_file() or p.suffix.lower() in (".png", ".woff2"):
            continue
        text = p.read_text(encoding="utf-8", errors="ignore")
        hit = [n for n in names if n in text]
        if hit:
            print("  %s 에 이름이 있습니다: %s" % (p.relative_to(OUT), ", ".join(hit)))
            found = True
    if not found:
        print("  이름 %d개 모두 없음" % len(names))
    return found


def main() -> int:
    print("페이지")
    build()
    print("\n이름 검사")
    if check_names():
        print("\n이름이 웹 폴더에 남아 있습니다. 올리면 안 됩니다.")
        return 1
    n = sum(1 for p in OUT.rglob("*") if p.is_file())
    size = sum(p.stat().st_size for p in OUT.rglob("*") if p.is_file())
    print("\n%s  파일 %d개  %.1f MB" % (OUT, n, size / 1024 / 1024))
    return 0


if __name__ == "__main__":
    sys.exit(main())
