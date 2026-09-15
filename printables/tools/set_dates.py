#!/usr/bin/env python3
"""출결 특이사항표(02)의 날짜 머리줄을 다시 찍는다.

날짜를 인쇄해 두면 4주가 지나면 못 쓴다. 코팅까지 한 판을 그 이유로 버리긴 아까우니,
날짜 줄만 갈아 끼울 수 있게 해 둔다. 새 4주치를 뽑을 때는 이것만 다시 돌리면 된다.

    python3 printables/tools/set_dates.py              # 이번 주 월요일부터 4주
    python3 printables/tools/set_dates.py 2026-11-02   # 그 날이 속한 주부터 4주

바꾸는 곳은 <tr class="wkrow"> 와 <tr class="dates"> 두 줄뿐이고,
학생 이름과 기록 칸은 건드리지 않는다.
"""

from __future__ import annotations

import re
import sys
from datetime import date, timedelta
from pathlib import Path

SHEET = Path(__file__).resolve().parent.parent / "02-attendance-a3.html"
WEEKS = 4
DAYS = 5                      # 월~금
DOW = ["월", "화", "수", "목", "금"]


def build(monday: date) -> tuple[str, str]:
    """주차 머리줄과 날짜 머리줄의 HTML 을 만든다."""
    wk_cells, date_cells = [], []
    for w in range(WEEKS):
        days = [monday + timedelta(days=w * 7 + d) for d in range(DAYS)]
        first, last = days[0], days[-1]
        wk_cells.append(
            '<th colspan="%d">%d주 &middot; %d/%d~%d/%d</th>'
            % (DAYS, w + 1, first.month, first.day, last.month, last.day))
        for d, day in enumerate(days):
            cls = []
            if d == 0:
                cls.append("mon")
            if d == DAYS - 1:
                cls.append("wk")          # 한 주가 끝나는 칸은 굵은 경계
            attr = ' class="%s"' % " ".join(cls) if cls else ""
            # 달이 바뀌는 날만 월을 같이 적는다. 안 그러면 "30 1 2" 가 이어져
            # 어디서 달이 넘어갔는지 보이지 않는다.
            label = ("%d/%d" % (day.month, day.day)) if day.day == 1 else str(day.day)
            date_cells.append('<td%s><b>%s</b><i>%s</i></td>'
                              % (attr, label, DOW[d]))

    wkrow = ('<tr class="wkrow">\n'
             '        <th class="no"></th><th class="nm">이름</th>\n'
             '        %s\n      </tr>' % "".join(wk_cells))
    dates = ('<tr class="dates">\n'
             '        <th class="no"></th><th class="nm">날짜</th>\n'
             '        %s\n      </tr>' % "".join(date_cells))
    return wkrow, dates


def main() -> int:
    if len(sys.argv) > 1:
        try:
            anchor = date.fromisoformat(sys.argv[1])
        except ValueError:
            print("날짜는 2026-11-02 처럼 적어 주세요", file=sys.stderr)
            return 1
    else:
        anchor = date.today()
    monday = anchor - timedelta(days=anchor.weekday())

    html = SHEET.read_text(encoding="utf-8")
    wkrow, dates = build(monday)

    html, n1 = re.subn(r'<tr class="wkrow">.*?</tr>', lambda _: wkrow,
                       html, count=1, flags=re.S)
    html, n2 = re.subn(r'<tr class="dates">.*?</tr>', lambda _: dates,
                       html, count=1, flags=re.S)
    if not (n1 and n2):
        print("머리줄을 못 찾았습니다. 02 파일 구조가 바뀌었는지 확인하세요.",
              file=sys.stderr)
        return 1

    SHEET.write_text(html, encoding="utf-8")
    last = monday + timedelta(days=(WEEKS - 1) * 7 + DAYS - 1)
    print("%s ~ %s (%d주) 로 맞췄습니다" % (monday, last, WEEKS))
    print("공휴일이 끼어 있으면 그 칸은 직접 표시하세요 — 자동으로 빼지 않습니다.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
