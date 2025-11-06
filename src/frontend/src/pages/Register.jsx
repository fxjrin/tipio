import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, User, Link as LinkIcon } from 'lucide-react';
import { HttpAgent, Actor } from '@dfinity/agent';
import { idlFactory } from '../../../declarations/backend';

const BACKEND_CANISTER_ID = 'vtsa7-6qaaa-aaaah-arlkq-cai';

export default function Register() {
  const { identity, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState(null);
  const [anonymousBackend, setAnonymousBackend] = useState(null);

  // Create anonymous backend for query calls
  useEffect(() => {
    const agent = new HttpAgent({ host: 'https://icp0.io' });
    const actor = Actor.createActor(idlFactory, {
      agent,
      canisterId: BACKEND_CANISTER_ID,
    });
    setAnonymousBackend(actor);
  }, []);

  const checkAvailability = async (value) => {
    if (value.length < 3 || !anonymousBackend) {
      setAvailable(null);
      return;
    }

    setChecking(true);
    try {
      const isAvailable = await anonymousBackend.isUsernameAvailable(value);
      setAvailable(isAvailable);
    } catch (err) {
      console.error('Error checking availability:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(value);
    setError(null);

    // Debounce availability check
    if (value.length >= 3) {
      const timer = setTimeout(() => checkAvailability(value), 500);
      return () => clearTimeout(timer);
    } else {
      setAvailable(null);
    }
  };

  const handleRegister = async () => {
    // Validate synchronously first
    if (username.length < 3 || username.length > 20) {
      setError('Username must be 3-20 characters');
      return;
    }

    if (!available) {
      setError('Username is not available');
      return;
    }

    if (!identity.backendActor) {
      setError('Please login with Internet Identity first.');
      return;
    }

    setRegistering(true);
    setError(null);

    try {
      // Call backend with II identity
      const result = await identity.backendActor.registerUsername(username);

      if ('ok' in result) {
        await refreshProfile();
        navigate('/dashboard');
      } else {
        console.error('Registration failed:', result.err);
        setError(result.err);
      }
    } catch (err) {
      console.error('Error registering:', err);
      setError(err.message || 'Failed to register username. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--brand-yellow)] to-[var(--brand-orange)] mb-4 shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Welcome to Tipio
          </h1>
          <p className="text-muted-foreground text-base">
            Claim your unique username to start receiving tips
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
          <div className="space-y-6">
            {/* Preview Card */}
            <div className="bg-gradient-to-br from-[var(--brand-yellow)]/10 to-[var(--brand-orange)]/10 rounded-xl p-4 border border-[var(--brand-yellow)]/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--brand-yellow)] to-[var(--brand-orange)] flex items-center justify-center">
                  <LinkIcon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Your tip link will be:</p>
                  <p className="text-sm font-bold text-foreground truncate">
                    tipio.io/{username || 'yourname'}
                  </p>
                </div>
              </div>
            </div>

            {/* Username Input */}
            <div>
              <label htmlFor="username" className="block text-sm font-semibold mb-3 text-foreground">
                Choose Username
              </label>
              <div className="relative">
                <div className={`flex items-center border-2 rounded-xl overflow-hidden transition-all ${
                  checking ? 'border-muted' :
                  available === true ? 'border-green-500' :
                  available === false ? 'border-red-500' :
                  'border-border focus-within:border-[var(--brand-yellow)]'
                }`}>
                  <span className="px-4 py-3.5 bg-muted/50 text-muted-foreground text-sm font-medium">
                    @
                  </span>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={handleUsernameChange}
                    className="flex-1 px-4 py-3.5 bg-transparent outline-none text-foreground font-medium placeholder:text-muted-foreground"
                    placeholder="yourname"
                    minLength={3}
                    maxLength={20}
                    disabled={registering}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && available && !registering && !checking) {
                        handleRegister();
                      }
                    }}
                  />
                  <div className="px-4">
                    {checking && (
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    )}
                    {!checking && available === true && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {!checking && available === false && (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Helper Text */}
              <div className="mt-2 px-1">
                {available === false && (
                  <p className="text-sm text-red-600 font-medium">
                    Username already taken
                  </p>
                )}
                {available === true && (
                  <p className="text-sm text-green-600 font-medium">
                    Username available!
                  </p>
                )}
                {!available && !checking && (
                  <p className="text-xs text-muted-foreground">
                    3-20 characters • Letters, numbers, and underscores only
                  </p>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
              </div>
            )}

            {/* Register Button */}
            <Button
              type="button"
              onClick={handleRegister}
              className="w-full h-12 text-base font-bold bg-gradient-to-r from-[var(--brand-yellow)] to-[var(--brand-orange)] hover:opacity-90 rounded-xl shadow-lg transition-all"
              disabled={!available || registering || checking}
            >
              {registering ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Creating account...</span>
                </div>
              ) : (
                'Claim Username'
              )}
            </Button>
          </div>

          {/* Info Footer */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-center text-muted-foreground">
              Secured by Internet Computer
            </p>
          </div>
        </div>

        {/* Connected Info */}
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Connected as: <span className="font-mono">{identity.principal?.toString().slice(0, 10)}...</span>
          </p>
        </div>
      </div>
    </div>
  );
}
