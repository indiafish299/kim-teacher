#!/usr/bin/env python3
"""학급 단톡에 올릴 파일을 만든다 — 사진 7장 + PDF 1개 + 문안.

인쇄물은 전부 데스크톱·인쇄용이라 그대로는 학생 폰에 못 보낸다.
번들 HTML 은 왼쪽 목록이 210px 고정이라 폰에서 종이 자리가 안 나오고,
낱장 7종은 assets/ 를 상대 경로로 참조해 파일 하나만 떼어 보낼 수 없다.

    python3 printables/tools/build_share.py

-> printables/share/   (git 에 안 올라간다. 언제든 다시 만들면 된다)

   1-시간표.png … 7-당번표.png   단톡에 올리면 눌러 보지 않아도 바로 펼쳐진다
   1학년3반-게시물.pdf            7쪽. 벡터라 확대해도 안 깨진다
   카톡문안.txt                   보낼 말과 투표 문항

사진과 PDF 를 같이 주는 이유: 사진은 안 눌러도 보이지만 확대가 불편하고,
PDF 는 확대가 편하지만 한 번 눌러야 열린다. 둘 다 있으면 서로를 메운다.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from PIL import Image

from _chrome import BARE, PAPERS, PX_PER_MM, launch
from build_bundle import (extract, inline_fonts, inline_svgs, scope,
                          split_at_page)

HERE = Path(__file__).resolve().parent.parent
ASSETS = HERE / "assets"
OUT = HERE / "share"

# 파일 이름 앞의 번호는 맥에서 파일을 고를 때 단톡에 올라가는 순서를 맞추기 위한 것이다
NAMES = ["1-시간표", "2-출결", "3-알림장", "4-약속",
         "5-생일달력", "6-자리배치", "7-당번표"]

# 사진의 긴 변. 카톡이 올릴 때 다시 압축하므로 원본이 넉넉히 선명해야 과목명이 살아남는다
LONG_EDGE = 2000


# ────────────────────────────────────────────────────────── 사진 7장

def build_pngs() -> list[Path]:
    made = []
    for (fname, _sid, wmm, hmm), name in zip(PAPERS, NAMES):
        src = HERE / fname
        tmp = HERE / ("_share-" + fname)
        # 화면용 장식(어두운 바탕·가운데 정렬·그림자)을 걷어내 종이만 남긴다.
        # 사본을 같은 폴더에 둬야 assets/ 상대 경로가 안 깨진다.
        tmp.write_text(src.read_text(encoding="utf-8").replace("</body>", BARE),
                       encoding="utf-8")
        png = OUT / (name + ".png")
        try:
            launch(["--virtual-time-budget=9000",
                    # 종이 픽셀의 2배로 찍고 아래에서 줄인다. 처음부터 목표 크기로
                    # 찍는 것보다 글자 가장자리가 깨끗하다.
                    "--force-device-scale-factor=2",
                    "--window-size=%d,%d" % (round(wmm * PX_PER_MM),
                                             round(hmm * PX_PER_MM)),
                    "--screenshot=%s" % png, tmp.as_uri()])
        finally:
            tmp.unlink(missing_ok=True)

        if not png.exists():
            raise RuntimeError("%s: 사진이 안 만들어졌다" % name)
        im = Image.open(png).convert("RGB")
        k = LONG_EDGE / max(im.size)
        im = im.resize((round(im.width * k), round(im.height * k)),
                       Image.LANCZOS)
        im.save(png, optimize=True)
        made.append(png)
        print("  %-14s %4dx%-4d  %5.0f KB" % (png.name, im.width, im.height,
                                              png.stat().st_size / 1024))
    return made


# ────────────────────────────────────────────────────────── PDF 7쪽

PDF_SHELL = """<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<title>1학년 3반 학급 칠판 게시물</title>
<style>
/*FONTS*/
/*PRINTCSS*/
body { margin: 0; background: #fff; }
/* 장마다 용지가 다르다. @page 에는 선택자를 못 붙이지만 이름은 붙일 수 있고,
   그 이름을 page: 로 가리키면 장별로 규격이 산다. 크롬이 이걸 지원하는지는
   확인했다 — 쪽마다 MediaBox 가 따로 나온다. */
/*PAGES*/
.pg { break-before: page; }
.pg:first-of-type { break-before: auto; }  /* 맨 앞에 빈 쪽이 끼는 것을 막는다 */
.pg .sheet { box-shadow: none; }
/*SHEETCSS*/
</style></head><body>
<!--SHEETS-->
</body></html>
"""


def build_pdf() -> Path:
    fonts = inline_fonts((ASSETS / "fonts.css").read_text(encoding="utf-8"))
    print_css = (ASSETS / "print.css").read_text(encoding="utf-8")

    pages, css, body = [], [], []
    for i, (fname, sid, wmm, hmm) in enumerate(PAPERS, 1):
        pg = "p%02d" % i
        style, sheet, _ = extract(HERE / fname)
        style, _size = split_at_page(style)
        pages.append("@page %s { size: %dmm %dmm; margin: 0 }" % (pg, wmm, hmm))
        # 낱장끼리 .head h1 같은 이름을 다른 값으로 써서 그냥 합치면 마지막 것이
        # 앞의 것을 덮는다. 번들과 같은 방식으로 #sNN 안에 가둔다.
        css.append("/* ===== %s ===== */\n%s" % (sid, scope(style, sid)))
        css.append("#%s { page: %s }" % (sid, pg))
        body.append('<section class="pg" id="%s"><div class="sheet">%s</div></section>'
                    % (sid, inline_svgs(sheet)))

    html = (PDF_SHELL.replace("/*FONTS*/", fonts)
                     .replace("/*PRINTCSS*/", print_css)
                     .replace("/*PAGES*/", "\n".join(pages))
                     .replace("/*SHEETCSS*/", "\n".join(css))
                     .replace("<!--SHEETS-->", "\n".join(body)))

    tmp = HERE / "_share-all.html"
    tmp.write_text(html, encoding="utf-8")
    pdf = OUT / "1학년3반-게시물.pdf"
    try:
        launch(["--virtual-time-budget=12000", "--no-pdf-header-footer",
                "--print-to-pdf=%s" % pdf, tmp.as_uri()])
    finally:
        tmp.unlink(missing_ok=True)
    return pdf


def pdf_pages(path: Path) -> list[tuple[float, float]]:
    """쪽마다 (가로mm, 세로mm). MediaBox 를 나온 순서대로 읽는다."""
    d = path.read_bytes()
    out = []
    for b in re.findall(rb"/MediaBox\s*\[([^\]]+)\]", d):
        v = [float(x) for x in b.split()]
        out.append(((v[2] - v[0]) / 72 * 25.4, (v[3] - v[1]) / 72 * 25.4))
    return out


# ────────────────────────────────────────────────────────── 문안

MESSAGE = """\
[학급 단톡에 보낼 말]

얘들아, 우리 교실 칠판에 붙일 거 몇 개 만들어 봤다.
사진 먼저 쭉 넘겨 봐. 글씨 작으면 눌러서 확대해서 보고,
PDF 도 같이 올려놨으니까 자세히 볼 사람은 그거 열면 된다.

시간표, 출결표, 알림장, 우리 반 약속, 생일 달력, 자리 배치표, 1인 1역
이렇게 일곱 갠데 다 붙이면 칠판 옆이 꽉 차. 그래서 골라야 된다.

투표 두 개 올려놨으니까 눌러 줘. 1분이면 된다.

약속 문구랑 1인 1역 역할은 아직 선생님이 대충 적어 둔 거다.
▶ 학급회의: (여기에 시간 적기)
그때 같이 정하자. 고치고 싶은 거 있으면 그때 말해.


[투표 1] ─────────────────────────────
제목: 칠판에 뭐 붙일까? (여러 개 골라도 됨)
※ 카톡 투표 만들 때 '복수 선택' 켜기

주간 시간표 - 우리 반 시간표 한 장
출결 특이사항 - 결석·지각 표시하는 거
오늘의 알림장 - 준비물이랑 급식
우리 반 약속 - 다 같이 정하고 서명하는 거
생일 축하 달력 - 달마다 생일인 사람
자리 배치표 - 누가 어디 앉는지
1인 1역·당번표 - 역할이랑 당번


[투표 2] ─────────────────────────────
제목: 자리 어떻게 정할까?
※ 하나만 고르기

제비뽑기
키 순서
원하는 대로 앉기
선생님이 정해 주기


[보내는 순서] ───────────────────────
1. 사진 7장 (1번부터 순서대로)
2. PDF 1개
3. 위의 말
4. 투표 두 개
"""


def main() -> int:
    OUT.mkdir(exist_ok=True)
    print("사진")
    pngs = build_pngs()

    print("\nPDF")
    pdf = build_pdf()
    sizes = pdf_pages(pdf)
    print("  %-14s %d쪽  %5.0f KB" % (pdf.name, len(sizes),
                                      pdf.stat().st_size / 1024))

    bad = len(sizes) != len(PAPERS)
    for (fname, _sid, wmm, hmm), (gw, gh) in zip(PAPERS, sizes):
        ok = abs(gw - wmm) < 1 and abs(gh - hmm) < 1
        bad |= not ok
        print("    %-24s %6.1f x %-6.1f %s"
              % (fname, gw, gh, "" if ok else "!! 규격이 다르다"))

    txt = OUT / "카톡문안.txt"
    txt.write_text(MESSAGE, encoding="utf-8")
    print("\n문안\n  %s" % txt.name)

    # 크롬이 빈 창을 찍으면 순백 사진이 나온다. 파일이 생겼다는 것만으로는 못 잡는다.
    for p in pngs:
        im = Image.open(p).convert("L")
        lo, hi = im.getextrema()
        if hi - lo < 40:
            print("\n%s 가 거의 백지다 — 렌더가 안 된 것이다" % p.name)
            bad = True

    if bad:
        print("\n문제가 있다. 위를 확인할 것.")
        return 1
    print("\n%s 에 다 만들었다" % OUT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
