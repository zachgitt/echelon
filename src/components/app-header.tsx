'use client';

import { useState, useEffect } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

export function AppHeader() {
  const [organizationName, setOrganizationName] = useState<string>('Echelon');

  useEffect(() => {
    async function fetchOrganizationName() {
      try {
        const response = await fetch('/api/org-chart');
        if (response.ok) {
          const data = await response.json();
          setOrganizationName(data.organizationName || 'Echelon');
        }
      } catch (err) {
        console.error('Failed to fetch organization name:', err);
      }
    }

    fetchOrganizationName();
  }, []);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <span className="font-semibold">{organizationName}</span>
    </header>
  );
}
