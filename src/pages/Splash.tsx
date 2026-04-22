import { Cloud, Heart, Sparkles, Star } from 'lucide-react';

interface Props {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export default function Splash({ onGetStarted, onSignIn }: Props) {
  const decorations = [
    { icon: Cloud, size: 82, className: 'top-[8%] left-[5%] rotate-[-8deg]' },
    { icon: Star, size: 54, className: 'top-[18%] right-[10%] rotate-[12deg]' },
    { icon: Heart, size: 22, className: 'top-[30%] right-[18%]' },
    { icon: Sparkles, size: 24, className: 'top-[16%] left-[22%]' },
    { icon: Cloud, size: 72, className: 'bottom-[20%] right-[8%]' },
    { icon: Star, size: 42, className: 'bottom-[13%] left-[10%] rotate-[-14deg]' },
    { icon: Heart, size: 18, className: 'bottom-[24%] left-[12%] rotate-[-12deg]' },
    { icon: Sparkles, size: 20, className: 'bottom-[28%] right-[24%]' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background: `
            radial-gradient(circle at 20% 18%, rgba(214, 192, 255, 0.6), transparent 24%),
            radial-gradient(circle at 78% 22%, rgba(176, 225, 255, 0.65), transparent 24%),
            radial-gradient(circle at 74% 72%, rgba(189, 243, 222, 0.58), transparent 24%),
            radial-gradient(circle at 18% 78%, rgba(255, 210, 231, 0.7), transparent 22%),
            linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.92))
          `,
        }}
      />

      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1.4px, transparent 1.4px)',
          backgroundSize: '26px 26px',
        }}
      />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-14 -left-12 h-44 w-44 rounded-full bg-white/90 blur-sm" />
        <div className="absolute top-[6%] right-[-3rem] h-32 w-40 rounded-full bg-white/95 blur-sm" />
        <div className="absolute bottom-[-4rem] left-[-2rem] h-48 w-52 rounded-full bg-white/95 blur-sm" />
        <div className="absolute bottom-[6%] right-[-2rem] h-40 w-48 rounded-full bg-white/95 blur-sm" />

        {decorations.map(({ icon: Icon, size, className }, index) => (
          <div
            key={index}
            className={`absolute text-white/95 drop-shadow-[0_8px_18px_rgba(255,180,224,0.45)] ${className}`}
          >
            <Icon
              size={size}
              strokeWidth={1.8}
              className="animate-[pulse_5s_ease-in-out_infinite]"
            />
          </div>
        ))}

        {[
          'top-[12%] left-[46%]',
          'top-[24%] left-[28%]',
          'top-[42%] right-[9%]',
          'bottom-[33%] left-[18%]',
          'bottom-[18%] right-[18%]',
        ].map((position, index) => (
          <div
            key={position}
            className={`absolute ${position} h-2.5 w-2.5 rounded-full bg-white/95 shadow-[0_0_18px_rgba(255,255,255,0.95)] ${index % 2 === 0 ? 'animate-pulse' : ''
              }`}
          />
        ))}
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
          <img
            src="/pocadex.png"
            alt="PocaDex"
            className="mb-5 h-auto w-[min(100%,26rem)] drop-shadow-[0_18px_30px_rgba(245,130,195,0.24)]"
          />

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#f5c6dd] bg-white/85 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#d85ea5] shadow-[0_12px_30px_rgba(255,182,217,0.16)] backdrop-blur-sm">
            <Sparkles size={14} strokeWidth={2.2} />
            Collect with a little sparkle
          </div>

          <p className="font-heading max-w-lg text-3xl font-black leading-[1.05] tracking-tight text-[#7f4b72] sm:text-[2.75rem]">
            Keep every photocard memory in one dreamy little binder.
          </p>

          <p className="mt-4 max-w-md text-base leading-7 text-[#9b6d8b] sm:text-lg">
            Organize your pulls, wishlist the cards you still need, and make your collection feel as cute as the shelves it lives on.
          </p>

          <div className="mt-8 flex w-full max-w-md flex-col gap-3">
            <button
              onClick={onGetStarted}
              className="w-full rounded-[1.65rem] border border-[#ef8fc3] bg-[linear-gradient(180deg,#ff9fd4_0%,#f36eb5_100%)] px-6 py-4 text-base font-black tracking-[0.08em] text-white shadow-[0_20px_45px_rgba(243,110,181,0.28)] transition-transform hover:scale-[1.01] active:scale-[0.985]"
            >
              Start Your Binder
            </button>
            <button
              onClick={onSignIn}
              className="w-full rounded-[1.65rem] border border-[#f4d8e8] bg-white/85 px-6 py-4 text-sm font-bold tracking-[0.06em] text-[#b85d92] shadow-[0_14px_30px_rgba(227,173,203,0.12)] backdrop-blur-sm transition-all hover:border-[#efb6d6] hover:bg-white"
            >
              I already have an account
            </button>
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.26em] text-[#c690b2]">
            Track · Wishlist · Collect
          </p>
        </div>
      </div>
    </div>
  );
}
