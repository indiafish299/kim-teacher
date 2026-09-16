#!/usr/bin/env python3
"""헤드리스 크롬을 쓰는 도구들의 공통부.

인쇄물 도구 셋(check_overflow, check_bundle, build_share)이 모두 크롬을 띄운다.
띄우는 방식에 한 가지 함정이 있어서 한 군데로 모았다 — 아래 launch() 주석 참고.

이 파일은 직접 실행하지 않는다.
"""

from __future__ import annotations

import shutil
import subprocess
import tempfile

CHROME = "/opt/pw-browsers/chromium"
PX_PER_MM = 96 / 25.4

# 낱장 7종의 실제 용지 — (파일명, 번들 안의 id, 가로mm, 세로mm)
# build_bundle.py 에도 SHEETS 가 있지만 그쪽은 화면에 보일 이름표라 쓰임이 다르다.
PAPERS = [
    ("01-timetable-a2.html", "s01", 420, 594),
    ("02-attendance-a3.html", "s02", 297, 420),
    ("03-notice-a3.html", "s03", 297, 420),
    ("04-class-rules-a3.html", "s04", 297, 420),
    ("05-birthday-a3.html", "s05", 297, 420),
    ("06-seating-a4.html", "s06", 297, 210),
    ("07-duty-a4.html", "s07", 210, 297),
]

# 낱장 파일의 화면용 장식(어두운 바탕·가운데 정렬·그림자)을 걷어낸다.
# 종이만 남겨야 찍은 그림이 인쇄물과 같아진다. </body> 앞에 끼워 넣는다.
BARE = """<style>
@media screen { html,body { padding:0!important; margin:0!important;
  background:#fff!important; display:block!important; }
  .sheet { box-shadow:none!important; } }
</style></body>"""


def launch(args: list[str], timeout: int = 180) -> str:
    """크롬을 한 번 띄우고 표준출력을 돌려준다.

    프로필 폴더를 매번 새로 만들어 준다. 안 주면 기본 프로필을 공유하는데, 앞 번
    실행이 남긴 잠금 때문에 두 번째 호출부터 창이 아예 안 뜬다. 같은 파일을 연달아
    재 보면 1회차만 되고 2회차부터 빈 결과가 나온다 — 파일은 생기므로 조용히 틀린다.
    """
    prof = tempfile.mkdtemp(prefix="chrome-printables-")
    try:
        return subprocess.run(
            [CHROME, "--headless", "--disable-gpu", "--no-sandbox",
             "--user-data-dir=" + prof, "--hide-scrollbars",
             "--disable-background-networking", "--no-first-run"] + args,
            capture_output=True, text=True, timeout=timeout).stdout
    finally:
        shutil.rmtree(prof, ignore_errors=True)
