import { Crown, Sparkles } from 'lucide-react';
import ModalShell from './ModalShell';

interface UpgradePromptProps {
  reason: string;
  onClose: () => void;
  onViewPro: () => void;
  title?: string;
}

export default function UpgradePrompt({
  reason,
  onClose,
  onViewPro,
  title = 'Upgrade to Pro',
}: UpgradePromptProps) {
  return (
    <ModalShell
      title={title}
      icon={<Crown size={19} />}
      onClose={onClose}
      maxWidth="md:max-w-md"
      overlayClassName="bg-primary/10 backdrop-blur-md"
      footer={(
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border-2 border-white bg-gray-50 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/45 transition-all hover:bg-white hover:text-foreground"
          >
            Maybe later
          </button>
          <button
            type="button"
            onClick={onViewPro}
            className="btn-primary-pink flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[10px] font-black uppercase tracking-widest"
          >
            <Sparkles size={14} />
            View Pro
          </button>
        </div>
      )}
    >
      <div className="space-y-4 p-6 md:p-7">
        <p className="text-sm font-bold leading-6 text-foreground/70">{reason}</p>
        <p className="rounded-3xl border-2 border-primary/10 bg-primary/5 p-5 text-sm font-semibold leading-6 text-foreground/60">
          Unlock unlimited cards, grid import, bulk edit, and more.
        </p>
      </div>
    </ModalShell>
  );
}
