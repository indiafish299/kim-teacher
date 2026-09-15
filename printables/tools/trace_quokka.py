#!/usr/bin/env python3
"""원본 쿼카 그림(JPG)을 그대로 SVG 벡터로 추적한다.

원본은 단색 면으로만 그려진 일러스트라, 색 영역별로 윤곽선을 따면 거친 털 가장자리까지
원본과 동일하게 재현된다. 손으로 근사하게 다시 그리는 것보다 훨씬 원본에 가깝고,
결과가 100% 벡터라 A2 대형 출력에서도 깨지지 않는다.

동작 순서
  1. JPEG 압축 잡티를 걷어내고 색을 원래의 평면 팔레트로 되돌린다
  2. 색마다 이진 마스크를 만들고, 픽셀 경계선을 따라가며(crack following) 윤곽 폐곡선을 얻는다
  3. Douglas-Peucker 로 계단 현상만 걷어낸다 (털의 삐침은 남긴다)
  4. 넓은 면부터 좁은 면 순으로 겹쳐 그린다 -> 면 사이에 흰 실선(seam)이 생기지 않는다

    python3 printables/tools/trace_quokka.py

-> printables/assets/svg/quokka-*.svg 를 덮어쓴다.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path("/root/.claude/uploads/d6e42e9e-2e50-53c0-9062-cd73a35af685")
OUT = Path(__file__).resolve().parent.parent / "assets" / "svg"

# 원본 4종. (파일명, 결과 이름, 팔레트 색 수)
SOURCES = [
    ("bc96925a-image.jpg", "quokka-scarf", 8),      # 주황 목도리 + 웃는 얼굴
    ("ccc82626-image.jpg", "quokka-surprised", 8),  # 눈 동그랗게, 입 벌림
    ("a65b7631-image.jpg", "quokka-happy", 8),      # 볼 발그레 + 혀 + 두 손
    ("de5bd83f-image.jpg", "quokka-earmuffs", 8),   # 회색 귀마개
]

MIN_AREA = 12.0   # 이보다 작은 조각은 JPEG 잡티로 보고 버린다
DP_EPS = 0.55     # 단순화 허용 오차(px). 키우면 털이 뭉개지고, 줄이면 파일이 커진다


# ------------------------------------------------------------------ 색 정리


def flat_palette(img: Image.Image, max_colors: int, merge_dist: float = 46.0,
                 min_count: int = 24) -> list[tuple[int, int, int]]:
    """원본이 쓴 '진짜' 평면 색들을 찾아낸다.

    메디안컷 같은 일반 양자화는 여기서 쓸모가 없다. 화면의 절반을 차지하는 털색에
    슬롯 서너 개를 몰아주고, 정작 작지만 중요한 색(주황 목도리, 분홍 혀)은 이웃과
    뭉개버린다. 대신 JPEG 링잉이 없는 '면의 안쪽' 픽셀만 골라 빈도를 세고,
    서로 충분히 떨어진 색만 남긴다.
    """
    a = np.asarray(img, dtype=np.int16)
    h, w, _ = a.shape

    # 3x3 안에서 색이 거의 변하지 않는 픽셀 = 면의 안쪽. 경계의 중간색은 여기서 빠진다.
    # 문턱값이 너무 빡빡하면 혀처럼 작은 면은 안쪽 픽셀이 거의 남지 않아 통째로 사라진다.
    pad = np.pad(a, ((1, 1), (1, 1), (0, 0)), mode="edge")
    mx = np.full_like(a, -32768)
    mn = np.full_like(a, 32767)
    for dy in range(3):
        for dx in range(3):
            win = pad[dy:dy + h, dx:dx + w]
            mx = np.maximum(mx, win)
            mn = np.minimum(mn, win)
    interior = a[(mx - mn).max(axis=2) <= 14]
    if len(interior) == 0:
        interior = a.reshape(-1, 3)

    # 색을 성글게 뭉쳐 빈도를 세고, 많은 색부터 집어가되 이미 담은 색과 가까우면 건너뛴다.
    # 문턱은 전체 대비 '비율'이 아니라 '절대 개수'로 잡는다. 혀처럼 100픽셀짜리 면은
    # 어떤 비율을 쓰더라도 문턱 아래로 떨어져 통째로 사라지기 때문이다.
    step = 8
    key = (interior // step).astype(np.int32)
    key = key[:, 0] * 4096 + key[:, 1] * 64 + key[:, 2]
    uniq, counts = np.unique(key, return_counts=True)

    centers: list[np.ndarray] = []
    for i in np.argsort(-counts):
        if counts[i] < min_count or len(centers) >= max_colors:
            break
        k = int(uniq[i])
        c = np.array([(k // 4096) * step + step // 2,
                      ((k // 64) % 64) * step + step // 2,
                      (k % 64) * step + step // 2], dtype=np.float64)
        if any(np.linalg.norm(c - p) < merge_dist for p in centers):
            continue
        centers.append(c)

    # 각 색을 자기 무리의 평균으로 다듬는다 (뭉치면서 생긴 오차 제거)
    pal = np.array(centers)
    d = ((interior[:, None, :] - pal[None, :, :]) ** 2).sum(axis=2)
    owner = d.argmin(axis=1)
    refined = []
    for i in range(len(pal)):
        grp = interior[owner == i]
        src = grp.mean(axis=0) if len(grp) else pal[i]
        refined.append(tuple(int(round(v)) for v in src))
    return refined


def _seg_dist(p: np.ndarray, a: np.ndarray, b: np.ndarray) -> float:
    """점 p 에서 선분 ab 까지의 거리."""
    ab = b - a
    denom = float((ab * ab).sum())
    t = 0.0 if denom < 1e-9 else float(np.clip(((p - a) * ab).sum() / denom, 0.0, 1.0))
    return float(np.linalg.norm(p - (a + t * ab)))


def rescue_small_colors(img: Image.Image, palette: list[tuple[int, int, int]],
                        min_count: int = 25, off_line: float = 34.0,
                        merge_dist: float = 46.0, max_add: int = 3
                        ) -> list[tuple[int, int, int]]:
    """너무 작아서 팔레트에 못 낀 색을 되살린다.

    쿼카의 분홍 혀는 116픽셀뿐이라 '면의 안쪽' 픽셀이 하나도 남지 않는다. 그래서
    빈도 기반으로는 어떤 문턱값을 써도 잡히지 않는다. 여기서는 반대로 접근한다 —
    기존 팔레트로 설명되지 않는 픽셀을 모아 보고, 그게 진짜 새 색인지 판별한다.

    판별 기준은 '두 팔레트 색을 잇는 선분에서 얼마나 떨어져 있는가'다. JPEG 경계에
    생긴 혼합색은 양쪽 색을 잇는 선분 위에 놓이지만, 진짜 새 색(채도 높은 혀의 빨강)은
    그 선분들에서 멀리 떨어져 있다. 단순히 '가장 가까운 팔레트 색과의 거리'로만 재면
    경계 혼합색이 오히려 더 멀어서(털-갈색 중간값 112 > 혀 89) 잡티만 잔뜩 주워온다.
    """
    flat = np.asarray(img, dtype=np.int32).reshape(-1, 3)
    key = (flat // 8)
    key1 = key[:, 0] * 4096 + key[:, 1] * 64 + key[:, 2]
    uniq, counts = np.unique(key1, return_counts=True)

    pal = [np.array(c, dtype=np.float64) for c in palette]

    # 1단계: 기존 팔레트로 설명되지 않는 버킷만 남긴다
    cands: list[tuple[np.ndarray, int]] = []
    for i in range(len(uniq)):
        if counts[i] < 3:
            continue
        c = flat[key1 == uniq[i]].mean(axis=0)
        if min(np.linalg.norm(c - q) for q in pal) < merge_dist:
            continue
        if min(_seg_dist(c, pal[j], pal[k])
               for j in range(len(pal)) for k in range(j + 1, len(pal))) < off_line:
            continue
        cands.append((c, int(counts[i])))

    # 2단계: 후보끼리 묶는다. 작은 면은 경계 흐림 때문에 버킷 서넛으로 쪼개지므로
    # 버킷 하나의 개수로 판단하면 영영 문턱을 못 넘는다.
    cands.sort(key=lambda t: -t[1])
    groups: list[list[tuple[np.ndarray, int]]] = []
    for c, n in cands:
        for g in groups:
            if np.linalg.norm(c - g[0][0]) < merge_dist:
                g.append((c, n))
                break
        else:
            groups.append([(c, n)])

    added: list[tuple[int, int, int]] = []
    for g in sorted(groups, key=lambda g: -sum(n for _, n in g)):
        total = sum(n for _, n in g)
        if total < min_count or len(added) >= max_add:
            break
        mean = sum(c * n for c, n in g) / total
        added.append(tuple(int(round(v)) for v in mean))
    return palette + added


def quantize(img: Image.Image, ncolors: int) -> tuple[np.ndarray, list[tuple[int, int, int]]]:
    """각 픽셀을 원본의 평면 팔레트 중 가장 가까운 색으로 되돌린다."""
    palette = rescue_small_colors(img, flat_palette(img, ncolors))
    # int32 로 올려서 계산한다. int16 이면 제곱이 넘쳐(예: 201^2 = 40401 > 32767)
    # 음수로 감기고, 흰 배경이 진한 갈색에 "가장 가깝다"고 뒤집힌다.
    a = np.asarray(img, dtype=np.int32)
    pal = np.array(palette, dtype=np.int32)
    d = ((a[:, :, None, :] - pal[None, None, :, :]) ** 2).sum(axis=3)
    labels = d.argmin(axis=2).astype(np.int16)
    return majority_filter(labels, len(palette)), palette


def majority_filter(labels: np.ndarray, n: int) -> np.ndarray:
    """3x3 다수결로 외톨이 픽셀을 지운다.

    색 번호에는 중간값(median)이 의미가 없으므로 최빈값을 쓴다. 현재 색에 가산점을 줘서
    확실히 밀릴 때만 바뀌게 하면, 잡티는 지워지고 진짜 경계는 살아남는다.
    """
    pad = np.pad(labels, 1, mode="edge")
    counts = np.zeros(labels.shape + (n,), dtype=np.float32)
    for dy in range(3):
        for dx in range(3):
            win = pad[dy:dy + labels.shape[0], dx:dx + labels.shape[1]]
            for k in range(n):
                counts[:, :, k] += (win == k)
    for k in range(n):
        counts[:, :, k] += (labels == k) * 1.5   # 현재 색 가산점
    return counts.argmax(axis=2).astype(np.int16)


# ------------------------------------------------------------------ 윤곽 추적


def contours(mask: np.ndarray) -> list[list[tuple[float, float]]]:
    """이진 마스크의 윤곽 폐곡선들을 픽셀 경계선을 따라 정확히 뽑아낸다.

    픽셀 한가운데가 아니라 픽셀 사이의 '틈(crack)'을 걷는다. 그래서 인접한 두 색이
    경계를 정확히 공유하고, 이어 그렸을 때 틈이 벌어지지 않는다.
    채워진 픽셀을 항상 진행방향 왼쪽에 두므로, 바깥 윤곽과 구멍의 회전 방향이 서로 반대다.
    """
    h, w = mask.shape
    m = np.pad(mask, 1)
    edges: dict[tuple[int, int], list[tuple[int, int]]] = {}

    ys, xs = np.nonzero(m)
    for y, x in zip(ys.tolist(), xs.tolist()):
        if not m[y - 1, x]:                       # 위쪽이 비었으면 윗변
            edges.setdefault((x, y), []).append((x + 1, y))
        if not m[y, x + 1]:                       # 오른쪽이 비었으면 오른변
            edges.setdefault((x + 1, y), []).append((x + 1, y + 1))
        if not m[y + 1, x]:                       # 아래가 비었으면 아랫변
            edges.setdefault((x + 1, y + 1), []).append((x, y + 1))
        if not m[y, x - 1]:                       # 왼쪽이 비었으면 왼변
            edges.setdefault((x, y + 1), []).append((x, y))

    loops = []
    while edges:
        start = next(iter(edges))
        loop = [start]
        cur = start
        while True:
            nxts = edges.get(cur)
            if not nxts:
                break
            nxt = nxts.pop()
            if not nxts:
                del edges[cur]
            cur = nxt
            if cur == start:
                break
            loop.append(cur)
        if len(loop) >= 4:
            # 패딩 1픽셀만큼 되돌린다
            loops.append([(float(x - 1), float(y - 1)) for x, y in loop])
    return loops


def signed_area(pts: list[tuple[float, float]]) -> float:
    s = 0.0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        s += x1 * y2 - x2 * y1
    return s / 2.0


def douglas_peucker(pts: list[tuple[float, float]], eps: float) -> list[tuple[float, float]]:
    """계단 현상만 걷어내는 선 단순화. 재귀 대신 스택을 써서 깊이 제한에 걸리지 않게 한다."""
    n = len(pts)
    if n < 3:
        return pts
    keep = [False] * n
    keep[0] = keep[n - 1] = True
    stack = [(0, n - 1)]
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        ax, ay = pts[i]
        bx, by = pts[j]
        dx, dy = bx - ax, by - ay
        norm = (dx * dx + dy * dy) ** 0.5
        best, best_d = -1, eps
        for k in range(i + 1, j):
            px, py = pts[k]
            if norm < 1e-9:
                d = ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
            else:
                d = abs(dy * px - dx * py + bx * ay - by * ax) / norm
            if d > best_d:
                best, best_d = k, d
        if best != -1:
            keep[best] = True
            stack.append((i, best))
            stack.append((best, j))
    return [p for p, k in zip(pts, keep) if k]


def to_path(loops: list[list[tuple[float, float]]], ox: float, oy: float) -> str:
    out = []
    for loop in loops:
        pts = douglas_peucker(loop + [loop[0]], DP_EPS)[:-1]
        if len(pts) < 3:
            continue
        seg = [f"M{pts[0][0] - ox:.1f},{pts[0][1] - oy:.1f}"]
        seg += [f"L{x - ox:.1f},{y - oy:.1f}" for x, y in pts[1:]]
        out.append("".join(seg) + "Z")
    return "".join(out)


# ------------------------------------------------------------------ 조립


def hexcolor(rgb: tuple[int, int, int]) -> str:
    return "#%02X%02X%02X" % rgb


def is_background(rgb: tuple[int, int, int]) -> bool:
    r, g, b = rgb
    return r > 228 and g > 228 and b > 228


def trace(path: Path, ncolors: int) -> str:
    img = Image.open(path).convert("RGB")
    labels, palette = quantize(img, ncolors)

    bg = {i for i, c in enumerate(palette) if is_background(c)}
    subject = ~np.isin(labels, list(bg)) if bg else np.ones_like(labels, dtype=bool)

    ys, xs = np.nonzero(subject)
    ox, oy = float(xs.min()), float(ys.min())
    w = float(xs.max() - xs.min() + 1)
    h = float(ys.max() - ys.min() + 1)

    layers = []
    for idx, rgb in enumerate(palette):
        if idx in bg:
            continue
        mask = (labels == idx)
        if mask.sum() < MIN_AREA:
            continue
        loops = [lp for lp in contours(mask) if abs(signed_area(lp)) >= MIN_AREA]
        if not loops:
            continue
        # 바깥 윤곽만 남기고 구멍은 메운다. 넓은 면부터 그리고 좁은 면을 그 위에 덮으면
        # 구멍이 자연히 가려지므로, 면과 면 사이에 흰 실선이 생기지 않는다.
        outer = [lp for lp in loops if signed_area(lp) > 0]
        if not outer:
            outer = loops
        layers.append((sum(abs(signed_area(lp)) for lp in outer), hexcolor(rgb), outer))

    layers.sort(key=lambda t: -t[0])
    body = "".join(f'<path d="{to_path(lp, ox, oy)}" fill="{col}"/>'
                   for _, col, lp in layers)

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" '
        f'width="{w:.0f}" height="{h:.0f}" role="img">{body}</svg>\n'
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for src, name, ncolors in SOURCES:
        svg = trace(SRC / src, ncolors)
        dest = OUT / f"{name}.svg"
        dest.write_text(svg, encoding="utf-8")
        print(f"  {dest.name}  {len(svg) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
