#!/usr/bin/env python3
"""출결표(02)의 이름 칸을 명단으로 채우거나 다시 비운다.

이 저장소는 공개(public)다. 학생 실명이 커밋되면 GitHub 에서 누구나 볼 수 있고,
web/ 을 통해 웹에 올라가면 검색에도 걸린다. 그래서 커밋되는 02 는 언제나
'번호만 있고 이름은 빈칸' 상태로 둔다.

    python3 printables/tools/apply_roster.py           # 이름 채우기 (인쇄 전)
    python3 printables/tools/apply_roster.py --clear   # 다시 비우기 (커밋 전)

명단은 printables/roster.local.json 에 있고 .gitignore 에 들어 있다.
그 파일이 없으면 아무것도 하지 않고 안내만 한다 — 남의 컴퓨터에서 받아 온
저장소에서 이 명령이 조용히 빈칸을 만들어 버리면 곤란하기 때문이다.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
SHEET = HERE / "02-attendance-a3.html"
ROSTER = HERE / "roster.local.json"

# <th class="nm">홍길동</th> 또는 <th class="nm"></th>
CELL = re.compile(r'(<th class="nm">)(.*?)(</th>)')


def cells(html: str) -> list[re.Match]:
    """머리글 행의 '이름' 칸은 건너뛰고 학생 줄만 고른다."""
    return [m for m in CELL.finditer(html) if m.group(2) != "이름"]


def rewrite(html: str, values: list[str]) -> str:
    """학생 줄의 이름 칸을 values 로 갈아 끼운다. 뒤에서부터 바꿔 위치를 지킨다."""
    ms = cells(html)
    if len(ms) != len(values):
        raise RuntimeError("이름 칸이 %d개인데 넣을 값은 %d개다"
                           % (len(ms), len(values)))
    for m, v in zip(reversed(ms), reversed(values)):
        html = html[:m.start()] + m.group(1) + v + m.group(3) + html[m.end():]
    return html


def main() -> int:
    clear = "--clear" in sys.argv[1:]
    html = SHEET.read_text(encoding="utf-8")
    n = len(cells(html))

    if clear:
        out = rewrite(html, [""] * n)
        SHEET.write_text(out, encoding="utf-8")
        print("이름 %d칸을 비웠습니다. 이제 커밋해도 됩니다." % n)
        return 0

    if not ROSTER.exists():
        print("명단 파일이 없습니다: %s\n"
              "선생님 컴퓨터에만 두는 파일이라 저장소에는 없습니다.\n"
              "이름 없이 인쇄하셔도 되고, 명단을 넣으시려면 그 파일을 먼저 만드세요."
              % ROSTER, file=sys.stderr)
        return 1

    names = json.loads(ROSTER.read_text(encoding="utf-8"))["이름"]
    SHEET.write_text(rewrite(html, names), encoding="utf-8")
    print("이름 %d명을 채웠습니다. 인쇄가 끝나면 --clear 로 비우고 커밋하세요."
          % len(names))
    return 0


if __name__ == "__main__":
    sys.exit(main())
