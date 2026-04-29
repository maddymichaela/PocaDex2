/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Cropper, { Point, Area } from 'react-easy-crop';
import {
  X,
  Sun,
  Contrast,
  Droplets,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Aperture,
  Moon,
  Palette,
  Focus,
} from 'lucide-react';
import { getCroppedImg, ImageAdjustments } from '../lib/imageUtils';

export interface ImageEditorState {
  crop: Point;
  zoom: number;
  rotation: number;
  croppedAreaPixels?: Area;
  hasUserPosition?: boolean;
  adjustments?: ImageAdjustments;
}

interface ImageEditorProps {
  image: string;
  onSave: (croppedImage: string, editorState?: ImageEditorState) => void;
  onCancel: (editorState?: ImageEditorState) => void;
  aspectRatio?: number;
  initialState?: ImageEditorState;
}

type AdjustmentId = keyof ImageAdjustments;
type EditorSnapshot = {
  crop: Point;
  zoom: number;
  rotation: number;
  adjustments: ImageAdjustments;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 20;
const ZOOM_STEP = 0.25;
const CARD_ASPECT_RATIO = 650 / 1000;
const CROP_GRID_SCALE = 0.78;
const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  highlights: 0,
  shadows: 0,
  tint: 0,
  sharpness: 0,
};

const adjustmentControls: Array<{
  id: AdjustmentId;
  label: string;
  icon: typeof Sun;
  min: number;
  max: number;
  defaultValue: number;
  format: (value: number) => string;
}> = [
  { id: 'brightness', label: 'Brightness', icon: Sun, min: 50, max: 150, defaultValue: 100, format: value => `${value}%` },
  { id: 'contrast', label: 'Contrast', icon: Contrast, min: 50, max: 150, defaultValue: 100, format: value => `${value}%` },
  { id: 'saturation', label: 'Saturation', icon: Droplets, min: 0, max: 200, defaultValue: 100, format: value => `${value}%` },
  { id: 'highlights', label: 'Highlights', icon: Aperture, min: -100, max: 100, defaultValue: 0, format: value => `${value > 0 ? '+' : ''}${value}` },
  { id: 'shadows', label: 'Shadows', icon: Moon, min: -100, max: 100, defaultValue: 0, format: value => `${value > 0 ? '+' : ''}${value}` },
  { id: 'tint', label: 'Tint', icon: Palette, min: -100, max: 100, defaultValue: 0, format: value => `${value > 0 ? '+' : ''}${value}` },
  { id: 'sharpness', label: 'Sharpness', icon: Focus, min: 0, max: 100, defaultValue: 0, format: value => `${value}` },
];

function getCropViewportSize() {
  if (typeof window === 'undefined') {
    return { width: 320, height: Math.round(320 / CARD_ASPECT_RATIO) };
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isMobile = viewportWidth <= 747;
  const reservedHeight = isMobile ? 250 : 220;
  const availableHeight = Math.max(320, viewportHeight - reservedHeight);
  const maxWidth = isMobile ? viewportWidth - 24 : 360;
  const width = Math.round(Math.min(maxWidth, availableHeight * CARD_ASPECT_RATIO));

  return { width, height: Math.round(width / CARD_ASPECT_RATIO) };
}

function getCropGridSize(viewportSize: { width: number; height: number }) {
  const width = Math.round(viewportSize.width * CROP_GRID_SCALE);
  return { width, height: Math.round(width / CARD_ASPECT_RATIO) };
}

export default function ImageEditor({ image, onSave, onCancel, aspectRatio = CARD_ASPECT_RATIO, initialState }: ImageEditorProps) {
  const [crop, setCrop] = useState<Point>(initialState?.crop ?? { x: 0, y: 0 });
  const [zoom, setZoom] = useState(initialState?.zoom ?? 1);
  const [rotation, setRotation] = useState(initialState?.rotation ?? 0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(initialState?.croppedAreaPixels ?? null);
  const [cropViewportSize, setCropViewportSize] = useState(getCropViewportSize);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    ...DEFAULT_ADJUSTMENTS,
    ...initialState?.adjustments,
  });
  const [activeAdjustment, setActiveAdjustment] = useState<AdjustmentId>('brightness');
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const cropSize = getCropGridSize(cropViewportSize);
  const cropRef = useRef(crop);
  const zoomRef = useRef(zoom);
  const rotationRef = useRef(rotation);
  const adjustmentsRef = useRef(adjustments);
  const undoStackRef = useRef<EditorSnapshot[]>([]);
  const redoStackRef = useRef<EditorSnapshot[]>([]);
  const croppedAreaPixelsRef = useRef<Area | null>(initialState?.croppedAreaPixels ?? null);

  useEffect(() => {
    const handleResize = () => setCropViewportSize(getCropViewportSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCropChange = useCallback((nextCrop: Point) => {
    cropRef.current = nextCrop;
    setCrop(nextCrop);
  }, []);

  const handleZoomChange = useCallback((nextZoom: number) => {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    zoomRef.current = clampedZoom;
    setZoom(clampedZoom);
  }, []);

  const handleRotationChange = useCallback((nextRotation: number) => {
    rotationRef.current = nextRotation;
    setRotation(nextRotation);
  }, []);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    croppedAreaPixelsRef.current = croppedAreaPixels;
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const syncHistoryState = useCallback(() => {
    setHistoryState({
      canUndo: undoStackRef.current.length > 0,
      canRedo: redoStackRef.current.length > 0,
    });
  }, []);

  const getSnapshot = useCallback((): EditorSnapshot => ({
    crop: { ...cropRef.current },
    zoom: zoomRef.current,
    rotation: rotationRef.current,
    adjustments: { ...adjustmentsRef.current },
  }), []);

  const snapshotsMatch = (a: EditorSnapshot, b: EditorSnapshot) => (
    a.crop.x === b.crop.x &&
    a.crop.y === b.crop.y &&
    a.zoom === b.zoom &&
    a.rotation === b.rotation &&
    Object.keys(DEFAULT_ADJUSTMENTS).every(key => (
      a.adjustments[key as AdjustmentId] === b.adjustments[key as AdjustmentId]
    ))
  );

  const rememberSnapshot = useCallback(() => {
    const snapshot = getSnapshot();
    const lastSnapshot = undoStackRef.current[undoStackRef.current.length - 1];
    if (!lastSnapshot || !snapshotsMatch(snapshot, lastSnapshot)) {
      undoStackRef.current = [...undoStackRef.current.slice(-24), snapshot];
      redoStackRef.current = [];
      syncHistoryState();
    }
  }, [getSnapshot, syncHistoryState]);

  const applySnapshot = useCallback((snapshot: EditorSnapshot) => {
    cropRef.current = snapshot.crop;
    zoomRef.current = snapshot.zoom;
    rotationRef.current = snapshot.rotation;
    adjustmentsRef.current = snapshot.adjustments;
    setCrop(snapshot.crop);
    setZoom(snapshot.zoom);
    setRotation(snapshot.rotation);
    setAdjustments(snapshot.adjustments);
  }, []);

  const undo = () => {
    const previous = undoStackRef.current.pop();
    if (!previous) return;
    redoStackRef.current.push(getSnapshot());
    applySnapshot(previous);
    syncHistoryState();
  };

  const redo = () => {
    const next = redoStackRef.current.pop();
    if (!next) return;
    undoStackRef.current.push(getSnapshot());
    applySnapshot(next);
    syncHistoryState();
  };

  const handleAdjustmentChange = useCallback((id: AdjustmentId, value: number) => {
    setAdjustments(prev => {
      const next = { ...prev, [id]: value };
      adjustmentsRef.current = next;
      return next;
    });
  }, []);

  const currentEditorState = (area = croppedAreaPixelsRef.current): ImageEditorState => ({
    crop: cropRef.current,
    zoom: zoomRef.current,
    rotation: rotationRef.current,
    hasUserPosition: true,
    adjustments: adjustmentsRef.current,
    ...(area ? { croppedAreaPixels: area } : {}),
  });

  const handleSave = async () => {
    try {
      const area = croppedAreaPixelsRef.current ?? croppedAreaPixels;
      if (area) {
        const croppedImage = await getCroppedImg(
          image,
          area,
          rotationRef.current,
          { horizontal: false, vertical: false },
          adjustmentsRef.current
        );
        onSave(croppedImage, currentEditorState(area));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancel = () => onCancel(currentEditorState());

  const resetAll = () => {
    rememberSnapshot();
    setAdjustments(DEFAULT_ADJUSTMENTS);
    adjustmentsRef.current = DEFAULT_ADJUSTMENTS;
    handleZoomChange(1);
    handleRotationChange(0);
    handleCropChange({ x: 0, y: 0 });
  };

  const resetCurrentAdjustment = () => {
    rememberSnapshot();
    const control = adjustmentControls.find(adj => adj.id === activeAdjustment);
    if (!control) return;
    handleAdjustmentChange(activeAdjustment, control.defaultValue);
  };

  const activeControl = adjustmentControls.find(adj => adj.id === activeAdjustment) ?? adjustmentControls[0];
  const activeValue = adjustments[activeAdjustment];
  const sliderLabel = activeControl.label;
  const sliderValueLabel = activeControl.format(activeValue);
  const previewFilter = [
    `brightness(${adjustments.brightness}%)`,
    `contrast(${adjustments.contrast}%)`,
    `saturate(${adjustments.saturation}%)`,
    `hue-rotate(${adjustments.tint * 0.25}deg)`,
  ].join(' ');

  const adjustmentSlider = (
    <div className="w-full max-w-[560px] px-5">
      <div className="mb-2 flex items-center justify-center gap-3 text-sm text-white/85">
        <span>{sliderLabel}</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-primary">
          {sliderValueLabel}
        </span>
        <button type="button" onClick={resetCurrentAdjustment} className="rounded-full px-2 py-1 text-xs font-semibold text-white/45 transition-colors hover:bg-white/10 hover:text-white">
          Reset
        </button>
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-px -translate-y-1/2 bg-white/40" />
        <div className="pointer-events-none absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between">
          {Array.from({ length: 9 }).map((_, index) => (
            <span key={index} className="h-1.5 w-px bg-white/20" />
          ))}
        </div>
        <input
          aria-label={sliderLabel}
          type="range"
          value={activeValue}
          min={activeControl.min}
          max={activeControl.max}
          step={1}
          onPointerDown={rememberSnapshot}
          onKeyDown={rememberSnapshot}
          onChange={(e) => {
            const nextValue = Number(e.target.value);
            handleAdjustmentChange(activeAdjustment, nextValue);
          }}
          className="relative z-10 h-2 w-full appearance-none rounded-full bg-white/20 accent-primary"
        />
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-[#09090d] text-white">
      <header className="flex h-14 shrink-0 items-center justify-between px-4 text-white/70">
        <div className="flex items-center gap-1">
          <button type="button" onClick={handleCancel} aria-label="Close editor" className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10">
            <X size={20} />
          </button>
          <button type="button" aria-label="Undo" onClick={undo} disabled={!historyState.canUndo} className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-25">
            <Undo2 size={19} />
          </button>
          <button type="button" aria-label="Redo" onClick={redo} disabled={!historyState.canRedo} className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-25">
            <Redo2 size={19} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={resetAll} className="rounded-full px-3 py-2 text-sm font-semibold transition-colors hover:bg-white/10">
            Revert
          </button>
          <button type="button" onClick={handleSave} className="rounded-full bg-primary px-4 py-2 text-sm font-black text-white shadow-lg shadow-primary/20">
            Save
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex min-h-full flex-col items-center justify-end gap-3 px-3 pb-[148px] pt-2 min-[748px]:justify-center min-[748px]:gap-5 min-[748px]:px-6 min-[748px]:pb-8">
          <div
            className="relative overflow-hidden rounded-[28px] bg-black shadow-2xl shadow-black/40 ring-1 ring-white/10 min-[748px]:rounded-[36px]"
            onPointerDown={rememberSnapshot}
            style={{
              width: Math.round(cropViewportSize.width),
              height: Math.round(cropViewportSize.height),
              maxWidth: Math.round(cropViewportSize.width),
            }}
          >
            <div className="relative h-full w-full" style={{ filter: previewFilter }}>
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspectRatio}
                cropSize={cropSize}
                initialCroppedAreaPixels={initialState?.hasUserPosition ? undefined : initialState?.croppedAreaPixels}
                onCropChange={handleCropChange}
                onCropComplete={onCropComplete}
                onCropAreaChange={onCropComplete}
                onZoomChange={handleZoomChange}
                onRotationChange={handleRotationChange}
                showGrid={true}
                style={{
                  containerStyle: {
                    backgroundColor: '#050507',
                  },
                }}
              />
            </div>
            <div className="absolute inset-x-5 bottom-3 flex items-center justify-center gap-2 opacity-70 transition-opacity hover:opacity-100">
              <button
                type="button"
                aria-label="Zoom out"
                onPointerDown={rememberSnapshot}
                onClick={() => handleZoomChange(zoomRef.current - ZOOM_STEP)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white drop-shadow-md transition-colors hover:bg-white/10"
              >
                <ZoomOut size={16} />
              </button>
              <input
                aria-label="Zoom"
                type="range"
                value={zoom}
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                onPointerDown={rememberSnapshot}
                onKeyDown={rememberSnapshot}
                onChange={(e) => handleZoomChange(Number(e.target.value))}
                className="h-1.5 w-32 appearance-none rounded-full bg-white/35 accent-primary"
              />
              <button
                type="button"
                aria-label="Zoom in"
                onPointerDown={rememberSnapshot}
                onClick={() => handleZoomChange(zoomRef.current + ZOOM_STEP)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white drop-shadow-md transition-colors hover:bg-white/10"
              >
                <ZoomIn size={16} />
              </button>
            </div>
          </div>

          <div className="hidden w-full max-w-[720px] flex-col items-center gap-4 min-[748px]:flex">
            {adjustmentSlider}
            <div className="flex w-full max-w-[620px] items-center justify-center gap-2 px-3">
              {adjustmentControls.map((adj) => (
                <button
                  key={adj.id}
                  type="button"
                  aria-label={adj.label}
                  onClick={() => {
                    setActiveAdjustment(adj.id);
                  }}
                  className={`flex h-11 w-11 items-center justify-center rounded-full transition-all ${activeAdjustment === adj.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-white/55 hover:bg-white/10 hover:text-white'}`}
                >
                  <adj.icon size={18} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-[260] border-t border-white/10 bg-[#0d0d13]/95 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 shadow-2xl shadow-black/40 backdrop-blur-xl min-[748px]:hidden">
        <div className="mx-auto max-w-sm space-y-3 px-4">
          {adjustmentSlider}
          <div className="grid grid-cols-7 items-center gap-1.5">
            {adjustmentControls.map((adj) => (
              <button
                key={adj.id}
                type="button"
                aria-label={adj.label}
                onClick={() => {
                  setActiveAdjustment(adj.id);
                }}
                className={`flex h-10 items-center justify-center rounded-full transition-all ${activeAdjustment === adj.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/45 hover:bg-white/10 hover:text-white'}`}
              >
                <adj.icon size={17} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
