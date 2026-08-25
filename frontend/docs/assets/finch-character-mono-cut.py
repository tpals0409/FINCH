"""시트에서 포즈 세 개를 잘라 투명 PNG 로 만든다.

배경(따뜻한 회색)과 새의 흰 몸통은 밝기가 겹친다 (배경 L≈218, 몸통 L≈207~225).
색조도 겹친다 — 렌더의 주변광이 따뜻해서 새도 배경도 R−B≈+18 이다.
그래서 색으로는 갈라지지 않는다.

갈라지는 것은 **질감**이다. 새는 털이 보이는 사실적 렌더라 국소 표준편차가
5~15 이고, 배경과 바닥 그림자는 완전히 매끈해서 1~3 이다. 국소 표준편차로
윤곽을 얻고, 그 윤곽 안쪽을 메워 실루엣을 만든다.

바닥에는 시트 가로 전체를 지나는 접지선(그림자 가장자리)이 있다. 이것도
질감 경계라 마스크에 잡힌다. 열마다 세로로 이어진 길이를 재서 짧은 것(접지선)을
버리고, 다리 아래에 남는 그림자는 맨 아래 띠에서 밝기로 한 번 더 걷어낸다.

바닥 그림자는 **지운다.** 구운 그림자는 따뜻한 회색이라 어두운 지면 위에서
얼룩이 되고, 화면의 다른 그림자와 광원 방향을 맞출 방법도 없다. 접지는
`styles/mono.css` 의 `.mono-finch::after` 가 타원 하나로 그린다.

    python3 finch-character-mono-cut.py finch-character-mono-sheet.png ../../public/character-mono

세 파일이 나온다. numpy 와 Pillow 만 쓴다.
"""

import sys
from collections import deque

import numpy as np
from PIL import Image

STD_RADIUS = 4
STD_ON = 2.4
STD_FULL = 5.0
MIN_COLUMN_RUN = 16
TARGET_HEIGHT = 240
PALETTE_COLORS = 128


def box_mean(values: np.ndarray, radius: int) -> np.ndarray:
    padded = np.pad(values, radius, mode='edge')
    cumulative = padded.cumsum(0).cumsum(1)
    cumulative = np.pad(cumulative, ((1, 0), (1, 0)))
    size = 2 * radius + 1
    total = (
        cumulative[size:, size:]
        - cumulative[:-size, size:]
        - cumulative[size:, :-size]
        + cumulative[:-size, :-size]
    )
    return total / (size * size)


def local_std(luminance: np.ndarray, radius: int) -> np.ndarray:
    mean = box_mean(luminance, radius)
    mean_of_squares = box_mean(luminance * luminance, radius)
    return np.sqrt(np.maximum(mean_of_squares - mean * mean, 0))


def dilate(mask: np.ndarray, radius: int) -> np.ndarray:
    out = mask.copy()
    for _ in range(radius):
        shifted = out.copy()
        shifted[1:, :] |= out[:-1, :]
        shifted[:-1, :] |= out[1:, :]
        shifted[:, 1:] |= out[:, :-1]
        shifted[:, :-1] |= out[:, 1:]
        out = shifted
    return out


def erode(mask: np.ndarray, radius: int) -> np.ndarray:
    return ~dilate(~mask, radius)


def fill_interior(mask: np.ndarray) -> np.ndarray:
    height, width = mask.shape
    hole = ~mask
    outside = np.zeros_like(hole)
    queue: deque = deque()
    border = [(0, x) for x in range(width)] + [(height - 1, x) for x in range(width)]
    border += [(y, 0) for y in range(height)] + [(y, width - 1) for y in range(height)]
    for y, x in border:
        if hole[y, x] and not outside[y, x]:
            outside[y, x] = True
            queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < height and 0 <= nx < width and hole[ny, nx] and not outside[ny, nx]:
                outside[ny, nx] = True
                queue.append((ny, nx))
    return mask | (hole & ~outside)


def blob_nearest_center(mask: np.ndarray) -> np.ndarray:
    height, width = mask.shape
    seen = np.zeros_like(mask)
    best, best_score = None, None
    for sy in range(height):
        for sx in range(width):
            if not mask[sy, sx] or seen[sy, sx]:
                continue
            queue = deque([(sy, sx)])
            seen[sy, sx] = True
            cells = []
            while queue:
                y, x = queue.popleft()
                cells.append((y, x))
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < height and 0 <= nx < width and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        queue.append((ny, nx))
            if len(cells) < 3000:
                continue
            cy = sum(c[0] for c in cells) / len(cells)
            cx = sum(c[1] for c in cells) / len(cells)
            score = (cy - height / 2) ** 2 + (cx - width / 2) ** 2
            if best_score is None or score < best_score:
                best_score, best = score, cells
    keep = np.zeros_like(mask)
    for y, x in best:
        keep[y, x] = True
    return keep


def drop_thin_columns(mask: np.ndarray, minimum: int) -> np.ndarray:
    """열마다 세로로 이어진 길이가 짧은 구간을 버린다. 바닥 접지선이 여기 걸린다."""
    out = mask.copy()
    height, width = mask.shape
    for x in range(width):
        y = 0
        while y < height:
            if not mask[y, x]:
                y += 1
                continue
            start = y
            while y < height and mask[y, x]:
                y += 1
            if y - start < minimum:
                out[start:y, x] = False
    return out


def neutralize(rgba: np.ndarray) -> np.ndarray:
    """렌더의 따뜻한 주변광을 걷어내 흰 몸통을 무채색으로 되돌린다.

    시트의 새는 흰색인데 실제 픽셀은 (224, 214, 207) 처럼 따뜻하다. 시트 배경이
    같은 온도의 회색이라 시트 안에서는 안 보이지만, 화면 지면이 무채색이면
    새만 누렇게 뜬다. **이 방향의 이름이 무채색인데 캐릭터가 베이지로 읽힌다.**

    흰 몸통 픽셀의 채널 평균이 서로 같아지도록 채널별 이득을 구해 전체에 곱한다.
    색을 입히는 것이 아니라 조명의 색을 빼는 것이라 넥타이의 남색은 그대로 남는다
    (오히려 파랑 채널이 올라가 조금 더 또렷해진다). 이득은 세 포즈 모두
    R×0.96 · G×1.00 · B×1.04 근처로 나온다.
    """
    result = rgba.astype(np.float64)
    rgb, alpha = result[..., :3], result[..., 3]
    luminance = rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114
    body = (alpha > 200) & (luminance > 170)
    mean = rgb[body].mean(axis=0)
    result[..., :3] = np.clip(rgb * (mean.mean() / mean), 0, 255)
    return result.round().astype(np.uint8)


def cut(sheet: np.ndarray, row: int, col: int, pad: int = 90):
    height, width, _ = sheet.shape
    tile_h, tile_w = height // 3, width // 3
    y0, y1 = max(0, row * tile_h - pad), min(height, (row + 1) * tile_h + pad)
    x0, x1 = max(0, col * tile_w - pad), min(width, (col + 1) * tile_w + pad)
    tile = sheet[y0:y1, x0:x1].astype(np.float64)

    luminance = tile[..., 0] * 0.299 + tile[..., 1] * 0.587 + tile[..., 2] * 0.114
    std = local_std(luminance, STD_RADIUS)

    mask = std > STD_ON
    mask = fill_interior(dilate(mask, 2))
    mask = erode(mask, 2)
    mask = drop_thin_columns(mask, MIN_COLUMN_RUN)
    mask = fill_interior(mask)
    mask = blob_nearest_center(mask)

    # 경계에서 2px 안으로 들여 깎는다. 그러지 않으면 배경이 섞인 픽셀이
    # 테두리에 남아 어두운 지면 위에서 흰 테로 보인다.
    mask = erode(mask, 2)

    # 발밑에 남은 바닥 그림자를 뗀다. 그림자는 매끈하고(질감 없음) 다리보다 밝다.
    # **맨 아래 띠에만, 구멍 메우기 뒤에 적용한다.** 몸통 전체에 걸면 흐릿하게
    # 렌더된 흰 배가 같은 조건에 걸려 옆구리가 뜯기고, 뒤에 다시 메우면
    # 방금 뗀 그림자가 그대로 되살아난다. 둘 다 실제로 겪은 실패다.
    ys, _ = np.nonzero(mask)
    floor = int(ys.min() + (ys.max() - ys.min()) * 0.84)
    band = np.zeros_like(mask)
    band[floor:, :] = True
    mask &= ~(band & (std < 6.5) & (luminance > 105))
    mask = blob_nearest_center(mask)

    ramp = np.clip((std - STD_ON) / (STD_FULL - STD_ON), 0, 1)
    inner = erode(mask, 3)
    alpha = np.where(inner, 1.0, np.where(mask, ramp, 0.0))

    ys, xs = np.nonzero(alpha > 0.04)
    box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    rgba = np.dstack(
        [tile.round().astype(np.uint8), (alpha * 255).round().astype(np.uint8)]
    )
    return Image.fromarray(neutralize(rgba), 'RGBA').crop(box)


def main() -> None:
    sheet = np.asarray(Image.open(sys.argv[1]).convert('RGB'))
    out_dir = sys.argv[2]

    # 세 포즈 모두 가운데 줄에서 뽑는다. 같은 줄이라 크기와 조명이 같고,
    # 화면에서 서로 바뀔 때 새의 덩치가 달라 보이지 않는다.
    poses = {
        'finch-tilt': (1, 0),  # 보합 — 갸웃
        'finch-wings-open': (1, 1),  # 상승 — 두 날개 활짝
        'finch-turned-away': (1, 2),  # 하락 — 뒤돌아 어깨너머로 봄
    }
    cutouts = {name: cut(sheet, *cell) for name, cell in poses.items()}

    # 셋을 같은 캔버스에 바닥 맞춤으로 앉힌다. 포즈마다 폭이 다른데 그대로
    # 쓰면 상태가 바뀔 때 캐릭터가 화면에서 뛴다.
    canvas_w = max(image.width for image in cutouts.values())
    canvas_h = max(image.height for image in cutouts.values())
    scale = TARGET_HEIGHT / canvas_h
    target_w = round(canvas_w * scale)

    for name, image in cutouts.items():
        canvas = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
        canvas.alpha_composite(image, ((canvas_w - image.width) // 2, canvas_h - image.height))

        # 알파를 곱한 뒤에 줄인다. 그러지 않으면 투명 픽셀의 RGB 가 섞여
        # 테두리에 배경색 흰 테가 생기고, 어두운 지면에서 그게 그대로 보인다.
        raw = np.asarray(canvas).astype(np.float64)
        raw[..., :3] *= raw[..., 3:4] / 255.0
        shrunk = Image.fromarray(raw.round().astype(np.uint8), 'RGBA').resize(
            (target_w, TARGET_HEIGHT), Image.LANCZOS
        )
        back = np.asarray(shrunk).astype(np.float64)
        alpha = np.maximum(back[..., 3:4], 1.0)
        back[..., :3] = np.clip(back[..., :3] * 255.0 / alpha, 0, 255)
        flat = Image.fromarray(back.round().astype(np.uint8), 'RGBA')

        # 모바일 우선이다. 무채색 캐릭터라 128색이면 털의 계조가 눈에 띄게
        # 뭉치지 않으면서 장당 13~14KB 로 떨어진다.
        flat.quantize(colors=PALETTE_COLORS, method=Image.FASTOCTREE).save(
            f'{out_dir}/{name}.png', optimize=True
        )
        print(name, target_w, TARGET_HEIGHT)


main()
