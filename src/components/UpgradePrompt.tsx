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
  title = 'You have reached the Free plan limit.',
}: UpgradePromptProps) {
  return (
    <ModalShell
      title={title}
      subtitle="Pro upgrade placeholder"
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
      <div className="space-y-5 p-6 md:p-8">
        <p className="text-sm font-semibold leading-6 text-foreground/60">
          {reason}
        </p>
        <div className="rounded-3xl border-2 border-primary/10 bg-primary/5 p-5">
          <p className="text-sm font-black text-foreground">
            Upgrade to Pro for unlimited cards, grid import, bulk edit, multiple binders, and more.
          </p>
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-primary/60">
            Payments coming soon
          </p>
        </div>
      </div>
    </ModalShell>
  );
}
