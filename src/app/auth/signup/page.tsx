'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log('[Signup] Starting signup process for:', email);

      // Call our custom signup API (will implement in Phase 2)
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      console.log('[Signup] API response status:', response.status);
      console.log('[Signup] API response ok:', response.ok);

      const data = await response.json();
      console.log('[Signup] API response data:', data);

      if (!response.ok) {
        console.error('[Signup] API request failed:', data);
        setError(data.error || 'Signup failed');
        setLoading(false);
        return;
      }

      console.log('[Signup] Attempting auto-login...');
      // Auto-login after signup
      const supabase = createClient();
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (loginError) {
        console.error('[Signup] Auto-login failed:', loginError);
        setError(`Account created but login failed: ${loginError.message}. Please try signing in manually.`);
        setLoading(false);
        return;
      }

      console.log('[Signup] Auto-login successful:', loginData);
      console.log('[Signup] Requires onboarding:', data.requiresOnboarding);
      console.log('[Signup] Skip to employee step:', data.skipToEmployeeStep);

      // Check if onboarding is required
      if (data.requiresOnboarding) {
        // Second+ users skip to employee profile creation
        const path = data.skipToEmployeeStep ? '/onboarding/employee' : '/onboarding/organization';
        console.log('[Signup] Redirecting to:', path);
        router.push(path);
      } else {
        console.log('[Signup] Redirecting to /search');
        router.push('/search');
      }
      router.refresh();
    } catch (error) {
      console.error('[Signup] Unexpected error during signup:', error);
      setError(`Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div>
          <h2 className="text-center text-3xl font-bold">Create your account</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join your organization on Echelon
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Full Name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Work Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1"
              placeholder="you@company.com"
            />
            <p className="mt-1 text-xs text-gray-500">
              Use your company email address
            </p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1"
              placeholder="••••••••"
            />
            <p className="mt-1 text-xs text-gray-500">
              At least 6 characters
            </p>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating account...' : 'Sign up'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
