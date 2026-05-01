export type CropRect = { x: number; y: number; w: number; h: number };

const CARD_OUTPUT_WIDTH = 650;
const CARD_OUTPUT_HEIGHT = 1000;
const CARD_ASPECT_RATIO = CARD_OUTPUT_WIDTH / CARD_OUTPUT_HEIGHT;
const AUTO_MAX_ROWS = 24;
const AUTO_COL_COUNTS = [1, 2, 3, 4, 8];
const DETECTED_CELL_PAD = 0.003;

export type GridTemplate = {
  name: string;
  rows: number;
  cols: number;
  margin: { top: number; bottom: number; left: number; right: number };
  gap: { row: number; col: number };
};

export const PHOTOCARD_TEMPLATES: GridTemplate[] = [
  { name: '1×1', rows: 1, cols: 1, margin: { top: 0.01, bottom: 0.01, left: 0.01, right: 0.01 }, gap: { row: 0, col: 0 } },
  { name: '1×2', rows: 2, cols: 1, margin: { top: 0.02, bottom: 0.02, left: 0.02, right: 0.02 }, gap: { row: 0.02, col: 0 } },
  { name: '2×1', rows: 1, cols: 2, margin: { top: 0.02, bottom: 0.02, left: 0.02, right: 0.02 }, gap: { row: 0, col: 0.02 } },
  { name: '2×2', rows: 2, cols: 2, margin: { top: 0.02, bottom: 0.02, left: 0.02, right: 0.02 }, gap: { row: 0.015, col: 0.015 } },
  { name: '2×3', rows: 3, cols: 2, margin: { top: 0.02, bottom: 0.02, left: 0.02, right: 0.02 }, gap: { row: 0.015, col: 0.015 } },
  { name: '2×4', rows: 4, cols: 2, margin: { top: 0.02, bottom: 0.02, left: 0.02, right: 0.02 }, gap: { row: 0.012, col: 0.015 } },
  { name: '3×2', rows: 2, cols: 3, margin: { top: 0.02, bottom: 0.02, left: 0.02, right: 0.02 }, gap: { row: 0.015, col: 0.012 } },
  { name: '4×2', rows: 2, cols: 4, margin: { top: 0.02, bottom: 0.02, left: 0.02, right: 0.02 }, gap: { row: 0.015, col: 0.012 } },
  { name: '3×3', rows: 3, cols: 3, margin: { top: 0.02, bottom: 0.02, left: 0.02, right: 0.02 }, gap: { row: 0.012, col: 0.012 } },
  { name: '3×4', rows: 4, cols: 3, margin: { top: 0.015, bottom: 0.015, left: 0.015, right: 0.015 }, gap: { row: 0.01, col: 0.01 } },
  { name: '4×4', rows: 4, cols: 4, margin: { top: 0.015, bottom: 0.015, left: 0.015, right: 0.015 }, gap: { row: 0.01, col: 0.01 } },
  { name: '2×8', rows: 2, cols: 8, margin: { top: 0.01, bottom: 0.01, left: 0.01, right: 0.01 }, gap: { row: 0.008, col: 0.008 } },
  { name: '3×8', rows: 3, cols: 8, margin: { top: 0.01, bottom: 0.01, left: 0.01, right: 0.01 }, gap: { row: 0.008, col: 0.008 } },
  { name: '4×8', rows: 4, cols: 8, margin: { top: 0.01, bottom: 0.01, left: 0.01, right: 0.01 }, gap: { row: 0.008, col: 0.008 } },
];

export function templateCellRects(template: GridTemplate): CropRect[][] {
  const { rows, cols, margin, gap } = template;
  const usableW = 1 - margin.left - margin.right - (cols - 1) * gap.col;
  const usableH = 1 - margin.top - margin.bottom - (rows - 1) * gap.row;
  const cellW = usableW / cols;
  const cellH = usableH / rows;
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      x: margin.left + c * (cellW + gap.col),
      y: margin.top + r * (cellH + gap.row),
      w: cellW,
      h: cellH,
    }))
  );
}

export type DetectResult = {
  template: GridTemplate;
  cells: CropRect[][];
  detectedRows: number;
  detectedCols: number;
};

export function detectTemplate(
  img: HTMLImageElement,
  whiteThr = 220,
  minBandFrac = 0.04,
  separatorMinLightFrac = 0.65,
  separatorToleranceFrac = 0.1,
): DetectResult | null {
  try {
    const W = img.naturalWidth, H = img.naturalHeight;
    const scale = Math.min(1, 1400 / Math.max(W, H));
    const dW = Math.round(W * scale), dH = Math.round(H * scale);
    const canvas = document.createElement('canvas');
    canvas.width = dW; canvas.height = dH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, dW, dH);
    const { data } = ctx.getImageData(0, 0, dW, dH);

    const rowBr = new Float32Array(dH);
    const colBr = new Float32Array(dW);
    const rowLight = new Float32Array(dH);
    const colLight = new Float32Array(dW);
    const rowContent = new Float32Array(dH);
    const colContent = new Float32Array(dW);
    const cornerBrightness = [
      0,
      (dW - 1) * 4,
      ((dH - 1) * dW) * 4,
      ((dH - 1) * dW + dW - 1) * 4,
    ].map(i => (data[i] + data[i + 1] + data[i + 2]) / 3);
    const isDarkBackground = cornerBrightness.reduce((sum, v) => sum + v, 0) / cornerBrightness.length < 90;

    // Sample only the middle 60% of width for row brightness. This avoids left/right edge
    // decorations, row labels, and borders skewing the separator line brightness.
    const xS = Math.floor(dW * 0.2), xE = Math.ceil(dW * 0.8), xN = xE - xS;
    // Sample only the middle 60% of height for col brightness. This avoids top/bottom
    // headers, text label rows, and decorative bands skewing column brightness.
    const yS = Math.floor(dH * 0.2), yE = Math.ceil(dH * 0.8), yN = yE - yS;

    for (let y = 0; y < dH; y++) {
      let s = 0, light = 0, content = 0;
      for (let x = xS; x < xE; x++) {
        const i = (y * dW + x) * 4;
        const br = (data[i] + data[i + 1] + data[i + 2]) / 3;
        s += br;
        if (br >= whiteThr) light++;
        if (isDarkBackground ? br > 80 : br < 205) content++;
      }
      rowBr[y] = s / xN;
      rowLight[y] = light / xN;
      rowContent[y] = content / xN;
    }
    for (let x = 0; x < dW; x++) {
      let s = 0, light = 0, content = 0;
      for (let y = yS; y < yE; y++) {
        const i = (y * dW + x) * 4;
        const br = (data[i] + data[i + 1] + data[i + 2]) / 3;
        s += br;
        if (br >= whiteThr) light++;
        if (isDarkBackground ? br > 80 : br < 205) content++;
      }
      colBr[x] = s / yN;
      colLight[x] = light / yN;
      colContent[x] = content / yN;
    }

    function filterDarkBands(br: Float32Array, total: number): Array<[number, number]> {
      const bands: Array<[number, number]> = [];
      let inContent = false, start = 0;
      for (let i = 0; i < total; i++) {
        if (br[i] < whiteThr) {
          if (!inContent) { start = i; inContent = true; }
        } else {
          if (inContent) { bands.push([start, i - 1]); inContent = false; }
        }
      }
      if (inContent) bands.push([start, total - 1]);
      return bands.filter(([s, e]) => (e - s + 1) / total >= minBandFrac);
    }

    function findSeparatorBands(light: Float32Array, total: number, minLightFrac = 0.65): Array<[number, number]> {
      const bands: Array<[number, number]> = [];
      let inSeparator = false, start = 0;
      for (let i = 0; i < total; i++) {
        if (light[i] >= minLightFrac) {
          if (!inSeparator) { start = i; inSeparator = true; }
        } else if (inSeparator) {
          bands.push([start, i - 1]);
          inSeparator = false;
        }
      }
      if (inSeparator) bands.push([start, total - 1]);
      return bands.filter(([s, e]) => e > s);
    }

    function findContentBands(content: Float32Array, total: number, minContentFrac = 0.08): Array<[number, number]> {
      const bands: Array<[number, number]> = [];
      let inContent = false, start = 0;
      for (let i = 0; i < total; i++) {
        if (content[i] >= minContentFrac) {
          if (!inContent) { start = i; inContent = true; }
        } else if (inContent) {
          bands.push([start, i - 1]);
          inContent = false;
        }
      }
      if (inContent) bands.push([start, total - 1]);
      return bands.filter(([s, e]) => (e - s + 1) / total >= 0.01);
    }

    // Merge bands whose gap is within 5px. This handles bands fragmented by text,
    // anti-aliasing, or small decorative interruptions in an otherwise clean separator.
    function clusterBands(bands: Array<[number, number]>): Array<[number, number]> {
      if (bands.length <= 1) return bands;
      const out: Array<[number, number]> = [];
      let [cs, ce] = bands[0];
      for (let i = 1; i < bands.length; i++) {
        const [s, e] = bands[i];
        if (s - ce <= 5) { ce = Math.max(ce, e); }
        else { out.push([cs, ce]); cs = s; ce = e; }
      }
      out.push([cs, ce]);
      return out;
    }

    function darkFraction(x0: number, x1: number, y0: number, y1: number, darkThr = 190): number {
      const sx = Math.max(0, Math.min(dW - 1, Math.round(x0)));
      const ex = Math.max(sx + 1, Math.min(dW, Math.round(x1)));
      const sy = Math.max(0, Math.min(dH - 1, Math.round(y0)));
      const ey = Math.max(sy + 1, Math.min(dH, Math.round(y1)));
      let dark = 0, total = 0;
      for (let y = sy; y < ey; y++) {
        for (let x = sx; x < ex; x++) {
          const i = (y * dW + x) * 4;
          if ((data[i] + data[i + 1] + data[i + 2]) / 3 < darkThr) dark++;
          total++;
        }
      }
      return total > 0 ? dark / total : 0;
    }

    type AxisGrid = { count: number; bounds: number[]; score: number };

    function fitRegularSeparators(brightBands: Array<[number, number]>, total: number, counts: number[]): AxisGrid | null {
      const candidates = clusterBands(brightBands)
        .map(([s, e]) => (s + e) / 2)
        .filter(p => p > 0 && p < total - 1);
      const positions = Array.from(new Set([0, ...candidates.map(p => Math.round(p)), total - 1])).sort((a, b) => a - b);
      let best: AxisGrid | null = null;

      for (const count of counts) {
        if (count === 1) continue;
        for (let i = 0; i < positions.length - 1; i++) {
          for (let j = i + 1; j < positions.length; j++) {
            const start = positions[i];
            const end = positions[j];
            const pitch = (end - start) / count;
            if (pitch < total * 0.04) continue;

            const expected = Array.from({ length: count + 1 }, (_, k) => start + k * pitch);
            const tol = Math.max(5, pitch * separatorToleranceFrac);
            let matches = 0;
            let distance = 0;

            for (const p of expected) {
              let nearest = Infinity;
              for (const candidate of positions) nearest = Math.min(nearest, Math.abs(candidate - p));
              if (nearest <= tol) {
                matches++;
                distance += nearest / tol;
              }
            }

            const requiredMatches = Math.max(3, Math.ceil((count + 1) * 0.65));
            if (matches < requiredMatches) continue;

            const coverage = (end - start) / total;
            const usesRealEdges = Number(start !== 0) + Number(end !== total - 1);
            const score = matches * 20 + coverage * 8 + usesRealEdges * 2 - distance - count * 0.25;
            if (!best || score > best.score) best = { count, bounds: expected, score };
          }
        }
      }

      return best;
    }

    function darkBandFallback(br: Float32Array, total: number): AxisGrid {
      const bands = clusterBands(filterDarkBands(br, total));
      if (bands.length === 0) return { count: 1, bounds: [0, total - 1], score: 0 };
      return gridFromContentBands(bands);
    }

    function gridFromContentBands(bands: Array<[number, number]>): AxisGrid {
      const bounds = [bands[0][0]];
      for (let i = 1; i < bands.length; i++) {
        bounds.push((bands[i - 1][1] + bands[i][0]) / 2);
      }
      bounds.push(bands[bands.length - 1][1]);
      return { count: bands.length, bounds, score: 0 };
    }

    function contentBandFallback(content: Float32Array, total: number, minContentFrac = 0.08): AxisGrid | null {
      const bands = clusterBands(findContentBands(content, total, minContentFrac));
      if (bands.length <= 1) return null;
      return gridFromContentBands(bands);
    }

    function rowGridFromOccupiedBands(colGrid: AxisGrid, sourceBands: Array<[number, number]>): AxisGrid | null {
      if (colGrid.count <= 1 || colGrid.bounds.length < colGrid.count + 1) return null;

      const bands = clusterBands(sourceBands);
      const minOccupiedCols = Math.max(2, Math.ceil(colGrid.count * 0.55));
      let occupiedBands = bands.filter(([rs, re]) => {
        let occupied = 0;
        for (let c = 0; c < colGrid.count; c++) {
          const cs = colGrid.bounds[c];
          const ce = colGrid.bounds[c + 1];
          const innerX0 = cs + (ce - cs) * 0.18;
          const innerX1 = ce - (ce - cs) * 0.18;
          const innerY0 = rs + (re - rs) * 0.12;
          const innerY1 = re - (re - rs) * 0.12;
          if (darkFraction(innerX0, innerX1, innerY0, innerY1) > 0.18) occupied++;
        }
        return occupied >= minOccupiedCols;
      });

      if (occupiedBands.length > 2) {
        const heights = occupiedBands.map(([s, e]) => e - s + 1).sort((a, b) => a - b);
        const medianHeight = heights[Math.floor(heights.length / 2)];
        occupiedBands = occupiedBands.filter(([s, e]) => {
          const height = e - s + 1;
          return height >= medianHeight * 0.45 && height <= medianHeight * 1.6;
        });
      }

      return occupiedBands.length > 0 ? gridFromContentBands(occupiedBands) : null;
    }

    const possibleRows = Array.from({ length: AUTO_MAX_ROWS }, (_, i) => i + 1);
    const separatorColGrid = fitRegularSeparators(findSeparatorBands(colLight, dW, separatorMinLightFrac), dW, AUTO_COL_COUNTS);
    const contentColBands = findContentBands(colContent, dW, isDarkBackground ? 0.12 : 0.08);
    const contentColGrid =
      fitRegularSeparators(contentColBands, dW, AUTO_COL_COUNTS) ??
      contentBandFallback(colContent, dW, isDarkBackground ? 0.12 : 0.08);
    const darkColGrid = darkBandFallback(colBr, dW);
    const shouldUseContentCols =
      !isDarkBackground &&
      contentColGrid &&
      contentColGrid.count >= 4 &&
      (!separatorColGrid || separatorColGrid.count < 4 || darkColGrid.count <= 1);
    const colGrid = isDarkBackground
      ? contentColGrid ?? separatorColGrid ?? darkColGrid
      : shouldUseContentCols
        ? contentColGrid
        : separatorColGrid ?? (darkColGrid.count <= 1 ? contentColGrid : null) ?? darkColGrid;
    const contentRowGrid = rowGridFromOccupiedBands(colGrid, findContentBands(rowContent, dH));
    const darkRowGrid = rowGridFromOccupiedBands(colGrid, filterDarkBands(rowBr, dH));
    const rowGrid =
      (isDarkBackground ? contentRowGrid ?? darkRowGrid : darkRowGrid ?? contentRowGrid) ??
      fitRegularSeparators(findSeparatorBands(rowLight, dH, separatorMinLightFrac), dH, possibleRows) ??
      contentBandFallback(rowContent, dH) ??
      darkBandFallback(rowBr, dH);

    const detectedRows = Math.max(1, rowGrid.count);
    const detectedCols = Math.max(1, colGrid.count);

    const template =
      PHOTOCARD_TEMPLATES.find(t => t.rows === detectedRows && t.cols === detectedCols) ??
      PHOTOCARD_TEMPLATES.find(t => t.rows === detectedRows || t.cols === detectedCols) ??
      PHOTOCARD_TEMPLATES[0];

    let cells: CropRect[][];
    if (rowGrid.bounds.length >= detectedRows + 1 && colGrid.bounds.length >= detectedCols + 1) {
      const PAD = DETECTED_CELL_PAD;
      cells = Array.from({ length: detectedRows }, (_, r) =>
        Array.from({ length: detectedCols }, (_, c) => {
          const rs = rowGrid.bounds[r];
          const re = rowGrid.bounds[r + 1];
          const cs = colGrid.bounds[c];
          const ce = colGrid.bounds[c + 1];
          return {
          x: Math.max(0, cs / dW - PAD),
          y: Math.max(0, rs / dH - PAD),
          w: Math.min(1, (ce - cs) / dW + 2 * PAD),
          h: Math.min(1, (re - rs) / dH + 2 * PAD),
          };
        })
      );
    } else {
      cells = templateCellRects(template);
    }

    return { template, cells, detectedRows, detectedCols };
  } catch {
    return null;
  }
}

export async function trimBackground(
  img: HTMLImageElement,
  crop: CropRect,
  threshold = 20,
  marginPx = 2,
): Promise<CropRect> {
  try {
    const iW = img.naturalWidth, iH = img.naturalHeight;
    const sx = Math.round(crop.x * iW);
    const sy = Math.round(crop.y * iH);
    const sw = Math.max(1, Math.round(crop.w * iW));
    const sh = Math.max(1, Math.round(crop.h * iH));

    const canvas = document.createElement('canvas');
    canvas.width = sw; canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return crop;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const { data } = ctx.getImageData(0, 0, sw, sh);

    const sample = (px: number, py: number) => {
      const i = (py * sw + px) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    };
    const corners = [sample(0, 0), sample(sw - 1, 0), sample(0, sh - 1), sample(sw - 1, sh - 1)];
    const bg = corners.reduce((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0]).map(v => v / 4);
    const maxCornerDelta = corners.reduce((max, c) => {
      const dr = c[0] - bg[0], dg = c[1] - bg[1], db = c[2] - bg[2];
      return Math.max(max, Math.sqrt(dr * dr + dg * dg + db * db));
    }, 0);
    if (maxCornerDelta > 80) return crop;

    let minX = sw, minY = sh, maxX = 0, maxY = 0, found = false;
    for (let py = 0; py < sh; py++) {
      for (let px = 0; px < sw; px++) {
        const i = (py * sw + px) * 4;
        const dr = data[i] - bg[0], dg = data[i + 1] - bg[1], db = data[i + 2] - bg[2];
        if (Math.sqrt(dr * dr + dg * dg + db * db) > threshold) {
          if (px < minX) minX = px;
          if (py < minY) minY = py;
          if (px > maxX) maxX = px;
          if (py > maxY) maxY = py;
          found = true;
        }
      }
    }
    if (!found || (maxX - minX) / sw < 0.15 || (maxY - minY) / sh < 0.15) return crop;

    minX = Math.max(0, minX - marginPx);
    minY = Math.max(0, minY - marginPx);
    maxX = Math.min(sw - 1, maxX + marginPx);
    maxY = Math.min(sh - 1, maxY + marginPx);

    return {
      x: crop.x + minX / iW,
      y: crop.y + minY / iH,
      w: (maxX - minX) / iW,
      h: (maxY - minY) / iH,
    };
  } catch {
    return crop;
  }
}

export function fitCropRectToCardAspect(img: HTMLImageElement, crop: CropRect): CropRect {
  const imageAspect = img.naturalWidth / img.naturalHeight;
  const normalizedAspect = CARD_ASPECT_RATIO / imageAspect;
  let w = crop.w;
  let h = crop.h;

  if (w / h > normalizedAspect) {
    h = w / normalizedAspect;
  } else {
    w = h * normalizedAspect;
  }

  if (w > 1) {
    w = 1;
    h = w / normalizedAspect;
  }
  if (h > 1) {
    h = 1;
    w = h * normalizedAspect;
  }

  const centerX = crop.x + crop.w / 2;
  const centerY = crop.y + crop.h / 2;
  const x = Math.max(0, Math.min(1 - w, centerX - w / 2));
  const y = Math.max(0, Math.min(1 - h, centerY - h / 2));

  return { x, y, w, h };
}

export function cropImageFromRect(img: HTMLImageElement, crop: CropRect): string {
  const iW = img.naturalWidth, iH = img.naturalHeight;
  const fittedCrop = fitCropRectToCardAspect(img, crop);
  const sx = fittedCrop.x * iW;
  const sy = fittedCrop.y * iH;
  const sw = Math.max(1, fittedCrop.w * iW);
  const sh = Math.max(1, fittedCrop.h * iH);
  const canvas = document.createElement('canvas');
  canvas.width = CARD_OUTPUT_WIDTH;
  canvas.height = CARD_OUTPUT_HEIGHT;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, CARD_OUTPUT_WIDTH, CARD_OUTPUT_HEIGHT);
  return canvas.toDataURL('image/jpeg', 0.92);
}
