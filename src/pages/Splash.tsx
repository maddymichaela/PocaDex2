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
        className="dreamy-page-bg absolute inset-0 opacity-70"
      />

      <div
        className="dreamy-page-dots absolute inset-0 opacity-60"
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

          <h1 className="max-w-lg text-[1.75rem] font-bold leading-[1.05] tracking-tight text-[#7f4b72] sm:text-[1.75rem]">
            Keep every photocard memory in one dreamy little binder.
          </h1>

          <p className="mt-4 max-w-md text-base leading-7 text-[#9b6d8b] sm:text-lg">
            Organize your pulls, wishlist the cards you still need, and make your collection feel as cute as the shelves it lives on.
          </p>

          <div className="mt-8 flex w-full max-w-md flex-col gap-3">
            <button
              onClick={onGetStarted}
              className="btn-primary-pink w-full rounded-[1.65rem] px-6 py-4 text-base font-black tracking-[0.08em]"
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
