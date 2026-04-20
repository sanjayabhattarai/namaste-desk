"use client"

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSession, getSession, saveSession } from '@/lib/authSession';
import { supabase } from '@/lib/supabaseClient';

type AuthMode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getHotelApproval = async (ownerId: string) => {
    const { data, error } = await supabase
      .from('hotels')
      .select('is_approved')
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (error) {
      return { isApproved: false, error };
    }

    if (!data) {
      return { isApproved: false, error: null };
    }

    return { isApproved: Boolean(data.is_approved), error: null };
  };

  useEffect(() => {
    const session = getSession();

    if (!session) {
      return;
    }

    if (session.expiresAt && session.expiresAt * 1000 <= Date.now()) {
      clearSession();
      return;
    }

    if (session.isApproved) {
      router.replace('/dashboard');
      return;
    }

    router.replace('/pending-approval');
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('email rate limit exceeded')) {
          const fallbackLogin = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (fallbackLogin.data.session && fallbackLogin.data.user) {
            const approvalResult = await getHotelApproval(fallbackLogin.data.user.id);
            saveSession({
              accessToken: fallbackLogin.data.session.access_token,
              refreshToken: fallbackLogin.data.session.refresh_token,
              userId: fallbackLogin.data.user.id,
              email: fallbackLogin.data.user.email ?? email,
              expiresAt: fallbackLogin.data.session.expires_at ?? null,
              isApproved: approvalResult.isApproved,
            });
            router.replace(approvalResult.isApproved ? '/dashboard' : '/pending-approval');
            return;
          }

          setErrorMessage('Too many signup emails were sent. Please wait a few minutes, or use Login if your account was already created.');
          setIsLoading(false);
          return;
        }

        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        setErrorMessage('Account created, but user details were not returned. Please try logging in.');
        setMode('login');
        setPassword('');
        setIsLoading(false);
        return;
      }

      const { error: hotelInsertError } = await supabase
        .from('hotels')
        .insert({
          owner_id: data.user.id,
          is_approved: false,
        });

      if (hotelInsertError) {
        setErrorMessage(`Account created, but hotel profile setup failed: ${hotelInsertError.message}`);
        setMode('login');
        setPassword('');
        setIsLoading(false);
        return;
      }

      if (data.session && data.user) {
        saveSession({
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          userId: data.user.id,
          email: data.user.email ?? email,
          expiresAt: data.session.expires_at ?? null,
          isApproved: false,
        });
        router.replace('/pending-approval');
        return;
      }

      setSuccessMessage('Account created successfully. Please sign in.');
      setMode('login');
      setPassword('');
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      setErrorMessage(error?.message ?? 'Invalid login credentials.');
      setIsLoading(false);
      return;
    }

    const approvalResult = await getHotelApproval(data.user.id);

    if (approvalResult.error) {
      setErrorMessage(`Login succeeded, but approval check failed: ${approvalResult.error.message}`);
      setIsLoading(false);
      return;
    }

    if (!approvalResult.isApproved) {
      const { error: createHotelError } = await supabase
        .from('hotels')
        .insert({
          owner_id: data.user.id,
          is_approved: false,
        });

      if (createHotelError && !createHotelError.message.toLowerCase().includes('duplicate key')) {
        setErrorMessage(`Login succeeded, but hotel profile setup failed: ${createHotelError.message}`);
        setIsLoading(false);
        return;
      }
    }

    saveSession({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      userId: data.user.id,
      email: data.user.email ?? email,
      expiresAt: data.session.expires_at ?? null,
      isApproved: approvalResult.isApproved,
    });

    router.replace(approvalResult.isApproved ? '/dashboard' : '/pending-approval');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
        <h1 className="text-2xl font-black text-slate-800">Hotel Owner Access</h1>
        <p className="text-sm text-slate-500 mt-1">
          {mode === 'login'
            ? 'Sign in to continue to your dashboard.'
            : 'Create your owner account.'}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`rounded-lg py-2 text-sm font-bold transition-colors ${mode === 'login' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`rounded-lg py-2 text-sm font-bold transition-colors ${mode === 'signup' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none focus:border-emerald-500"
              placeholder="owner@hotel.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold text-slate-700 mb-1">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none focus:border-emerald-500"
              placeholder="••••••••"
            />
          </div>

          {errorMessage ? (
            <p className="text-sm font-bold text-rose-600">{errorMessage}</p>
          ) : null}

          {successMessage ? (
            <p className="text-sm font-bold text-emerald-700">{successMessage}</p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-emerald-700 text-white font-black hover:bg-emerald-800 disabled:opacity-60"
          >
            {isLoading
              ? mode === 'login'
                ? 'Signing in...'
                : 'Creating account...'
              : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
