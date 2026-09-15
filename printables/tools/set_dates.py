#!/usr/bin/env python3
"""출결 특이사항표(02)의 날짜를 다시 찍는다.

출결표는 하루치 한 장이다. 날짜가 인쇄돼 있으므로 새 날짜로 쓰려면 다시 뽑아야 한다.
매일 손으로 고치지 말고 이것을 돌린 뒤 인쇄하면 된다.

    python3 printables/tools/set_dates.py              # 오늘
    python3 printables/tools/set_dates.py 2026-11-02   # 그 날짜로

바꾸는 곳은 <div class="today"> 한 군데뿐이고, 학생 이름과 기록 칸은 건드리지 않는다.
"""

from __future__ import annotations

import re
import sys
from datetime import date
from pathlib import Path

SHEET = Path(__file__).resolve().parent.parent / "02-attendance-a3.html"
DOW = ["월", "화", "수", "목", "금", "토", "일"]


def main() -> int:
    if len(sys.argv) > 1:
        try:
            day = date.fromisoformat(sys.argv[1])
        except ValueError:
            print("날짜는 2026-11-02 처럼 적어 주세요", file=sys.stderr)
            return 1
    else:
        day = date.today()

    block = ('<div class="today"><b>%d년 %d월 %d일</b><i>%s요일</i></div>'
             % (day.year, day.month, day.day, DOW[day.weekday()]))

    html = SHEET.read_text(encoding="utf-8")
    html, n = re.subn(r'<div class="today">.*?</div>\s*</div>',
                      lambda _: block + "</div>", html, count=1, flags=re.S)
    if not n:
        print("날짜 자리를 못 찾았습니다. 02 파일 구조가 바뀌었는지 확인하세요.",
              file=sys.stderr)
        return 1

    SHEET.write_text(html, encoding="utf-8")
    print("%d년 %d월 %d일 (%s) 로 맞췄습니다"
          % (day.year, day.month, day.day, DOW[day.weekday()]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
