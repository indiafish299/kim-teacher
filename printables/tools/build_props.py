#!/usr/bin/env python3
"""가을 소품 SVG 생성기 (단풍잎 / 은행잎 / 도토리 / 밤 / 감).

쿼카는 원본 그림을 추적해서 만든다(trace_quokka.py). 소품은 원본이 없으므로 여기서 그린다.
색은 printables/assets/print.css 의 팔레트와 맞춰 두었다.

    python3 printables/tools/build_props.py
"""

from __future__ import annotations

from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets" / "svg"

MAPLE = "#B33A2B"       # 단풍 버건디
PERSIMMON = "#E2762F"   # 감 오렌지
GINKGO = "#E5B23C"      # 은행 머스터드
MOSS = "#7A8B5A"        # 이끼 그린
INK = "#4A3223"         # 밤색
NUT = "#C98A3C"         # 도토리 알
CREAM = "#FDF6E9"


def svg(inner: str) -> str:
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" '
            f'width="100" height="100" role="img">{inner}</svg>\n')


def leaf_maple() -> str:
    """다섯 갈래 단풍잎: 가운데 하나, 위 양옆 둘, 아래 양옆 둘.

    갈래 끝(중심에서 ~42)과 갈래 사이 홈(~20)의 차이를 충분히 벌려야 단풍으로 읽힌다.
    차이가 작으면 그냥 뾰족한 별이 된다.
    """
    # 갈래 사이 홈을 중심 가까이 깊게 파면 잎이 아니라 별이 된다. 홈을 얕게 두고
    # 갈래의 옆선을 바깥으로 불룩하게(Q) 휘어야 통통한 단풍잎으로 읽힌다.
    d = ("M50,8 Q56,20 66,29 Q78,22 87,27 Q76,38 72,50 Q80,60 73,73 "
         "Q62,64 56,68 Q52,70 50,74 Q48,70 44,68 Q38,64 27,73 "
         "Q20,60 28,50 Q24,38 13,27 Q22,22 34,29 Q44,20 50,8 Z")
    return svg(f'<path d="{d}" fill="{MAPLE}"/>'
               f'<path d="M50,71 L50,95" stroke="{INK}" stroke-width="4.5" '
               f'stroke-linecap="round"/>')


def leaf_ginkgo() -> str:
    """부채꼴 은행잎.

    옆선을 둥글게 말면 어김없이 하트로 보인다. 12mm 짜리 장식으로 줄여 놓으면 더 심하다.
    옆선을 자루에서 곧게 뻗어 올리고, 위 모서리를 각지게 남겨야 부채로 읽힌다.
    """
    # 부채꼴(원의 조각)로 그린다. 자루에서 옆선 두 개가 곧게 뻗고, 위 가장자리는
    # 하나의 원호다. 가운데 V 홈은 그 원호를 둘로 끊어 만든다.
    d = ("M50,88 L7,43 A62,62 0 0 1 41.4,26.6 L50,40 L58.6,26.6 "
         "A62,62 0 0 1 93,43 Z")
    return svg(f'<path d="{d}" fill="{GINKGO}"/>'
               f'<path d="M50,86 L50,98" stroke="{INK}" stroke-width="4.5" '
               f'stroke-linecap="round"/>')


def acorn() -> str:
    """도토리. 위는 진한 깍정이, 아래는 옅은 알."""
    return svg(
        f'<path d="M50,92 C29,92 19,75 21,59 C23,48 35,44 50,44 '
        f'C65,44 77,48 79,59 C81,75 71,92 50,92 Z" fill="{NUT}"/>'
        f'<path d="M50,22 C74,22 85,32 85,44 C85,52 69,57 50,57 '
        f'C31,57 15,52 15,44 C15,32 26,22 50,22 Z" fill="{INK}"/>'
        f'<path d="M50,7 L50,24" stroke="{INK}" stroke-width="7" '
        f'stroke-linecap="round"/>'
    )


def chestnut() -> str:
    """밤. 위가 뾰족한 돔에 아래쪽으로 옅은 밑동."""
    return svg(
        f'<path d="M50,12 C58,12 72,28 82,46 C90,60 84,84 50,84 '
        f'C16,84 10,60 18,46 C28,28 42,12 50,12 Z" fill="{MAPLE}"/>'
        f'<path d="M22,68 C30,60 70,60 78,68 C74,80 62,84 50,84 '
        f'C38,84 26,80 22,68 Z" fill="{NUT}"/>'
        f'<path d="M50,8 L50,18" stroke="{INK}" stroke-width="5" '
        f'stroke-linecap="round"/>'
    )


def persimmon() -> str:
    """감. 납작한 주황 열매에 초록 꼭지."""
    return svg(
        f'<ellipse cx="50" cy="60" rx="35" ry="31" fill="{PERSIMMON}"/>'
        f'<path d="M50,34 L24,20 L43,28 L32,9 L50,26 L68,9 L57,28 L76,20 Z" '
        f'fill="{MOSS}"/>'
        f'<path d="M50,8 L50,28" stroke="{INK}" stroke-width="5" '
        f'stroke-linecap="round"/>'
    )


FILES = {
    "leaf-maple.svg": leaf_maple,
    "leaf-ginkgo.svg": leaf_ginkgo,
    "acorn.svg": acorn,
    "chestnut.svg": chestnut,
    "persimmon.svg": persimmon,
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in FILES.items():
        (OUT / name).write_text(fn(), encoding="utf-8")
        print(f"  {name}")


if __name__ == "__main__":
    main()
