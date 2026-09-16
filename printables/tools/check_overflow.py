#!/usr/bin/env python3
"""인쇄물이 종이 밖으로 넘치는지 숫자로 잰다.

.sheet 에는 overflow:hidden 이 걸려 있다. 내용이 넘쳐도 두 장으로 찢어지지 않고
조용히 잘려 나가므로, "PDF 가 1페이지인가" 만으로는 넘침을 절대 못 잡는다.
눈으로 보는 것도 못 믿는다 — 미리보기 창이 종이보다 짧으면 멀쩡한 것도 잘려 보인다.

그래서 브라우저에게 직접 물어본다: .sheet 의 scrollHeight 가 clientHeight 보다 큰가?

    python3 printables/tools/check_overflow.py

넘치는 곳이 있으면 종료 코드 1.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from _chrome import PX_PER_MM, launch

HERE = Path(__file__).resolve().parent.parent

PROBE = """
<script>
document.fonts.ready.then(() => requestAnimationFrame(() => {
  const s = document.querySelector('.sheet');
  document.title = 'PROBE ' + (s.scrollHeight - s.clientHeight)
                 + ' ' + (s.scrollWidth - s.clientWidth);
}));
</script>
</body>
"""


def probe(html: Path) -> tuple[float, float]:
    """검사용 사본을 같은 폴더에 잠깐 두고 잰다.

    사본을 다른 곳에 두면 assets/ 상대 경로가 깨져 글꼴이 안 실리고, 글꼴이 바뀌면
    글자 폭이 달라져서 측정값 자체가 무의미해진다. 그래서 같은 폴더에 둔다.
    """
    tmp = html.with_name("_probe-" + html.name)
    tmp.write_text(html.read_text(encoding="utf-8").replace("</body>", PROBE),
                   encoding="utf-8")
    try:
        out = launch(
            # 가장 큰 종이(A2, 1587x2245px)보다 넉넉한 창. 기본 800x600 으로 재면
            # 화면용 가운데 정렬·여백이 끼어들어 측정값이 흔들린다.
            ["--window-size=1700,2400",
             "--virtual-time-budget=8000", "--dump-dom", tmp.as_uri()],
            timeout=120)
        m = re.search(r"PROBE (-?\d+) (-?\d+)", out)
        if not m:
            raise RuntimeError(f"{html.name}: 측정값을 못 읽었다")
        return int(m.group(1)) / PX_PER_MM, int(m.group(2)) / PX_PER_MM
    finally:
        tmp.unlink(missing_ok=True)


def main() -> int:
    bad = False
    print(f"{'파일':<26}{'세로 넘침':>12}{'가로 넘침':>12}   결과")
    for html in sorted(HERE.glob("[0-9]*.html")):
        oh, ow = probe(html)
        # 0.5mm 까지는 반올림 오차로 본다
        ok = oh <= 0.5 and ow <= 0.5
        bad |= not ok
        print(f"{html.name:<26}{oh:>10.1f}mm{ow:>10.1f}mm   "
              f"{'OK' if ok else '!! 잘림'}")
    print("\n전부 종이 안에 들어옴" if not bad else "\n넘치는 인쇄물이 있음")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
