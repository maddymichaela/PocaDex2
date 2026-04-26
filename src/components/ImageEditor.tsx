/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';
import { Check, RotateCcw, Sun, Contrast, Droplets, ZoomIn, ZoomOut, RotateCw, Sparkles } from 'lucide-react';
import { getCroppedImg } from '../lib/imageUtils';
import ModalShell from './ModalShell';

interface ImageEditorProps {
  image: string;
  onSave: (croppedImage: string) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

export default function ImageEditor({ image, onSave, onCancel, aspectRatio = 1 / 1.5 }: ImageEditorProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [adjustments, setAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
  });

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    try {
      if (croppedAreaPixels) {
        const croppedImage = await getCroppedImg(
          image,
          croppedAreaPixels,
          rotation,
          { horizontal: false, vertical: false },
          adjustments
        );
        onSave(croppedImage);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const resetAll = () => {
    setAdjustments({ brightness: 100, contrast: 100, saturation: 100 });
    setZoom(1);
    setRotation(0);
    setCrop({ x: 0, y: 0 });
  };

  const rotate = () => setRotation((prev) => (prev + 90) % 360);

  return (
    <ModalShell
      title="Studio Editor"
      subtitle="Adjust & crop card memory"
      icon={<Sparkles className="h-5 w-5 animate-pulse" />}
      onClose={onCancel}
      maxWidth="md:max-w-5xl"
      overlayClassName="bg-black/80 backdrop-blur-sm"
      panelClassName="md:border-[8px] md:border-white"
      footer={(
        <div className="flex gap-3 md:gap-4">
          <button
            onClick={onCancel}
            className="flex-1 shrink-0 rounded-xl border-2 border-gray-50 bg-white py-3.5 text-[9px] font-black uppercase tracking-widest text-foreground/30 transition-all hover:bg-gray-50 hover:text-foreground md:rounded-2xl md:py-4 md:text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary-pink flex flex-[2] shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-white/20 py-3.5 text-[9px] font-black uppercase tracking-widest md:rounded-2xl md:py-4 md:text-xs"
          >
            <Check size={18} className="stroke-[3px]" />
            Polish Card
          </button>
        </div>
      )}
    >
          {/* 2-column on md+, stacked on mobile */}
          <div className="flex flex-col md:flex-row gap-5 p-5 md:gap-6 md:p-6 xl:gap-8 xl:p-8 md:items-start">

            {/* Left column: portrait crop + zoom */}
            <div className="md:w-[280px] xl:w-[320px] shrink-0 space-y-4">

              {/* Portrait crop area — aspect-[2/3] keeps it taller than wide */}
              <div className="relative overflow-hidden rounded-[28px] md:rounded-[40px] border border-gray-100 bg-gray-100 aspect-[2/3]">
                <div
                  className="absolute inset-0 z-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, #FF69B4 1px, transparent 0)`,
                    backgroundSize: '28px 28px',
                  }}
                />
                <div className="relative z-10 h-full w-full">
                  <Cropper
                    image={image}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={aspectRatio}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    onRotationChange={setRotation}
                    showGrid={true}
                    style={{
                      containerStyle: {
                        backgroundColor: '#f3f4f6',
                        filter: `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`,
                      },
                    }}
                  />
                </div>
              </div>

              {/* Zoom control */}
              <div className="rounded-[24px] border border-gray-100 bg-gray-50/70 px-4 py-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40">
                    <div className="flex items-center gap-1.5">
                      <ZoomIn size={13} />
                      <span>Zoom Scale</span>
                    </div>
                    <span className="text-primary bg-primary/5 px-2 py-0.5 rounded-full">{Math.round(zoom * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setZoom(Math.max(1, zoom - 0.2))} className="p-1 text-foreground/30 hover:text-primary transition-colors">
                      <ZoomOut size={15} />
                    </button>
                    <input
                      type="range"
                      value={zoom}
                      min={1}
                      max={4}
                      step={0.01}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full h-1.5 md:h-2 bg-gray-100 rounded-full appearance-none cursor-pointer accent-primary"
                    />
                    <button onClick={() => setZoom(Math.min(4, zoom + 0.2))} className="p-1 text-foreground/30 hover:text-primary transition-colors">
                      <ZoomIn size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: transform + adjustments + actions */}
            <div className="flex-1 space-y-4 md:space-y-5">

              {/* Transform */}
              <div className="rounded-[24px] md:rounded-[32px] border border-gray-100 bg-gray-50/70 p-4 md:p-5 space-y-3">
                <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40">
                  Transform
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={rotate}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border-2 border-white rounded-xl text-[9px] font-black uppercase tracking-widest text-foreground/60 hover:text-primary transition-all shadow-sm"
                  >
                    <RotateCw size={14} /> Rotate
                  </button>
                  <button
                    onClick={resetAll}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border-2 border-white rounded-xl text-[9px] font-black uppercase tracking-widest text-foreground/30 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"
                  >
                    <RotateCcw size={14} /> Reset
                  </button>
                </div>
              </div>

              {/* Adjustments */}
              <div className="rounded-[24px] md:rounded-[32px] border border-gray-100 bg-gray-50/70 p-4 md:p-5 space-y-4 md:space-y-5">
                <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40">
                  Adjustments
                </div>
                <div className="space-y-4">
                  {[
                    { id: 'brightness', label: 'Bright', icon: Sun, min: 50, max: 150 },
                    { id: 'contrast', label: 'Contrast', icon: Contrast, min: 50, max: 150 },
                    { id: 'saturation', label: 'Saturate', icon: Droplets, min: 0, max: 200 },
                  ].map((adj) => (
                    <div key={adj.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-widest text-foreground/30">
                        <div className="flex items-center gap-1.5">
                          <adj.icon size={11} />
                          <span>{adj.label}</span>
                        </div>
                        <span className="text-foreground/40">
                          {adjustments[adj.id as keyof typeof adjustments]}%
                        </span>
                      </div>
                      <input
                        type="range"
                        value={adjustments[adj.id as keyof typeof adjustments]}
                        min={adj.min}
                        max={adj.max}
                        step={1}
                        onChange={(e) => setAdjustments(prev => ({ ...prev, [adj.id]: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-white rounded-full appearance-none cursor-pointer accent-primary border border-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
    </ModalShell>
  );
}
