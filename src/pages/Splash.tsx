interface Props {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export default function Splash({ onGetStarted, onSignIn }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, hsl(330,80%,60%) 0%, hsl(280,50%,60%) 100%)' }}>

      {/* Dot pattern overlay */}
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      {/* Floating card shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
          { w: 80, h: 110, top: '8%', left: '5%', rotate: '-15deg', opacity: 0.12 },
          { w: 60, h: 85, top: '15%', right: '8%', rotate: '20deg', opacity: 0.10 },
          { w: 70, h: 98, bottom: '20%', left: '10%', rotate: '10deg', opacity: 0.10 },
          { w: 90, h: 126, bottom: '10%', right: '5%', rotate: '-8deg', opacity: 0.12 },
          { w: 55, h: 77, top: '45%', left: '3%', rotate: '25deg', opacity: 0.08 },
          { w: 65, h: 91, top: '35%', right: '3%', rotate: '-20deg', opacity: 0.08 },
        ].map((s, i) => (
          <div key={i} className="absolute rounded-2xl bg-white"
            style={{ width: s.w, height: s.h, top: s.top, left: s.left, right: s.right, bottom: s.bottom, transform: `rotate(${s.rotate})`, opacity: s.opacity }} />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-md">
        {/* Logo mark */}
        <div className="mb-6">
          <img src="/pocadex.png" alt="PocaDex" className="h-24 w-auto object-contain drop-shadow-2xl" />
        </div>

        {/* Brand name */}
        <h1 className="text-6xl font-black text-white uppercase tracking-tighter italic mb-3 drop-shadow-lg">
          PocaDex
        </h1>

        {/* Tagline */}
        <p className="text-xl text-white/90 font-semibold mb-2">
          Your K-pop photocard collection,<br />digitized.
        </p>
        <p className="text-sm text-white/70 font-medium mb-12 uppercase tracking-widest">
          Track · Wishlist · Collect
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full">
          <button onClick={onGetStarted}
            className="w-full py-4 rounded-2xl bg-white text-primary font-black text-lg uppercase tracking-tight shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-transform">
            Get Started →
          </button>
          <button onClick={onSignIn}
            className="w-full py-4 rounded-2xl bg-white/15 border-2 border-white/40 text-white font-bold text-base backdrop-blur-sm hover:bg-white/25 transition-colors">
            Already have an account? Sign In
          </button>
        </div>

        <p className="mt-10 text-xs text-white/50 font-medium">
          A fan-made app for photocard collectors 💗
        </p>
      </div>
    </div>
  );
}
