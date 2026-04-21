/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, RotateCcw, Sun, Contrast, Droplets, ZoomIn, ZoomOut, RotateCw, Sparkles } from 'lucide-react';
import { getCroppedImg } from '../lib/imageUtils';

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
    setAdjustments({
      brightness: 100,
      contrast: 100,
      saturation: 100,
    });
    setZoom(1);
    setRotation(0);
    setCrop({ x: 0, y: 0 });
  };

  const rotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] bg-black/95 flex flex-col items-center justify-center p-4 md:p-8"
    >
      <div className="w-full max-w-5xl bg-white rounded-[32px] md:rounded-[48px] overflow-hidden shadow-2xl flex flex-col h-full max-h-[96vh] md:max-h-[90vh] border-4 md:border-[12px] border-white">
        {/* Header */}
        <div className="px-5 md:px-8 py-3 md:py-5 flex justify-between items-center bg-white border-b border-gray-100 shrink-0">
           <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-12 md:h-12 bg-primary/10 rounded-xl md:rounded-2xl flex items-center justify-center text-primary shadow-inner border border-white">
              <Sparkles className="animate-pulse w-4.5 h-4.5 md:w-5.5 md:h-5.5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="font-black text-lg md:text-2xl text-foreground uppercase tracking-tight italic leading-none">Studio Editor</h3>
              <p className="hidden md:block text-[9px] font-bold text-foreground/30 uppercase tracking-widest">Adjust & Crop Card Memory</p>
            </div>
          </div>
          <button 
            onClick={onCancel} 
            className="p-2 md:p-3 bg-gray-50 hover:bg-white border-2 border-white hover:border-primary/20 rounded-xl md:rounded-2xl transition-all shadow-sm hover:shadow-md group"
          >
            <X className="text-foreground/30 group-hover:text-primary w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        <div className="flex-1 relative bg-gray-100 flex items-center justify-center overflow-hidden min-h-[300px] md:min-h-[400px]">
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, #FF69B4 1px, transparent 0)`, backgroundSize: '32px 32px' }} />
          
          <div className="w-full h-full relative z-10">
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
                }
              }}
            />
          </div>
        </div>

        {/* Controls Container - Scrollable part for secondary controls */}
        <div className="bg-white px-5 md:px-10 py-4 md:py-6 border-t border-gray-100 flex-1 overflow-y-auto">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Zoom and Transform */}
            <div className="flex-1 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40">
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <ZoomIn size={14} />
                    <span>Zoom Scale</span>
                  </div>
                  <span className="text-primary bg-primary/5 px-2 py-0.5 rounded-full">{Math.round(zoom * 100)}%</span>
                </div>
                <div className="flex items-center gap-3">
                   <button onClick={() => setZoom(Math.max(1, zoom - 0.2))} className="p-1 text-foreground/30 hover:text-primary transition-colors"><ZoomOut size={16}/></button>
                   <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={4}
                    step={0.01}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full h-1.5 md:h-2 bg-gray-100 rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <button onClick={() => setZoom(Math.min(4, zoom + 0.2))} className="p-1 text-foreground/30 hover:text-primary transition-colors"><ZoomIn size={16}/></button>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={rotate}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-50 border-2 border-white rounded-xl text-[9px] font-black uppercase tracking-widest text-foreground/60 hover:text-primary hover:bg-white transition-all shadow-sm"
                >
                  <RotateCw size={14} />
                  Rotate
                </button>
                <button 
                  onClick={resetAll}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-50 border-2 border-white rounded-xl text-[9px] font-black uppercase tracking-widest text-foreground/30 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"
                >
                  <RotateCcw size={14} />
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Adjustments & Actions - Always Visible */}
        <div className="bg-white px-5 md:px-10 pb-6 md:pb-8 pt-4 border-t border-gray-100 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] shrink-0 space-y-6">
          {/* Adjustments Row */}
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            {[
              { id: 'brightness', label: 'Bright', icon: Sun, min: 50, max: 150 },
              { id: 'contrast', label: 'Contrast', icon: Contrast, min: 50, max: 150 },
              { id: 'saturation', label: 'Saturate', icon: Droplets, min: 0, max: 200 },
            ].map((adj) => (
              <div key={adj.id} className="space-y-2">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-foreground/30">
                  <adj.icon size={11} />
                  <span className="hidden xs:inline">{adj.label}</span>
                </div>
                <input
                  type="range"
                  value={adjustments[adj.id as keyof typeof adjustments]}
                  min={adj.min}
                  max={adj.max}
                  step={1}
                  onChange={(e) => setAdjustments(prev => ({ ...prev, [adj.id]: Number(e.target.value) }))}
                  className="w-full h-1.5 bg-gray-50 rounded-full appearance-none cursor-pointer accent-primary border border-white"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3 md:gap-4">
            <button
              onClick={onCancel}
              className="flex-1 py-3.5 md:py-4 border-2 md:border-4 border-gray-50 bg-white text-foreground/30 rounded-xl md:rounded-[24px] font-black uppercase tracking-widest text-[9px] md:text-xs hover:bg-gray-50 hover:text-foreground transition-all shrink-0"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-[2] py-3.5 md:py-4 bg-primary text-white rounded-xl md:rounded-[24px] font-black uppercase tracking-widest text-[9px] md:text-xs flex items-center justify-center gap-2 md:gap-3 shadow-lg shadow-primary/30 hover:scale-[1.01] active:scale-[0.98] transition-all border-white/20 border-2 md:border-4 shrink-0"
            >
              <Check size={18} className="stroke-[3px]" />
              Polish Card
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
