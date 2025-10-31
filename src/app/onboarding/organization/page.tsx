'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function OrganizationOnboardingPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Fetch existing organization data
    async function fetchOrganization() {
      try {
        const response = await fetch('/api/organizations');
        if (response.ok) {
          const data = await response.json();
          if (data.organization) {
            setName(data.organization.name || '');
            setDescription(data.organization.description || '');
          }
        }
      } catch (error) {
        console.error('Error fetching organization:', error);
      } finally {
        setInitialLoading(false);
      }
    }

    fetchOrganization();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update organization');
        setLoading(false);
      } else {
        router.push('/onboarding/departments');
      }
    } catch (error) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-2xl space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div>
          <h2 className="text-center text-3xl font-bold">Set up your organization</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Step 1 of 4: Tell us about your company
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Organization Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1"
              placeholder="Acme Corporation"
            />
            <p className="mt-1 text-xs text-gray-500">
              The official name of your company or organization
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium">
              Description (Optional)
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              placeholder="A brief description of your organization..."
              rows={4}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}