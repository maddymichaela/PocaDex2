import { useState, FormEvent } from 'react';
import { Cloud, Heart, Sparkles, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Mode = 'signin' | 'signup';

interface Props {
  onBack: () => void;
}

export default function Login({ onBack }: Props) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const decorations = [
    { icon: Cloud, size: 76, className: 'top-[8%] left-[6%] rotate-[-8deg]' },
    { icon: Star, size: 50, className: 'top-[18%] right-[10%] rotate-[12deg]' },
    { icon: Heart, size: 22, className: 'top-[31%] right-[18%]' },
    { icon: Sparkles, size: 24, className: 'top-[16%] left-[22%]' },
    { icon: Cloud, size: 66, className: 'bottom-[18%] right-[8%]' },
    { icon: Star, size: 40, className: 'bottom-[13%] left-[10%] rotate-[-14deg]' },
    { icon: Heart, size: 18, className: 'bottom-[24%] left-[12%] rotate-[-12deg]' },
    { icon: Sparkles, size: 20, className: 'bottom-[28%] right-[24%]' },
  ];
  const [mode, setMode] = useState<Mode>('signin');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (mode === 'signup') {
      const { error } = await signUpWithEmail(email, password, nickname);
      if (error) setError(error);
      else setSignupSuccess(true);
    } else {
      const { error } = await signInWithEmail(email, password);
      if (error) setError(error);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    await signInWithGoogle();
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div className="dreamy-page-bg absolute inset-0 opacity-70" />
      <div className="dreamy-page-dots absolute inset-0 opacity-60" />

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
            className={`absolute ${position} h-2.5 w-2.5 rounded-full bg-white/95 shadow-[0_0_18px_rgba(255,255,255,0.95)] ${index % 2 === 0 ? 'animate-pulse' : ''}`}
          />
        ))}
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <button onClick={onBack} className="text-primary text-sm font-bold uppercase tracking-widest hover:underline mb-6 block mx-auto">
              ← PocaDex
            </button>
            <h1 className="text-4xl font-bold text-foreground tracking-tight">
              {mode === 'signin' ? 'Welcome back' : 'Join PocaDex'}
            </h1>
            <p className="text-sm text-foreground/50 font-medium mt-1">
              {mode === 'signin' ? 'Sign in to your collection' : 'Start tracking your photocards'}
            </p>
          </div>

          <div className="glass-card rounded-3xl p-8 shadow-lg border border-white/60">
            {signupSuccess ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-4">📬</div>
                <h2 className="text-lg font-bold text-foreground tracking-tight mb-2">Check your email!</h2>
                <p className="text-sm text-foreground/60">We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
                <button onClick={() => setSignupSuccess(false)}
                  className="mt-6 text-primary font-bold text-sm hover:underline">
                  Back to Sign In
                </button>
              </div>
            ) : (
              <>
                {/* Google */}
                <button onClick={handleGoogle} disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl border-2 border-gray-200 bg-white font-bold text-sm text-foreground hover:bg-gray-50 transition-colors disabled:opacity-60 shadow-sm">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-bold text-foreground/30 uppercase tracking-widest">or</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Email form */}
                <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
                  {mode === 'signup' && (
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-foreground/50 mb-1 block">Nickname</label>
                      <input
                        type="text" value={nickname} onChange={e => setNickname(e.target.value)}
                        placeholder="Your display name"
                        required={mode === 'signup'}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-white/80 text-sm font-medium text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-foreground/50 mb-1 block">Email</label>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com" required
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-white/80 text-sm font-medium text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-foreground/50 mb-1 block">Password</label>
                    <input
                      type="password" value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" required minLength={6}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-white/80 text-sm font-medium text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>

                  {error && (
                    <p className="text-xs font-bold text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
                  )}

                  <button type="submit" disabled={loading}
                    className="btn-primary-pink mt-1 w-full rounded-[1.65rem] py-3.5 text-sm font-black uppercase tracking-tight disabled:opacity-60">
                    {loading ? 'Loading…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
                  </button>
                </form>

                {/* Toggle */}
                <p className="text-center text-xs font-medium text-foreground/50 mt-5">
                  {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                  <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
                    className="text-primary font-bold hover:underline">
                    {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
