import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  useEffect(() => {
    const code = new URL(window.location.href).searchParams.get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(() => {
        window.location.replace('/');
      });
    } else {
      // Implicit flow — session already processed by the SDK via the hash
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) window.location.replace('/');
        else window.location.replace('/');
      });
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      <p className="text-sm font-bold text-foreground/40 uppercase tracking-widest">Signing you in…</p>
    </div>
  );
}
