/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Upload, AlertCircle, CheckCircle2, RefreshCcw, CopyPlus } from 'lucide-react';
import { Photocard } from '../types';
import { exportCollection, importCollection } from '../lib/backup';
import ModalShell from './ModalShell';

interface BackupControlsProps {
  photocards: Photocard[];
  onImport: (data: Photocard[], mode: 'replace' | 'merge') => void;
}

export default function BackupControls({ photocards, onImport }: BackupControlsProps) {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPendingData, setImportPendingData] = useState<Photocard[] | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      exportCollection(photocards);
      showStatus('success', 'Backup file downloaded successfully!');
    } catch (err) {
      showStatus('error', 'Failed to generate backup file.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await importCollection(file);
      setImportPendingData(data);
      setIsImportModalOpen(true);
    } catch (err) {
      showStatus('error', err instanceof Error ? err.message : 'Invalid file.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const showStatus = (type: 'success' | 'error', message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 3000);
  };

  const confirmImport = (mode: 'replace' | 'merge') => {
    if (importPendingData) {
      onImport(importPendingData, mode);
      showStatus('success', `Successfully ${mode === 'replace' ? 'restored' : 'merged'} ${importPendingData.length} photocards!`);
      setImportPendingData(null);
      setIsImportModalOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-8 rounded-[32px] border-2 border-white shadow-sm relative overflow-hidden">
        <h3 className="text-sm font-bold text-foreground mb-6 tracking-tight opacity-60">Backup & Restore</h3>
        
        <div className="flex gap-4">
          <button
            onClick={handleExport}
            className="flex-1 h-14 glass-card bg-primary/5 text-primary rounded-[24px] font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/5 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-white border-4"
          >
            <Download size={18} />
            Export Data
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 h-14 glass-card bg-secondary/5 text-secondary rounded-[24px] font-black uppercase tracking-widest text-xs shadow-lg shadow-secondary/5 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-white border-4"
          >
            <Upload size={18} />
            Import JSON
          </button>
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".json" 
          className="hidden" 
        />

        <AnimatePresence>
          {status && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`mt-4 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border-2 ${
                status.type === 'success' 
                  ? 'bg-green-50 text-green-600 border-green-100' 
                  : 'bg-red-50 text-red-600 border-red-100'
              }`}
            >
              {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {status.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isImportModalOpen && (
          <ModalShell
            title="Import Collection"
            subtitle={`${importPendingData?.length ?? 0} photocards found`}
            icon={<Upload size={19} />}
            onClose={() => { setIsImportModalOpen(false); setImportPendingData(null); }}
            maxWidth="md:max-w-sm"
            overlayClassName="bg-primary/10 backdrop-blur-md"
          >
            <div className="space-y-8 p-6 text-center md:p-8">
              <p className="text-sm font-medium text-foreground/50">
                We found <span className="font-black text-primary">{importPendingData?.length}</span> photocards. How should we process them?
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => confirmImport('merge')}
                  className="w-full py-5 bg-white text-foreground rounded-[24px] font-black uppercase text-xs tracking-widest shadow-lg hover:bg-secondary hover:text-white transition-all flex items-center justify-center gap-3"
                >
                  <CopyPlus size={18} />
                  Merge Collections
                </button>
                <button
                  onClick={() => confirmImport('replace')}
                  className="w-full py-5 bg-red-50 text-red-500 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-lg border-2 border-red-100 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3"
                >
                  <RefreshCcw size={18} />
                  Replace Existing
                </button>
                <button
                  onClick={() => { setIsImportModalOpen(false); setImportPendingData(null); }}
                  className="w-full py-4 text-foreground/40 font-black text-[10px] uppercase tracking-widest"
                >
                  Cancel
                </button>
              </div>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
}
