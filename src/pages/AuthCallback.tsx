import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  useEffect(() => {
    const finishLogin = async () => {
      const code = new URL(window.location.href).searchParams.get('code');

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Failed to exchange auth code for session:', error);
          }
        } else {
          const { error } = await supabase.auth.getSession();
          if (error) {
            console.error('Failed to read auth session on callback:', error);
          }
        }
      } catch (error) {
        console.error('Unexpected auth callback error:', error);
      } finally {
        window.location.replace('/');
      }
    };

    void finishLogin();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      <p className="text-sm font-bold text-foreground/40 uppercase tracking-widest">Signing you in…</p>
    </div>
  );
}
