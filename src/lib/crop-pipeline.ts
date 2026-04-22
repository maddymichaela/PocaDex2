export type CropRect = { x: number; y: number; w: number; h: number };

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
  { name: '3×3', rows: 3, cols: 3, margin: { top: 0.02, bottom: 0.02, left: 0.02, right: 0.02 }, gap: { row: 0.012, col: 0.012 } },
  { name: '3×4', rows: 4, cols: 3, margin: { top: 0.015, bottom: 0.015, left: 0.015, right: 0.015 }, gap: { row: 0.01, col: 0.01 } },
  { name: '4×4', rows: 4, cols: 4, margin: { top: 0.015, bottom: 0.015, left: 0.015, right: 0.015 }, gap: { row: 0.01, col: 0.01 } },
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

export function detectTemplate(img: HTMLImageElement, whiteThr = 235, minBandFrac = 0.04): DetectResult | null {
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
    for (let y = 0; y < dH; y++) {
      let s = 0;
      for (let x = 0; x < dW; x++) {
        const i = (y * dW + x) * 4;
        s += (data[i] + data[i + 1] + data[i + 2]) / 3;
      }
      rowBr[y] = s / dW;
    }
    for (let x = 0; x < dW; x++) {
      let s = 0;
      for (let y = 0; y < dH; y++) {
        const i = (y * dW + x) * 4;
        s += (data[i] + data[i + 1] + data[i + 2]) / 3;
      }
      colBr[x] = s / dH;
    }

    function countBands(br: Float32Array, total: number): number {
      let count = 0, inContent = false;
      for (let i = 0; i < total; i++) {
        if (br[i] < whiteThr) {
          if (!inContent) { count++; inContent = true; }
        } else { inContent = false; }
      }
      return count;
    }

    function filterBands(br: Float32Array, total: number): Array<[number, number]> {
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

    const rawRows = countBands(rowBr, dH);
    const rawCols = countBands(colBr, dW);
    const detectedRows = Math.max(1, rawRows);
    const detectedCols = Math.max(1, rawCols);

    const template =
      PHOTOCARD_TEMPLATES.find(t => t.rows === detectedRows && t.cols === detectedCols) ??
      PHOTOCARD_TEMPLATES.find(t => t.rows === detectedRows || t.cols === detectedCols) ??
      PHOTOCARD_TEMPLATES[0];

    const rowBands = filterBands(rowBr, dH);
    const colBands = filterBands(colBr, dW);

    let cells: CropRect[][];
    if (rowBands.length > 0 && colBands.length > 0) {
      const PAD = 0.008;
      cells = rowBands.map(([rs, re]) =>
        colBands.map(([cs, ce]) => ({
          x: Math.max(0, cs / dW - PAD),
          y: Math.max(0, rs / dH - PAD),
          w: Math.min(1, (ce - cs) / dW + 2 * PAD),
          h: Math.min(1, (re - rs) / dH + 2 * PAD),
        }))
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
  threshold = 22,
  marginPx = 5,
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

export function cropImageFromRect(img: HTMLImageElement, crop: CropRect): string {
  const iW = img.naturalWidth, iH = img.naturalHeight;
  const sx = Math.round(crop.x * iW);
  const sy = Math.round(crop.y * iH);
  const sw = Math.max(1, Math.round(crop.w * iW));
  const sh = Math.max(1, Math.round(crop.h * iH));
  const canvas = document.createElement('canvas');
  canvas.width = sw; canvas.height = sh;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.toDataURL('image/jpeg', 0.92);
}
