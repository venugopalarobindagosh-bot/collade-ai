import { useState, useEffect } from 'react';
import { useSearchParams, Navigate, useNavigate } from 'react-router-dom';
import { Compass, Loader2, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, isAuthenticated } from '@/lib/auth';

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const isApp = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true;
  const forceLoginOnly = isApp;

  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  const effectiveMode = forceLoginOnly ? 'signin' : mode;

  useEffect(() => {
    isAuthenticated().then(ok => {
      setAuthed(ok);
      setChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthed(true);
        setChecking(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
      </div>
    );
  }

  if (authed) {
    return <Navigate to={redirect} replace />;
  }

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle(redirect);
    } catch (e) {
      setError(e.message || 'Google sign-in failed');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');

    try {
      if (effectiveMode === 'signup') {
        await signUpWithEmail(email.trim(), password, fullName.trim());
      } else {
        await signInWithEmail(email.trim(), password);
      }

      // Give Supabase a moment to persist the session, then force-navigate
      // This avoids the "redirect back to landing" race condition
      await new Promise(r => setTimeout(r, 100));
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-yellow-400 flex items-center justify-center mx-auto mb-4">
            <Compass className="h-7 w-7 text-black" />
          </div>
          <h1 className="font-heading text-3xl font-bold mb-2">
            {effectiveMode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-white/50 text-sm">
            {forceLoginOnly
              ? 'Log in with the account you created on colladeai.com'
              : effectiveMode === 'signup'
                ? 'Sign up to explore careers, degrees, and your future'
                : 'Sign in to continue your career journey'}
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          {!forceLoginOnly && (
            <>
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white text-black py-3 rounded-xl font-semibold text-sm hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                Continue with Google
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10"/>
                <span className="text-xs text-white/30">or</span>
                <div className="flex-1 h-px bg-white/10"/>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {effectiveMode === 'signup' && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Full name"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={6}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-black py-3 rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : effectiveMode === 'signup' ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {!forceLoginOnly && (
            <div className="text-center pt-2">
              <button
                onClick={() => {
                  setMode(mode === 'signup' ? 'signin' : 'signup');
                  setError('');
                }}
                className="text-white/50 hover:text-white text-sm transition-colors"
              >
                {mode === 'signup'
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          )}

          {forceLoginOnly && (
            <div className="mt-4 p-3 bg-yellow-400/5 border border-yellow-400/20 rounded-xl">
              <p className="text-yellow-400/80 text-xs text-center leading-relaxed">
                Don't have an account yet?<br />
                Visit <span className="font-semibold">colladeai.com</span> to sign up.
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-white/30 mt-6">
          By signing in, you're agreeing to our{' '}
          <a href="/privacy" className="text-white/50 hover:text-white underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}