/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ImageAdjustments = {
  brightness: number;
  contrast: number;
  saturation: number;
  highlights: number;
  shadows: number;
  tint: number;
  sharpness: number;
};

const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  highlights: 0,
  shadows: 0,
  tint: 0,
  sharpness: 0,
};

export const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  flip = { horizontal: false, vertical: false },
  adjustments: Partial<ImageAdjustments> = DEFAULT_ADJUSTMENTS
): Promise<string> => {
  const normalizedAdjustments = { ...DEFAULT_ADJUSTMENTS, ...adjustments };
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return '';
  }

  const outputWidth = 650;
  const outputHeight = 1000;
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const normalizeCrop = (maxWidth: number, maxHeight: number) => {
    const left = Math.max(0, Math.min(pixelCrop.x, maxWidth - 1));
    const top = Math.max(0, Math.min(pixelCrop.y, maxHeight - 1));
    const right = Math.max(left + 1, Math.min(pixelCrop.x + pixelCrop.width, maxWidth));
    const bottom = Math.max(top + 1, Math.min(pixelCrop.y + pixelCrop.height, maxHeight));

    return {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    };
  };

  if (rotation % 360 === 0 && !flip.horizontal && !flip.vertical) {
    const safeCrop = normalizeCrop(sourceWidth, sourceHeight);
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      image,
      safeCrop.x,
      safeCrop.y,
      safeCrop.width,
      safeCrop.height,
      0,
      0,
      outputWidth,
      outputHeight
    );
    applyPixelAdjustments(ctx, outputWidth, outputHeight, normalizedAdjustments);
    return canvas.toDataURL('image/jpeg', 0.92);
  }

  const rotRad = (rotation * Math.PI) / 180;
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    sourceWidth,
    sourceHeight,
    rotation
  );
  const safeCrop = normalizeCrop(bBoxWidth, bBoxHeight);

  const rotatedCanvas = document.createElement('canvas');
  const rotatedCtx = rotatedCanvas.getContext('2d');

  if (!rotatedCtx) {
    return '';
  }

  // Set intermediate canvas size to match the rotated bounding box.
  rotatedCanvas.width = Math.ceil(bBoxWidth);
  rotatedCanvas.height = Math.ceil(bBoxHeight);

  rotatedCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
  rotatedCtx.rotate(rotRad);
  rotatedCtx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  rotatedCtx.translate(-sourceWidth / 2, -sourceHeight / 2);
  rotatedCtx.drawImage(image, 0, 0);

  canvas.width = outputWidth;
  canvas.height = outputHeight;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    rotatedCanvas,
    safeCrop.x,
    safeCrop.y,
    safeCrop.width,
    safeCrop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );
  applyPixelAdjustments(ctx, outputWidth, outputHeight, normalizedAdjustments);

  return canvas.toDataURL('image/jpeg', 0.92);
};

function applyPixelAdjustments(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  adjustments: ImageAdjustments
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;
  const brightness = adjustments.brightness / 100;
  const contrast = adjustments.contrast / 100;
  const saturation = adjustments.saturation / 100;
  const highlights = adjustments.highlights / 100;
  const shadows = adjustments.shadows / 100;
  const tint = adjustments.tint / 100;
  const sharpness = adjustments.sharpness / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] / 255;
    let g = data[i + 1] / 255;
    let b = data[i + 2] / 255;

    r *= brightness;
    g *= brightness;
    b *= brightness;

    r = (r - 0.5) * contrast + 0.5;
    g = (g - 0.5) * contrast + 0.5;
    b = (b - 0.5) * contrast + 0.5;

    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (luma > 0.55) {
      const amount = (luma - 0.55) / 0.45 * highlights * 0.35;
      r += amount;
      g += amount;
      b += amount;
    } else {
      const amount = (0.55 - luma) / 0.55 * shadows * 0.35;
      r += amount;
      g += amount;
      b += amount;
    }

    r = luma + (r - luma) * saturation;
    g = luma + (g - luma) * saturation;
    b = luma + (b - luma) * saturation;

    r += tint * 0.08;
    b -= tint * 0.08;

    const sharpenBoost = 1 + sharpness * 0.08;
    r = (r - luma) * sharpenBoost + luma;
    g = (g - luma) * sharpenBoost + luma;
    b = (b - luma) * sharpenBoost + luma;

    data[i] = clampChannel(r * 255);
    data[i + 1] = clampChannel(g * 255);
    data[i + 2] = clampChannel(b * 255);
  }

  ctx.putImageData(imageData, 0, 0);
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export const rotateSize = (width: number, height: number, rotation: number) => {
  const rotRad = (rotation * Math.PI) / 180;
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
};

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
