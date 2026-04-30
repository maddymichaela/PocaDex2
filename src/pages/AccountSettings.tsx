import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Download, KeyRound, Mail, ShieldAlert, Unlink, UserRound, Upload } from 'lucide-react';
import ModalShell from '../components/ModalShell';
import { useAuth } from '../contexts/AuthContext';
import { exportCollection } from '../lib/backup';
import { supabase } from '../lib/supabase';
import { Photocard } from '../types';

interface AccountSettingsProps {
  photocards: Photocard[];
}

type Status = { type: 'success' | 'error'; message: string } | null;
type UsernameCheck = { state: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error'; message: string };

const inputClass = 'w-full rounded-2xl border-2 border-gray-100 bg-white px-4 py-3 text-sm font-semibold text-foreground outline-none transition-all placeholder:text-foreground/25 focus:border-primary/30';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getPasswordError(password: string) {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'Use at least one letter and one number.';
  return null;
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function formatDeletionDate(requestedAt?: string | null) {
  if (!requestedAt) return null;
  const date = new Date(requestedAt);
  date.setDate(date.getDate() + 30);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusMessage({ status }: { status: Status }) {
  if (!status) return null;
  const isSuccess = status.type === 'success';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className={`flex items-center gap-2 rounded-2xl border-2 px-4 py-3 text-xs font-bold ${
        isSuccess ? 'border-green-100 bg-green-50 text-green-600' : 'border-red-100 bg-red-50 text-red-600'
      }`}
    >
      {isSuccess ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {status.message}
    </motion.div>
  );
}

export default function AccountSettings({ photocards }: AccountSettingsProps) {
  const {
    user,
    profile,
    updateProfile,
    checkUsernameAvailability,
    updateEmail,
    updatePassword,
    unlinkGoogleAccount,
    requestAccountDeletion,
    cancelAccountDeletion,
  } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(profile?.nickname || profile?.username || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url ?? null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [email, setEmail] = useState(user?.email ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileStatus, setProfileStatus] = useState<Status>(null);
  const [securityStatus, setSecurityStatus] = useState<Status>(null);
  const [connectedStatus, setConnectedStatus] = useState<Status>(null);
  const [deletionStatus, setDeletionStatus] = useState<Status>(null);
  const [usernameCheck, setUsernameCheck] = useState<UsernameCheck>({ state: 'idle', message: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [settingGooglePassword, setSettingGooglePassword] = useState(false);
  const [unlinkingGoogle, setUnlinkingGoogle] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [googlePassword, setGooglePassword] = useState('');
  const [googlePasswordConfirm, setGooglePasswordConfirm] = useState('');
  const [passwordReadyOverride, setPasswordReadyOverride] = useState(false);
  const [accountProviders, setAccountProviders] = useState<string[]>([]);
  const [accountIdentityProviders, setAccountIdentityProviders] = useState<string[]>([]);
  const [accountPasswordSetAt, setAccountPasswordSetAt] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile?.nickname || profile?.username || '');
    setUsername(profile?.username || '');
    setAvatarPreview(profile?.avatar_url ?? null);
    setAvatarDataUrl(null);
  }, [profile]);

  useEffect(() => {
    setEmail(user?.email ?? '');
  }, [user?.email]);

  const currentUsername = normalizeUsername(profile?.username ?? '');
  const inputUsername = normalizeUsername(username);
  const isUsernameChanged = inputUsername !== currentUsername;

  useEffect(() => {
    let isCurrent = true;

    if (!user) {
      setAccountProviders([]);
      setAccountIdentityProviders([]);
      setAccountPasswordSetAt(null);
      return;
    }

    setAccountProviders((user.app_metadata?.providers as string[] | undefined) ?? []);
    setAccountIdentityProviders((user.identities ?? []).map((identity) => identity.provider));
    setAccountPasswordSetAt((user.user_metadata?.password_set_at as string | undefined) ?? null);

    async function refreshAccountLoginState() {
      const [{ data: userData }, identitiesResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.getUserIdentities(),
      ]);
      if (!isCurrent) return;

      const freshUser = userData.user;
      if (freshUser) {
        setAccountProviders((freshUser.app_metadata?.providers as string[] | undefined) ?? []);
        setAccountPasswordSetAt((freshUser.user_metadata?.password_set_at as string | undefined) ?? null);
      }
      if (identitiesResult.data?.identities) {
        setAccountIdentityProviders(identitiesResult.data.identities.map((identity) => identity.provider));
      }
    }

    refreshAccountLoginState().catch(() => {
      // The session user fallback above keeps the UI usable if the refresh fails.
    });

    return () => {
      isCurrent = false;
    };
  }, [profile?.has_password, user]);

  useEffect(() => {
    if (!inputUsername || !isUsernameChanged) {
      setUsernameCheck({ state: 'idle', message: '' });
      return;
    }
    if (!/^[a-z0-9_]{3,24}$/.test(inputUsername)) {
      setUsernameCheck({ state: 'invalid', message: 'Use 3-24 letters, numbers, or underscores.' });
      return;
    }

    let isCurrent = true;
    setUsernameCheck({ state: 'checking', message: 'Checking username...' });
    const timeout = window.setTimeout(async () => {
      const result = await checkUsernameAvailability(inputUsername);
      if (!isCurrent) return;
      if (result.error) {
        setUsernameCheck({ state: 'error', message: result.error });
      } else if (result.available) {
        setUsernameCheck({ state: 'available', message: 'Username is available' });
      } else {
        setUsernameCheck({ state: 'taken', message: 'Username is already taken' });
      }
    }, 350);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
    };
  }, [checkUsernameAvailability, inputUsername, isUsernameChanged]);

  const deletionDate = useMemo(() => formatDeletionDate(profile?.deletion_requested_at), [profile?.deletion_requested_at]);
  const avatarLetter = (displayName || username || 'You').charAt(0).toUpperCase();
  const providers = accountProviders;
  const identityProviders = accountIdentityProviders;
  const hasGoogleLogin = providers.includes('google') || identityProviders.includes('google');
  const hasPassword =
    passwordReadyOverride ||
    Boolean(profile?.has_password) ||
    providers.includes('email') ||
    identityProviders.includes('email') ||
    Boolean(accountPasswordSetAt) ||
    (profile?.has_password !== false && Boolean(user?.email));

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileStatus({ type: 'error', message: 'Please choose an image file.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setAvatarPreview(result);
        setAvatarDataUrl(result);
      }
    };
    reader.onerror = () => setProfileStatus({ type: 'error', message: 'Could not preview that image.' });
    reader.readAsDataURL(file);
  };

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setProfileStatus(null);
    if (isUsernameChanged && usernameCheck.state === 'checking') {
      setProfileStatus({ type: 'error', message: 'Please wait for the username check to finish.' });
      return;
    }
    if (isUsernameChanged && (usernameCheck.state === 'taken' || usernameCheck.state === 'invalid' || usernameCheck.state === 'error')) {
      setProfileStatus({ type: 'error', message: usernameCheck.message });
      return;
    }
    setSavingProfile(true);
    const { error } = await updateProfile({ nickname: displayName, username, avatarDataUrl });
    setSavingProfile(false);
    setProfileStatus(error ? { type: 'error', message: error } : { type: 'success', message: 'Profile updated.' });
  };

  const handleSecuritySubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSecurityStatus(null);
    if (!isValidEmail(email)) {
      setSecurityStatus({ type: 'error', message: 'Enter a valid email address.' });
      return;
    }
    const passwordError = newPassword ? getPasswordError(newPassword) : null;
    if (passwordError) {
      setSecurityStatus({ type: 'error', message: passwordError });
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setSecurityStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setSavingSecurity(true);
    if (email !== user?.email) {
      const { error } = await updateEmail(email);
      if (error) {
        setSecurityStatus({ type: 'error', message: error });
        setSavingSecurity(false);
        return;
      }
    }
    if (newPassword) {
      const { error } = await updatePassword(newPassword);
      if (error) {
        setSecurityStatus({ type: 'error', message: error });
        setSavingSecurity(false);
        return;
      }
    }
    setNewPassword('');
    setConfirmPassword('');
    setSavingSecurity(false);
    setSecurityStatus({ type: 'success', message: email !== user?.email ? 'Security updated. Check your email to confirm the address change.' : 'Security updated.' });
  };

  const handleSetPasswordForGoogle = async (event: FormEvent) => {
    event.preventDefault();
    setConnectedStatus(null);
    const passwordError = getPasswordError(googlePassword);
    if (passwordError) {
      setConnectedStatus({ type: 'error', message: passwordError });
      return;
    }
    if (googlePassword !== googlePasswordConfirm) {
      setConnectedStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setSettingGooglePassword(true);
    const { error } = await updatePassword(googlePassword);
    setSettingGooglePassword(false);
    if (error) {
      setConnectedStatus({ type: 'error', message: error });
      return;
    }
    setGooglePassword('');
    setGooglePasswordConfirm('');
    setPasswordReadyOverride(true);
    setAccountPasswordSetAt(new Date().toISOString());
    if (!accountProviders.includes('email')) setAccountProviders((current) => [...current, 'email']);
    setConnectedStatus({ type: 'success', message: 'Password set. Confirm to unlink Google.' });
    setShowUnlinkDialog(true);
  };

  const handleUnlinkGoogleClick = () => {
    setConnectedStatus(null);
    if (!hasPassword) {
      setConnectedStatus({ type: 'error', message: 'Set a password before unlinking your Google account.' });
      return;
    }
    setShowUnlinkDialog(true);
  };

  const handleUnlinkGoogle = async () => {
    if (!hasPassword) {
      setConnectedStatus({ type: 'error', message: 'Set a password before unlinking your Google account.' });
      setShowUnlinkDialog(false);
      return;
    }

    setUnlinkingGoogle(true);
    const { error } = await unlinkGoogleAccount();
    setUnlinkingGoogle(false);
    if (error) {
      setConnectedStatus({ type: 'error', message: error });
      return;
    }
    setShowUnlinkDialog(false);
    setConnectedStatus({ type: 'success', message: 'Google account unlinked. Use email and password to log in.' });
  };

  const handleExport = () => {
    exportCollection(photocards);
    setDeletionStatus({ type: 'success', message: 'Backup downloaded.' });
  };

  const handleRequestDeletion = async () => {
    const { error } = await requestAccountDeletion();
    if (error) {
      setDeletionStatus({ type: 'error', message: error });
      return;
    }
    setShowDeleteDialog(false);
    setDeleteConfirmed(false);
    setDeletionStatus({ type: 'success', message: 'Your account will be deleted in 30 days.' });
  };

  const handleCancelDeletion = async () => {
    const { error } = await cancelAccountDeletion();
    setDeletionStatus(error ? { type: 'error', message: error } : { type: 'success', message: 'Account deletion canceled. Your account is active.' });
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-16">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Account Settings</h1>
        <p className="text-sm font-medium text-foreground/45">Manage your profile, login details, and account status.</p>
      </div>

      {profile?.deletion_requested_at && (
        <div className="rounded-[28px] border-2 border-amber-100 bg-amber-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-amber-700">Your account will be deleted in 30 days.</p>
              <p className="mt-1 text-sm font-medium text-amber-700/70">Scheduled date: {deletionDate}. You can cancel anytime before then.</p>
            </div>
            <button
              type="button"
              onClick={handleCancelDeletion}
              className="rounded-2xl bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-amber-700 shadow-sm transition-all hover:bg-amber-100"
            >
              Restore Account
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleProfileSubmit} className="glass-card rounded-[32px] border-2 border-white p-5 shadow-sm md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UserRound size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight text-foreground">Profile</h2>
            <p className="text-xs font-bold text-foreground/35">Update your public details</p>
          </div>
        </div>

        <div className="flex flex-col gap-6 md:flex-row">
          <div className="flex shrink-0 flex-col items-center gap-3 md:w-40">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[28px] bg-primary/15 text-center text-3xl font-black leading-none text-primary ring-4 ring-white">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Profile preview" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="block leading-none">{avatarLetter}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-primary shadow-sm transition-all hover:bg-primary hover:text-white"
            >
              <Upload size={15} />
              Upload
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>

          <div className="grid flex-1 gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground/35">Display Name</span>
              <input className={inputClass} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground/35">Username</span>
              <input
                className={inputClass}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => setUsername((value) => value.trim().toLowerCase())}
                placeholder="username"
              />
              {usernameCheck.message && (
                <p className={`text-xs font-bold ${
                  usernameCheck.state === 'available'
                    ? 'text-green-600'
                    : usernameCheck.state === 'checking'
                      ? 'text-foreground/35'
                      : 'text-red-500'
                }`}>
                  {usernameCheck.message}
                </p>
              )}
            </label>
            <div className="md:col-span-2">
              <AnimatePresence><StatusMessage status={profileStatus} /></AnimatePresence>
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={savingProfile || (isUsernameChanged && (usernameCheck.state === 'checking' || usernameCheck.state === 'taken' || usernameCheck.state === 'invalid' || usernameCheck.state === 'error'))}
                className="w-full rounded-[22px] bg-primary px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] disabled:opacity-60 md:w-auto"
              >
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      </form>

      <form onSubmit={handleSecuritySubmit} className="glass-card rounded-[32px] border-2 border-white p-5 shadow-sm md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
            <KeyRound size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight text-foreground">Security</h2>
            <p className="text-xs font-bold text-foreground/35">Change your email or password</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/35">Email Address</span>
            <div className="relative">
              <Mail size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/25" />
              <input className={`${inputClass} pl-10`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </label>
          <label className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/35">New Password</span>
            <input className={inputClass} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Leave blank to keep current" />
          </label>
          <label className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/35">Confirm Password</span>
            <input className={inputClass} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
          </label>
          <div className="md:col-span-2">
            <AnimatePresence><StatusMessage status={securityStatus} /></AnimatePresence>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={savingSecurity}
              className="w-full rounded-[22px] bg-secondary px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-secondary/20 transition-all hover:scale-[1.01] disabled:opacity-60 md:w-auto"
            >
              {savingSecurity ? 'Saving...' : 'Save Security'}
            </button>
          </div>
        </div>
      </form>

      {hasGoogleLogin && (
        <section className="glass-card rounded-[32px] border-2 border-white p-5 shadow-sm md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Unlink size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight text-foreground">Connected Accounts</h2>
              <p className="text-xs font-bold text-foreground/35">Manage Google login</p>
            </div>
          </div>

          <div className="rounded-[24px] border-2 border-gray-100 bg-white p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-foreground">Google</p>
                <p className="mt-1 text-sm font-medium text-foreground/45">
                  {hasPassword
                    ? "You can unlink your Google account. You'll continue to log in using your email and password."
                    : 'Set a password before unlinking your Google account.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleUnlinkGoogleClick}
                className="rounded-[22px] bg-white px-5 py-4 text-xs font-black uppercase tracking-widest text-red-500 shadow-sm ring-2 ring-red-100 transition-all hover:bg-red-50"
              >
                Unlink Google
              </button>
            </div>

            {!hasPassword && (
              <form onSubmit={handleSetPasswordForGoogle} className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground/35">New Password</span>
                  <input
                    className={inputClass}
                    type="password"
                    value={googlePassword}
                    onChange={(e) => setGooglePassword(e.target.value)}
                    placeholder="Create a password"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground/35">Confirm Password</span>
                  <input
                    className={inputClass}
                    type="password"
                    value={googlePasswordConfirm}
                    onChange={(e) => setGooglePasswordConfirm(e.target.value)}
                    placeholder="Confirm password"
                  />
                </label>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={settingGooglePassword}
                    className="w-full rounded-[22px] bg-primary px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] disabled:opacity-60 md:w-auto"
                  >
                    {settingGooglePassword ? 'Saving...' : 'Set Password'}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-4">
              <AnimatePresence><StatusMessage status={connectedStatus} /></AnimatePresence>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-[32px] border-2 border-red-100 bg-red-50/70 p-5 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-red-500">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight text-red-700">Delete Account</h2>
              <p className="mt-1 text-sm font-medium text-red-700/65">Schedule account deletion with a 30-day grace period.</p>
            </div>
          </div>
          {profile?.deletion_requested_at ? (
            <button type="button" onClick={handleCancelDeletion} className="rounded-[22px] bg-white px-5 py-4 text-xs font-black uppercase tracking-widest text-red-500 shadow-sm transition-all hover:bg-red-100">
              Cancel Deletion
            </button>
          ) : (
            <button type="button" onClick={() => setShowDeleteDialog(true)} className="rounded-[22px] bg-red-500 px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-200 transition-all hover:scale-[1.01]">
              Delete Account
            </button>
          )}
        </div>
        <div className="mt-4">
          <AnimatePresence><StatusMessage status={deletionStatus} /></AnimatePresence>
        </div>
      </section>

      <AnimatePresence>
        {showDeleteDialog && (
          <ModalShell
            title="Delete Account"
            subtitle="30-day grace period"
            icon={<ShieldAlert size={19} />}
            onClose={() => setShowDeleteDialog(false)}
            maxWidth="md:max-w-lg"
            overlayClassName="bg-red-500/10 backdrop-blur-md"
          >
            <div className="space-y-5 p-6 md:p-8">
              <p className="text-sm font-medium leading-6 text-foreground/60">
                This starts a 30-day pending deletion period. Your account and collection are not deleted today, and you can log back in before the grace period ends to restore everything.
              </p>
              <div className="rounded-2xl border-2 border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-700">
                Export your data first so you have a copy of your collection.
              </div>
              <button
                type="button"
                onClick={handleExport}
                className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-white px-5 py-4 text-xs font-black uppercase tracking-widest text-primary shadow-sm transition-all hover:bg-primary hover:text-white"
              >
                <Download size={16} />
                Export JSON Backup
              </button>
              <label className="flex items-start gap-3 rounded-2xl bg-gray-50 p-4 text-sm font-semibold text-foreground/60">
                <input
                  type="checkbox"
                  checked={deleteConfirmed}
                  onChange={(e) => setDeleteConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-red-500"
                />
                I understand my account will be scheduled for deletion and can be restored within 30 days.
              </label>
              <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
                <button type="button" onClick={() => setShowDeleteDialog(false)} className="rounded-[22px] px-5 py-4 text-xs font-black uppercase tracking-widest text-foreground/40">
                  Keep Account
                </button>
                <button
                  type="button"
                  disabled={!deleteConfirmed}
                  onClick={handleRequestDeletion}
                  className="rounded-[22px] bg-red-500 px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-200 transition-all hover:scale-[1.01] disabled:opacity-50"
                >
                  Start 30-Day Deletion
                </button>
              </div>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUnlinkDialog && (
          <ModalShell
            title="Unlink Google"
            subtitle="Confirm login method"
            icon={<Unlink size={19} />}
            onClose={() => setShowUnlinkDialog(false)}
            maxWidth="md:max-w-md"
            overlayClassName="bg-red-500/10 backdrop-blur-md"
          >
            <div className="space-y-5 p-6 md:p-8">
              <p className="text-sm font-medium leading-6 text-foreground/60">
                After unlinking Google, you will need to log in with your email address and password.
              </p>
              <div className="rounded-2xl border-2 border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-700">
                Make sure you know your password before continuing.
              </div>
              <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
                <button
                  type="button"
                  onClick={() => setShowUnlinkDialog(false)}
                  className="rounded-[22px] px-5 py-4 text-xs font-black uppercase tracking-widest text-foreground/40"
                >
                  Keep Google
                </button>
                <button
                  type="button"
                  disabled={unlinkingGoogle}
                  onClick={handleUnlinkGoogle}
                  className="rounded-[22px] bg-red-500 px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-200 transition-all hover:scale-[1.01] disabled:opacity-50"
                >
                  {unlinkingGoogle ? 'Unlinking...' : 'Unlink Google'}
                </button>
              </div>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
}
