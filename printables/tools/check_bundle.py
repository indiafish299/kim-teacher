#!/usr/bin/env python3
"""번들이 낱장 파일과 똑같이 나오는지 대조한다.

번들은 7장의 CSS 를 한 문서에 몰아넣고 선택자마다 #sNN 을 붙여 가둔 것이다.
가두기가 한 군데라도 어긋나면 어떤 장의 글자 크기나 칸 너비가 조용히 달라진다.
눈으로는 잘 안 보이고, PDF 쪽수만 봐서는 절대 안 걸린다. 그래서 두 가지를 잰다.

  1. 용지 규격 — 번들의 각 장을 PDF 로 뽑아 낱장 PDF 와 MediaBox 를 비교
  2. 그림 자체 — 같은 장을 같은 배율로 PNG 로 찍어 픽셀 평균차를 계산

    python3 printables/tools/check_bundle.py

어긋나는 곳이 있으면 종료 코드 1.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent.parent
CHROME = "/opt/pw-browsers/chromium"
TMP = Path("/tmp/claude-0/-home-user-kim-teacher/"
           "d6e42e9e-2e50-53c0-9062-cd73a35af685/scratchpad/bundlecheck")
PX = 96 / 25.4

# (낱장 파일, 번들 안의 id, 가로mm, 세로mm)
SHEETS = [
    ("01-timetable-a2.html", "s01", 420, 594),
    ("02-attendance-a3.html", "s02", 297, 420),
    ("03-notice-a3.html", "s03", 297, 420),
    ("04-class-rules-a3.html", "s04", 297, 420),
    ("05-birthday-a3.html", "s05", 297, 420),
    ("06-seating-a4.html", "s06", 297, 210),
    ("07-duty-a4.html", "s07", 210, 297),
]

# 낱장 파일의 화면용 장식(회색 바탕·가운데 정렬·그림자)을 걷어낸다.
# 번들 쪽과 같은 조건으로 맞춰야 픽셀 비교가 의미를 갖는다.
BARE = """<style>
@media screen { html,body { padding:0!important; margin:0!important;
  background:#fff!important; display:block!important; }
  .sheet { box-shadow:none!important; } }
</style></body>"""

# 번들에서 셸을 감추고 배율을 1 로 돌려 해당 장만 남긴다
def bundle_probe(sid: str, size_css: str) -> str:
    return """<script>
addEventListener('load', function () { setTimeout(function () {
  document.querySelector('.nav[data-go="%s"]').click();
  document.getElementById('side').style.display = 'none';
  document.getElementById('bar').style.display = 'none';
  var v = document.getElementById('view');
  v.style.padding = '0'; v.style.overflow = 'visible';
  document.documentElement.style.margin = '0';
  document.body.style.margin = '0';
  // 번들 body 의 크림색 바탕이 종이 가장자리 반 픽셀 틈으로 비쳐 낱장(흰 바탕)과
  // 차이를 만든다. 배경까지 맞춰야 픽셀 비교가 진짜 배치 차이만 잡는다.
  document.documentElement.style.background = '#fff';
  document.body.style.background = '#fff';
  var st = document.querySelector('#%s .stage');
  st.style.transform = 'none'; st.style.width = 'auto'; st.style.height = 'auto';
  document.querySelector('#%s .sheet').style.boxShadow = 'none';
  var s = document.createElement('style');
  s.textContent = '@page { size: %s; margin: 0 }';
  document.head.appendChild(s);
}, 250); });
</script></body>""" % (sid, sid, sid, size_css)


def run(args: list[str]) -> None:
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-sandbox",
                    "--hide-scrollbars", "--disable-background-networking",
                    "--no-first-run"] + args,
                   capture_output=True, timeout=180)


def pdf_size(path: Path) -> tuple[int, float, float]:
    d = path.read_bytes()
    pages = len(re.findall(rb"/Type\s*/Page[^s]", d))
    box = list(set(re.findall(rb"/MediaBox\s*\[([^\]]+)\]", d)))[0]
    v = [float(x) for x in box.split()]
    return pages, (v[2] - v[0]) / 72 * 25.4, (v[3] - v[1]) / 72 * 25.4


def main() -> int:
    TMP.mkdir(parents=True, exist_ok=True)
    bundle = HERE / "학급칠판게시물.html"
    if not bundle.exists():
        print("번들이 없습니다. build_bundle.py 를 먼저 돌리세요.", file=sys.stderr)
        return 1
    bhtml = bundle.read_text(encoding="utf-8")

    bad = False
    print("%-22s %-22s %-22s %s" % ("장", "낱장 PDF", "번들 PDF", "픽셀 평균차"))
    for fname, sid, wmm, hmm in SHEETS:
        size_css = "%dmm %dmm" % (wmm, hmm)
        wpx, hpx = round(wmm * PX), round(hmm * PX)

        # --- 낱장: 화면 장식 걷어낸 사본
        solo = HERE / ("_chk-" + fname)
        solo.write_text((HERE / fname).read_text(encoding="utf-8")
                        .replace("</body>", BARE), encoding="utf-8")
        # --- 번들: 해당 장만 남긴 사본
        bund = HERE / ("_chk-bundle-%s.html" % sid)
        bund.write_text(bhtml.replace("</body>", bundle_probe(sid, size_css)),
                        encoding="utf-8")
        try:
            run(["--virtual-time-budget=9000", "--no-pdf-header-footer",
                 "--print-to-pdf=%s" % (TMP / ("solo-%s.pdf" % sid)), solo.as_uri()])
            run(["--virtual-time-budget=9000", "--no-pdf-header-footer",
                 "--print-to-pdf=%s" % (TMP / ("bund-%s.pdf" % sid)), bund.as_uri()])
            run(["--virtual-time-budget=9000", "--force-device-scale-factor=1",
                 "--window-size=%d,%d" % (wpx, hpx),
                 "--screenshot=%s" % (TMP / ("solo-%s.png" % sid)), solo.as_uri()])
            run(["--virtual-time-budget=9000", "--force-device-scale-factor=1",
                 "--window-size=%d,%d" % (wpx, hpx),
                 "--screenshot=%s" % (TMP / ("bund-%s.png" % sid)), bund.as_uri()])
        finally:
            solo.unlink(missing_ok=True)
            bund.unlink(missing_ok=True)

        sp, sw, sh = pdf_size(TMP / ("solo-%s.pdf" % sid))
        bp, bw, bh = pdf_size(TMP / ("bund-%s.pdf" % sid))

        a = np.asarray(Image.open(TMP / ("solo-%s.png" % sid)).convert("RGB"), float)
        b = np.asarray(Image.open(TMP / ("bund-%s.png" % sid)).convert("RGB"), float)
        if a.shape != b.shape:
            diff = float("inf")
        else:
            diff = float(np.abs(a - b).mean())

        size_ok = (sp == bp == 1 and abs(sw - bw) < 0.5 and abs(sh - bh) < 0.5
                   and abs(sw - wmm) < 1 and abs(sh - hmm) < 1)
        # 글꼴 앤티앨리어싱 때문에 완전한 0 은 나오지 않는다. 1.0 을 넘으면 배치가 다른 것.
        pix_ok = diff < 1.0
        bad |= not (size_ok and pix_ok)
        print("%-22s %-22s %-22s %8.3f  %s"
              % (fname.split("-")[0] + " " + sid,
                 "%d쪽 %.1fx%.1f" % (sp, sw, sh),
                 "%d쪽 %.1fx%.1f" % (bp, bw, bh),
                 diff, "OK" if (size_ok and pix_ok) else "!! 다름"))

    print("\n번들이 낱장과 일치합니다" if not bad else "\n어긋나는 장이 있습니다")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
