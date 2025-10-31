'use client';

import { useState, useEffect } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { User, LogOut, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function AppHeader() {
  const [organizationName, setOrganizationName] = useState<string>('Echelon');
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();

        // Fetch organization name
        const response = await fetch('/api/org-chart');
        if (response.ok) {
          const data = await response.json();
          setOrganizationName(data.organizationName || 'Echelon');
        }

        // Fetch user info
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || '');
          // Fetch employee name from database
          const empResponse = await fetch('/api/auth/me');
          if (empResponse.ok) {
            const empData = await empResponse.json();
            setUserName(empData.name || user.email?.split('@')[0] || 'User');
          } else {
            // If API fails, just use email prefix
            setUserName(user.email?.split('@')[0] || 'User');
          }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    }

    fetchData();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <span className="font-semibold">{organizationName}</span>

      <div className="ml-auto">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{userName || userEmail}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-3">
              <div>
                <p className="font-medium">{userName}</p>
                <p className="text-sm text-gray-500">{userEmail}</p>
              </div>
              <Separator />
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => router.push('/settings/organization')}
              >
                <Settings className="h-4 w-4" />
                Organization Settings
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
