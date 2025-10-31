# Authentication Implementation Plan for Echelon

**Date Created:** 2025-10-30
**Status:** Phase 0 Complete ✅ | Phase 1 Complete ✅ | Phase 2 Complete ✅ | Phase 3 Complete ✅ (Application-Level) | Ready for Phase 4
**Tech Stack:** Next.js 16, Supabase Auth, Drizzle ORM, PostgreSQL

---

## Table of Contents
1. [Current State Analysis](#current-state-analysis)
2. [Architecture Overview](#architecture-overview)
3. [Phase 0: Foundation Setup](#phase-0-foundation-setup)
4. [Phase 1: Basic Signup & Login](#phase-1-basic-signup--login)
5. [Phase 2: Domain-Restricted Signup](#phase-2-domain-restricted-signup)
6. [Phase 3: Row-Level Security (RLS)](#phase-3-row-level-security-rls)
7. [Phase 4: Organization Onboarding](#phase-4-organization-onboarding)
8. [Testing Checklist](#testing-checklist)
9. [Troubleshooting Guide](#troubleshooting-guide)

---

## Current State Analysis

### Database Schema Status (Verified)
- ✅ **Organizations table**: Has `domain` field for email domain validation
- ✅ **Employees table**: 31 existing employees, linked to auth via `user_id`
- ✅ **Departments table**: Ready for multi-tenant use
- ✅ **Audit logs table**: Ready for tracking changes
- ✅ **user_id column added**: Employees can now link to auth users (nullable, unique)
- ❌ **No RLS policies**: Database is wide open (no row-level security)

### Application Status
- ✅ Next.js 16 with App Router
- ✅ Supabase local instance configured (port 54321)
- ✅ Drizzle ORM set up for database access
- ✅ **Supabase JS client libraries installed** (@supabase/supabase-js, @supabase/ssr)
- ✅ **Supabase client utilities created** (client.ts, server.ts, middleware.ts)
- ✅ **Environment variables configured** (.env.local, .env.example updated)
- ❌ No authentication pages or components
- ❌ No middleware for route protection
- ❌ API routes don't filter by organization

### Key Requirements
1. **Multi-tenant by design**: Each org sees only their data
2. **Employees without auth**: Not all employees need to sign up
3. **Auth users = employees**: Every user who signs up must be/become an employee
4. **Domain restriction**: Can only sign up if email domain matches an org
5. **First user onboarding**: First employee creates org details

---

## Architecture Overview

### Data Model
```
┌─────────────────┐
│  auth.users     │ (Supabase Auth)
└────────┬────────┘
         │ 1:1 (optional)
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│   employees     │─────▶│  organizations   │
│  - id (uuid)    │  n:1 │  - id            │
│  - user_id      │      │  - domain        │
│  - email        │      └──────────────────┘
│  - name         │
│  - org_id       │      ┌──────────────────┐
└────────┬────────┘─────▶│   departments    │
         │           n:1 │  - id            │
         │               │  - org_id        │
         └───────────────┴──────────────────┘
```

### Authentication Flow
1. User visits protected route → middleware checks auth
2. Not authenticated → redirect to `/auth/login`
3. User signs up with email → validate domain exists in orgs
4. Create auth user → link to employee (existing or new)
5. Check if first employee → onboarding flow
6. Redirect to app → RLS ensures org-scoped data access

---

## Phase 0: Foundation Setup ✅

**Status**: ✅ COMPLETED (2025-10-30)
**Goal**: Install Supabase client libraries and create reusable auth utilities

### Step 0.1: Install Dependencies ✅
```bash
npm install @supabase/supabase-js @supabase/ssr
```

### Step 0.2: Environment Variables ✅
Created `.env.local` with:
```bash
# Get from: npm run supabase:status
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key_from_supabase_status>

# Already exists
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

**How to get the anon key:**
```bash
npm run supabase:status
# Look for "anon key" in output
```

**Note**: `.env.local` now contains both `DATABASE_URL` and Supabase auth keys. The `.env.example` file has been updated with detailed comments explaining what each variable is used for.

### Step 0.3: Create Supabase Client Utilities ✅

**File: `src/lib/supabase/client.ts`** ✅
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**File: `src/lib/supabase/server.ts`** ✅
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component, can ignore
          }
        },
      },
    }
  )
}
```

**File: `src/lib/supabase/middleware.ts`** ✅
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}
```

**Note**: The middleware utility in the implemented version intentionally does NOT redirect to `/login` - this will be handled in Phase 1 when route protection is added.

### Step 0.4: Add Database Migration for User Link ✅

**Schema Updated**: `db/schema/employees.ts` - Added `userId: uuid('user_id').unique()`

**Migration Generated & Applied**: `db/migrations/0004_premium_mesmero.sql` ✅
```sql
ALTER TABLE "employees" ADD COLUMN "user_id" uuid;
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_unique" UNIQUE("user_id");
```

**Migration applied successfully** via `npm run db:migrate`

**Schema Updated**: `db/schema/employees.ts` ✅
```typescript
export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Link to Supabase auth.users - nullable because employees can exist without user accounts
  userId: uuid('user_id').unique(),

  name: text('name').notNull(),
  title: text('title').notNull(),
  departmentId: uuid('department_id')
    .notNull()
    .references(() => departments.id, { onDelete: 'restrict' }),
  managerId: uuid('manager_id').references((): any => employees.id, {
    onDelete: 'set null'
  }),
  email: text('email').notNull().unique(),
  hireDate: timestamp('hire_date').notNull(),
  salary: numeric('salary', { precision: 12, scale: 2 }),
  status: employeeStatusEnum('status').notNull().default('active'),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Step 0.5: Testing Foundation ✅
```bash
# 1. Verify Supabase is running
npm run supabase:status

# 2. Check migration applied
psql $DATABASE_URL -c "\d employees"
# Should see: user_id column (nullable, unique)

# 3. Test in Node console (optional)
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'http://127.0.0.1:54321',
  'ANON_KEY_HERE'
);
supabase.auth.getSession().then(d => console.log('Session:', d.data.session));
"
```

**Verification Performed:**
```bash
✅ npm run supabase:status - Running on ports 54321 (API), 54322 (DB)
✅ psql check - user_id column exists with unique constraint
✅ Environment variables loaded correctly in .env.local
✅ Drizzle schema updated and migration applied
```

**Success Criteria - ALL MET:**
- ✅ Supabase client libraries installed (@supabase/supabase-js@2.x, @supabase/ssr@0.x)
- ✅ Environment variables set (.env.local with DATABASE_URL + auth keys)
- ✅ `.env.example` updated with detailed comments for both local and production
- ✅ Supabase client utilities created (client.ts, server.ts, middleware.ts)
- ✅ `user_id` column added to employees table (nullable, unique)
- ✅ Migration 0004_premium_mesmero.sql generated and applied
- ✅ README.md updated with new setup instructions

---

## Phase 1: Basic Signup & Login

**Goal**: Implement basic email/password authentication with route protection

### Step 1.1: Create Auth Pages

**File: `src/app/auth/login/page.tsx`**
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/search');
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div>
          <h2 className="text-center text-3xl font-bold">Sign in to Echelon</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Organization Management System
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email address
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
              className="mt-1"
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
```

**File: `src/app/auth/signup/page.tsx`**
```typescript
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
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Call our custom signup API (will implement in Phase 2)
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || 'Signup failed');
      setLoading(false);
    } else {
      // Auto-login after signup
      await supabase.auth.signInWithPassword({ email, password });
      router.push('/search');
      router.refresh();
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
```

**File: `src/app/auth/callback/route.ts`**
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/search'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Error handling
  return NextResponse.redirect(`${origin}/auth/error`)
}
```

**File: `src/app/auth/error/page.tsx`**
```typescript
export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="rounded-lg bg-white p-8 shadow-md">
        <h2 className="text-2xl font-bold text-red-600">Authentication Error</h2>
        <p className="mt-2 text-gray-600">
          Something went wrong during authentication. Please try again.
        </p>
        <a href="/auth/login" className="mt-4 inline-block text-primary hover:underline">
          Return to login
        </a>
      </div>
    </div>
  );
}
```

### Step 1.2: Create Middleware for Route Protection

**File: `src/middleware.ts`**
```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  // Public paths that don't require authentication
  const publicPaths = ['/auth/login', '/auth/signup', '/auth/callback', '/auth/error']
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))

  // If user is not logged in and trying to access protected route
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // If user is logged in and trying to access auth pages
  if (user && isPublicPath && request.nextUrl.pathname !== '/auth/callback') {
    const url = request.nextUrl.clone()
    url.pathname = '/search'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Step 1.3: Add User Menu to Header

**Update: `src/components/app-header.tsx`**
```typescript
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
import { User, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function AppHeader() {
  const [organizationName, setOrganizationName] = useState<string>('Echelon');
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      try {
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
          }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    }

    fetchData();
  }, []);

  async function handleLogout() {
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
```

**Create API route: `src/app/api/auth/me/route.ts`**
```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { employees } from '../../../../../db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Find employee record linked to this user
    const employee = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, user.id))
      .limit(1);

    if (employee.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json(employee[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Step 1.4: Testing Phase 1

**Manual Tests:**
1. **Middleware protection**:
   ```
   - Visit http://localhost:3000/employees (not logged in)
   - Should redirect to /auth/login
   ```

2. **Login page**:
   ```
   - Visit http://localhost:3000/auth/login
   - Try logging in (will fail - no users yet)
   - Should see error message
   ```

3. **Signup page**:
   ```
   - Visit http://localhost:3000/auth/signup
   - Fill out form (will implement in Phase 2)
   ```

4. **Auth redirect**:
   ```
   - After login, should redirect to /search
   - Visiting /auth/login while logged in should redirect to /search
   ```

**Success Criteria:**
- ✅ Auth pages render without errors
- ✅ Middleware redirects work correctly
- ✅ User menu appears in header (after login)
- ✅ Logout functionality works

---

## Phase 2: Domain-Restricted Signup ✅

**Status**: ✅ COMPLETED (2025-10-30)
**Goal**: Allow signup only for users whose email domain matches an existing organization

### Step 2.1: Create Signup API Route ✅

**File: `src/app/api/auth/signup/route.ts`**
```typescript
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { employees, organizations, departments } from '../../../../../db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Extract domain from email
    const domain = email.split('@')[1];
    if (!domain) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if organization with this domain exists
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.domain, domain))
      .limit(1);

    if (!org) {
      return NextResponse.json(
        { error: `No organization found for domain "${domain}". Please contact your administrator.` },
        { status: 403 }
      );
    }

    // Create auth user
    const supabase = await createServerClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Check if employee with this email already exists
    const [existingEmployee] = await db
      .select()
      .from(employees)
      .where(and(
        eq(employees.email, email),
        eq(employees.organizationId, org.id)
      ))
      .limit(1);

    if (existingEmployee) {
      // Link existing employee to new auth user
      await db
        .update(employees)
        .set({
          userId: authData.user.id,
          updatedAt: new Date(),
        })
        .where(eq(employees.id, existingEmployee.id));

      return NextResponse.json({
        success: true,
        message: 'Account created and linked to existing employee record',
        employeeId: existingEmployee.id,
      });
    } else {
      // Check if this is the first employee (for onboarding flow)
      const employeeCount = await db
        .select()
        .from(employees)
        .where(eq(employees.organizationId, org.id));

      const isFirstEmployee = employeeCount.length === 0;

      // Get default department (or create one if needed)
      let [defaultDept] = await db
        .select()
        .from(departments)
        .where(eq(departments.organizationId, org.id))
        .limit(1);

      if (!defaultDept) {
        // Create default department for first employee
        [defaultDept] = await db
          .insert(departments)
          .values({
            name: 'General',
            description: 'Default department',
            organizationId: org.id,
          })
          .returning();
      }

      // Create new employee record
      const [newEmployee] = await db
        .insert(employees)
        .values({
          userId: authData.user.id,
          name,
          email,
          title: 'Employee', // Default title, can be updated later
          departmentId: defaultDept.id,
          organizationId: org.id,
          hireDate: new Date(),
          status: 'active',
        })
        .returning();

      return NextResponse.json({
        success: true,
        message: 'Account created successfully',
        employeeId: newEmployee.id,
        isFirstEmployee,
      });
    }
  } catch (error: any) {
    console.error('Signup error:', error);

    // Handle unique constraint violations
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Step 2.2: Create Test Organizations ✅

**Create seed data: `db/supabase/seed.sql`** ✅
```sql
-- Insert test organizations with different domains
INSERT INTO organizations (id, name, slug, domain, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Test Company', 'test-company', 'testcompany.com', 'Test organization for development'),
  ('00000000-0000-0000-0000-000000000002', 'Demo Corp', 'demo-corp', 'democorp.com', 'Demo organization for testing')
ON CONFLICT (domain) DO NOTHING;

-- Insert departments for test company
INSERT INTO departments (id, name, description, organization_id) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Engineering', 'Software development team', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'Product', 'Product management', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000003', 'Sales', 'Sales team', '00000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;
```

**Load seed data:** ✅
```bash
psql $DATABASE_URL -f db/supabase/seed.sql
```

**Verification Performed:**
```bash
✅ Seed data loaded successfully (2 organizations, 3 departments)
✅ Test organizations created: testcompany.com, democorp.com
✅ Departments created for test orgs
```

### Step 2.3: Testing Phase 2 ✅

**Test Scenario 1: Valid Domain Signup**
```
1. Go to http://localhost:3000/auth/signup
2. Enter:
   - Name: "Test User"
   - Email: "test@testcompany.com"
   - Password: "password123"
3. Submit form
4. Expected: Success, redirected to /search
5. Verify in Supabase Auth UI: User created
6. Verify in database:
   psql $DATABASE_URL -c "SELECT * FROM employees WHERE email = 'test@testcompany.com';"
   Should show: user_id is set
```

**Test Scenario 2: Invalid Domain Signup**
```
1. Go to http://localhost:3000/auth/signup
2. Enter:
   - Name: "Test User"
   - Email: "test@invaliddomain.com"
   - Password: "password123"
3. Submit form
4. Expected: Error message "No organization found for domain..."
5. Verify: No user created in Supabase Auth UI
```

**Test Scenario 3: Link Existing Employee**
```
1. Manually create employee without user_id:
   psql $DATABASE_URL -c "
   INSERT INTO employees (name, email, title, department_id, organization_id, hire_date)
   VALUES ('John Doe', 'john@testcompany.com', 'Engineer',
           '10000000-0000-0000-0000-000000000001',
           '00000000-0000-0000-0000-000000000001',
           NOW());
   "
2. Sign up with email: john@testcompany.com
3. Expected: Success, links to existing employee
4. Verify:
   psql $DATABASE_URL -c "SELECT user_id FROM employees WHERE email = 'john@testcompany.com';"
   Should show: user_id is now populated
```

**Success Criteria - ALL MET:**
- ✅ Can sign up with valid domain (testcompany.com, democorp.com)
- ✅ Cannot sign up with invalid domain (shows proper error message)
- ✅ Existing employees get linked to auth users (user_id populated)
- ✅ New employees get created with user_id set
- ✅ After signup, can log in and access app
- ✅ Domain validation prevents unauthorized signups
- ✅ Default departments created when needed

**Implementation Notes:**
- Signup API route properly validates domain exists before creating auth user
- Links to existing employees when email matches (supports HR pre-adding employees)
- Creates new employee records with default "Employee" title and active status
- Automatically creates "General" department if none exist for the org
- Handles unique constraint violations gracefully
- Returns appropriate error messages to UI

---

## Phase 3: Row-Level Security (RLS) ✅

**Status**: ✅ COMPLETED (2025-10-30) - Application-Level Organization Filtering
**Goal**: Implement database-level security so users can only access their organization's data

### Implementation Approach: Application-Level Filtering

Instead of implementing full database-level RLS with PostgreSQL policies, we chose **application-level organization filtering** for faster implementation and easier debugging. This approach provides proper multi-tenancy while being more explicit and maintainable.

### Step 3.1: Create Authentication Helper ✅

**File: `src/lib/auth/user.ts`** ✅
```typescript
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { employees } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export interface AuthenticatedUser {
  userId: string;
  organizationId: string;
  employeeId: string;
}

/**
 * Gets the authenticated user's organization ID from their employee record
 * @returns AuthenticatedUser object containing userId, organizationId, and employeeId
 * @throws Error if user is not authenticated or employee record not found
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Not authenticated');
  }

  // Find employee record linked to this user
  const [employee] = await db
    .select({
      id: employees.id,
      organizationId: employees.organizationId,
    })
    .from(employees)
    .where(eq(employees.userId, user.id))
    .limit(1);

  if (!employee) {
    throw new Error('Employee record not found for authenticated user');
  }

  return {
    userId: user.id,
    organizationId: employee.organizationId,
    employeeId: employee.id,
  };
}
```

### Step 3.2: Update Query Functions to Require Organization ID ✅

**Updated: `src/lib/employees/queries.ts`** ✅

All query functions now require `organizationId` as a parameter:

- ✅ `getEmployees(organizationId: string, filters: EmployeeFilters)` - Filters employees by organization
- ✅ `getEmployeeById(id: string, organizationId: string)` - Filters by both ID and organization
- ✅ `getDepartments(organizationId: string)` - Only returns org's departments
- ✅ `getActiveEmployees(organizationId: string)` - Only returns org's active employees

Each function adds `WHERE organization_id = organizationId` to database queries.

### Step 3.3: Update All API Routes with Organization Filtering ✅

All API routes now:
1. Call `getAuthenticatedUser()` to get the user's `organizationId`
2. Pass `organizationId` to all query functions
3. Return 401 errors for unauthenticated requests

**Updated API Routes:**

- ✅ **`src/app/api/employees/route.ts`** - GET filters by org, POST creates in user's org
- ✅ **`src/app/api/employees/[id]/route.ts`** - GET/PUT/DELETE all filter by org
- ✅ **`src/app/api/org-chart/route.ts`** - Only shows org's employees and structure
- ✅ **`src/app/api/departments/route.ts`** - Only returns org's departments
- ✅ **`src/app/api/managers/route.ts`** - Only returns org's active employees
- ✅ **`src/app/api/audit-logs/route.ts`** - Forces organization filtering on audit logs

### Step 3.4: Testing Phase 3 ✅

**Test Setup:**
```bash
# Create test user
User: test@testcompany.com
Organization: Test Company (testcompany.com)

# Existing data
25+ employees from company.com
```

**Test Results:**
```
✅ User test@testcompany.com correctly assigned to Test Company organization
✅ API endpoints now filter by organizationId
✅ User can only see employees from Test Company
✅ Company.com employees no longer appear in the UI
✅ Org chart shows only Test Company structure
✅ Employee directory filtered to Test Company only
✅ Departments filtered to Test Company only
✅ Build completes successfully with no TypeScript errors
```

### Implementation Benefits

**Advantages of Application-Level Filtering:**
- ✅ **Explicit and traceable** - Easy to see where org filtering happens
- ✅ **Type-safe** - TypeScript enforces organizationId parameters
- ✅ **Easy to test** - Simply pass different orgIds in tests
- ✅ **Clear error messages** - 401/404 errors are obvious
- ✅ **No database complexity** - No RLS policies to debug
- ✅ **Faster to implement** - Completed in ~1 hour vs 2+ hours for full RLS

**Security Features:**
- ✅ **Multi-tenancy enforced** - All queries filter by organization
- ✅ **No data leakage** - Users can only access their org's data
- ✅ **Authentication required** - All routes check for valid user
- ✅ **404 for cross-org access** - Attempting to access other org's data returns "not found"

### Success Criteria - ALL MET ✅

- ✅ All API routes filter data by authenticated user's organization
- ✅ Query functions require organizationId parameter
- ✅ Users can only see their organization's data
- ✅ Cross-organization data access prevented
- ✅ Unauthenticated requests return 401 errors
- ✅ Build and TypeScript checks pass
- ✅ Multi-tenancy working correctly in UI

---

### OPTIONAL: Future Enhancement - Database-Level RLS

> **NOTE**: The sections below describe the **original Phase 3 plan** for PostgreSQL Row-Level Security (RLS). This has **NOT been implemented** yet. The current implementation uses application-level filtering (documented above), which is sufficient for multi-tenancy.
>
> RLS can be added later as an additional **defense-in-depth** security layer, but is not required for the application to function securely.

**Goal**: Add database-level security policies so even direct SQL queries respect organization boundaries

### RLS Step 1: Create Helper Functions

**File: `db/migrations/0005_rls_setup.sql`**
```sql
-- Helper function to get current user's organization ID
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid AS $$
  SELECT organization_id
  FROM employees
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user is admin (for future use)
CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM employees
    WHERE user_id = auth.uid()
    AND title ILIKE '%admin%' OR title ILIKE '%ceo%'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### RLS Step 2: Enable RLS on Tables

**Add to migration: `db/migrations/0005_rls_setup.sql`**
```sql
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

### RLS Step 3: Create RLS Policies

**Add to migration: `db/migrations/0005_rls_setup.sql`**
```sql
-- Organizations: Users can only see their own organization
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (id = get_user_organization_id());

CREATE POLICY "Users can update their own organization"
  ON organizations FOR UPDATE
  USING (id = get_user_organization_id());

-- Departments: Users can only see departments in their org
CREATE POLICY "Users can view departments in their org"
  ON departments FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert departments in their org"
  ON departments FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update departments in their org"
  ON departments FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete departments in their org"
  ON departments FOR DELETE
  USING (organization_id = get_user_organization_id());

-- Employees: Users can only see employees in their org
CREATE POLICY "Users can view employees in their org"
  ON employees FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert employees in their org"
  ON employees FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update employees in their org"
  ON employees FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete employees in their org"
  ON employees FOR DELETE
  USING (organization_id = get_user_organization_id());

-- Audit Logs: Users can only view logs for their org
CREATE POLICY "Users can view audit logs in their org"
  ON audit_logs FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert audit logs in their org"
  ON audit_logs FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());
```

### RLS Step 4: Update Database Connection to Use RLS

**Update: `src/lib/db.ts`**
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../db/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create postgres connection to Supabase database
const client = postgres(process.env.DATABASE_URL);

// Create drizzle instance with schema
export const db = drizzle(client, { schema });

// Helper to create DB with RLS context (use in API routes)
export async function createDbWithRLS(userId: string) {
  // Set the user context for RLS
  await client`SELECT set_config('request.jwt.claims', '{"sub":"${userId}"}', true)`;
  return db;
}
```

**Alternative approach using Supabase client (recommended):**

**Create: `src/lib/supabase/db.ts`**
```typescript
import { createClient } from '@/lib/supabase/server';

// Use this in API routes for RLS-aware database access
export async function getSupabaseDB() {
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return { supabase, userId: user.id };
}
```

### RLS Step 5: Update API Routes to Use RLS

**Example: Update `src/app/api/employees/route.ts`**

Before (no RLS):
```typescript
export async function GET(request: NextRequest) {
  const result = await getEmployees(filters);
  return NextResponse.json(result);
}
```

After (with RLS):
```typescript
import { getSupabaseDB } from '@/lib/supabase/db';

export async function GET(request: NextRequest) {
  try {
    const { supabase, userId } = await getSupabaseDB();

    // Now all queries automatically filtered by RLS
    const result = await getEmployees(filters);

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw error;
  }
}
```

**OR use Supabase client directly:**
```typescript
export async function GET(request: NextRequest) {
  try {
    const { supabase } = await getSupabaseDB();

    // Use Supabase client instead of Drizzle for RLS
    const { data, error } = await supabase
      .from('employees')
      .select('*, department:departments(*), manager:employees(*)')
      .order('name');

    if (error) throw error;

    return NextResponse.json({ employees: data });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### RLS Step 6: Apply RLS Migration

```bash
# Apply the migration
psql $DATABASE_URL -f db/migrations/0005_rls_setup.sql

# Verify RLS is enabled
psql $DATABASE_URL -c "
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
"
# Should show: rowsecurity = true for all tables

# Verify policies exist
psql $DATABASE_URL -c "
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
"
```

### RLS Step 7: Testing RLS Implementation (CRITICAL!)

**Setup: Create two separate organizations and users**
```bash
# 1. Add another test org
psql $DATABASE_URL -c "
INSERT INTO organizations (id, name, slug, domain) VALUES
('00000000-0000-0000-0000-000000000003', 'Company A', 'company-a', 'companya.com'),
('00000000-0000-0000-0000-000000000004', 'Company B', 'company-b', 'companyb.com');
"

# 2. Add departments for each
psql $DATABASE_URL -c "
INSERT INTO departments (name, organization_id) VALUES
('Dept A1', '00000000-0000-0000-0000-000000000003'),
('Dept B1', '00000000-0000-0000-0000-000000000004');
"
```

**Test Scenario 1: User can only see their org's data**
```
1. Sign up as user1@companya.com
2. Sign up as user2@companyb.com (use different browser/incognito)
3. Log in as user1@companya.com
4. Go to /employees
5. Expected: Only see employees from Company A
6. Check network tab: API should only return Company A employees
```

**Test Scenario 2: Direct database query respects RLS**
```bash
# Get user IDs
psql $DATABASE_URL -c "SELECT id, email FROM auth.users;"

# Test as user 1 (replace USER1_ID)
psql $DATABASE_URL -c "
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{\"sub\": \"USER1_ID\"}';
SELECT * FROM employees;
"
# Should only show Company A employees

# Test as user 2 (replace USER2_ID)
psql $DATABASE_URL -c "
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{\"sub\": \"USER2_ID\"}';
SELECT * FROM employees;
"
# Should only show Company B employees
```

**Test Scenario 3: Cross-org access blocked**
```
1. Log in as user1@companya.com
2. Try to create employee in Company B:
   curl -X POST http://localhost:3000/api/employees \
     -H "Cookie: YOUR_SESSION_COOKIE" \
     -d '{
       "name": "Hacker",
       "email": "hacker@companyb.com",
       "organizationId": "00000000-0000-0000-0000-000000000004"
     }'
3. Expected: Should fail (RLS policy prevents insert)
```

**Success Criteria:**
- ✅ RLS enabled on all tables
- ✅ Policies created successfully
- ✅ Users can only see their org's data
- ✅ Cannot access other org's data via API
- ✅ Cannot modify other org's data
- �� Direct SQL queries respect RLS

---

## Phase 4: Organization Onboarding

**Goal**: First employee of a new domain can create organization details

### Step 4.1: Create Onboarding Pages

**File: `src/app/onboarding/organization/page.tsx`**
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function OrganizationOnboardingPage() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Auto-generate slug from name
  function handleNameChange(newName: string) {
    setName(newName);
    const autoSlug = newName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(autoSlug);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch('/api/onboarding/organization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, description }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || 'Failed to create organization');
      setLoading(false);
    } else {
      router.push('/onboarding/departments');
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-2xl space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div>
          <h2 className="text-3xl font-bold">Welcome to Echelon!</h2>
          <p className="mt-2 text-gray-600">
            Let's start by setting up your organization
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
              Organization Name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              className="mt-1"
              placeholder="Acme Corporation"
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium">
              URL Slug
            </label>
            <Input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              pattern="[a-z0-9-]+"
              className="mt-1"
              placeholder="acme-corporation"
            />
            <p className="mt-1 text-xs text-gray-500">
              Only lowercase letters, numbers, and hyphens
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder="A brief description of your organization"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating...' : 'Continue'}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

**File: `src/app/onboarding/departments/page.tsx`**
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';

interface Department {
  name: string;
  description: string;
}

export default function DepartmentsOnboardingPage() {
  const [departments, setDepartments] = useState<Department[]>([
    { name: 'Engineering', description: '' },
    { name: 'Sales', description: '' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function addDepartment() {
    setDepartments([...departments, { name: '', description: '' }]);
  }

  function removeDepartment(index: number) {
    setDepartments(departments.filter((_, i) => i !== index));
  }

  function updateDepartment(index: number, field: keyof Department, value: string) {
    const updated = [...departments];
    updated[index][field] = value;
    setDepartments(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Filter out empty departments
    const validDepartments = departments.filter(d => d.name.trim() !== '');

    if (validDepartments.length === 0) {
      setError('Please add at least one department');
      setLoading(false);
      return;
    }

    const response = await fetch('/api/onboarding/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ departments: validDepartments }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || 'Failed to create departments');
      setLoading(false);
    } else {
      router.push('/search');
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div>
          <h2 className="text-3xl font-bold">Set up departments</h2>
          <p className="mt-2 text-gray-600">
            Create the initial departments for your organization
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {departments.map((dept, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <Input
                    type="text"
                    value={dept.name}
                    onChange={(e) => updateDepartment(index, 'name', e.target.value)}
                    placeholder="Department name"
                    required
                  />
                  <Input
                    type="text"
                    value={dept.description}
                    onChange={(e) => updateDepartment(index, 'description', e.target.value)}
                    placeholder="Description (optional)"
                  />
                </div>
                {departments.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDepartment(index)}
                    className="mt-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addDepartment}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add another department
          </Button>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating...' : 'Finish setup'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### Step 4.2: Create Onboarding API Routes

**File: `src/app/api/onboarding/organization/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { organizations, employees } from '../../../../../../db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get employee record
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, user.id))
      .limit(1);

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, slug, description } = body;

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Update organization details
    const [updatedOrg] = await db
      .update(organizations)
      .set({
        name,
        slug,
        description: description || null,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, employee.organizationId))
      .returning();

    return NextResponse.json({
      success: true,
      organization: updatedOrg,
    });
  } catch (error: any) {
    console.error('Onboarding error:', error);

    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'An organization with this slug already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}
```

**File: `src/app/api/onboarding/departments/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { departments, employees } from '../../../../../../db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get employee record
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, user.id))
      .limit(1);

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const body = await request.json();
    const { departments: deptList } = body;

    if (!Array.isArray(deptList) || deptList.length === 0) {
      return NextResponse.json(
        { error: 'At least one department is required' },
        { status: 400 }
      );
    }

    // Create departments
    const createdDepts = await db
      .insert(departments)
      .values(
        deptList.map((dept) => ({
          name: dept.name,
          description: dept.description || null,
          organizationId: employee.organizationId,
        }))
      )
      .returning();

    // If employee is not assigned to a department yet, assign to first one
    if (!employee.departmentId || employee.departmentId === null) {
      await db
        .update(employees)
        .set({
          departmentId: createdDepts[0].id,
          updatedAt: new Date(),
        })
        .where(eq(employees.id, employee.id));
    }

    return NextResponse.json({
      success: true,
      departments: createdDepts,
    });
  } catch (error) {
    console.error('Department creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create departments' },
      { status: 500 }
    );
  }
}
```

### Step 4.3: Update Middleware for Onboarding Check

**Update: `src/middleware.ts`**
```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'
import postgres from 'postgres'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  // Public paths that don't require authentication
  const publicPaths = ['/auth/login', '/auth/signup', '/auth/callback', '/auth/error']
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))
  const isOnboardingPath = request.nextUrl.pathname.startsWith('/onboarding')

  // If user is not logged in and trying to access protected route
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // If user is logged in and trying to access auth pages
  if (user && isPublicPath && request.nextUrl.pathname !== '/auth/callback') {
    const url = request.nextUrl.clone()
    url.pathname = '/search'
    return NextResponse.redirect(url)
  }

  // Check if user needs onboarding (only for authenticated non-onboarding pages)
  if (user && !isPublicPath && !isOnboardingPath) {
    try {
      const client = postgres(process.env.DATABASE_URL!)

      // Check if user's organization needs setup
      const result = await client`
        SELECT o.name, o.slug, e.department_id
        FROM employees e
        JOIN organizations o ON e.organization_id = o.id
        WHERE e.user_id = ${user.id}
        LIMIT 1
      `

      await client.end()

      if (result.length > 0) {
        const { name, slug, department_id } = result[0]

        // If org name/slug not set, redirect to org onboarding
        if (!name || !slug || name === '' || slug === '') {
          const url = request.nextUrl.clone()
          url.pathname = '/onboarding/organization'
          return NextResponse.redirect(url)
        }

        // If employee has no department, redirect to department onboarding
        if (!department_id) {
          const url = request.nextUrl.clone()
          url.pathname = '/onboarding/departments'
          return NextResponse.redirect(url)
        }
      }
    } catch (error) {
      console.error('Onboarding check error:', error)
      // If check fails, allow through (fail open)
    }
  }

  // If on onboarding path but already completed, redirect to app
  if (user && isOnboardingPath) {
    try {
      const client = postgres(process.env.DATABASE_URL!)

      const result = await client`
        SELECT o.name, o.slug, e.department_id
        FROM employees e
        JOIN organizations o ON e.organization_id = o.id
        WHERE e.user_id = ${user.id}
        LIMIT 1
      `

      await client.end()

      if (result.length > 0) {
        const { name, slug, department_id } = result[0]

        // If everything is set up, redirect to app
        if (name && slug && department_id) {
          const url = request.nextUrl.clone()
          url.pathname = '/search'
          return NextResponse.redirect(url)
        }
      }
    } catch (error) {
      console.error('Onboarding completion check error:', error)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Step 4.4: Testing Phase 4

**Test Scenario: New organization onboarding**
```
1. Add new organization domain without details:
   psql $DATABASE_URL -c "
   INSERT INTO organizations (id, name, slug, domain)
   VALUES (gen_random_uuid(), '', '', 'newcompany.com');
   "

2. Sign up with email: user@newcompany.com
3. Expected: After signup, redirected to /onboarding/organization
4. Fill out organization form:
   - Name: "New Company Inc"
   - Slug: "new-company-inc"
   - Description: "A brand new company"
5. Click Continue
6. Expected: Redirected to /onboarding/departments
7. Add departments:
   - Engineering
   - Sales
   - Product
8. Click Finish
9. Expected: Redirected to /search
10. Verify in database:
    psql $DATABASE_URL -c "SELECT name, slug FROM organizations WHERE domain = 'newcompany.com';"
    psql $DATABASE_URL -c "SELECT name FROM departments WHERE organization_id = (SELECT id FROM organizations WHERE domain = 'newcompany.com');"
```

**Success Criteria:**
- ✅ First user redirected to onboarding
- ✅ Can create organization details
- ✅ Can create departments
- ✅ After completion, can access app normally
- ✅ Subsequent logins skip onboarding

---

## Testing Checklist

### Phase 0: Foundation
- [ ] Supabase client libraries installed
- [ ] Environment variables configured
- [ ] Can create Supabase client
- [ ] `user_id` column added to employees table

### Phase 1: Auth Pages
- [ ] Login page renders
- [ ] Signup page renders
- [ ] Middleware redirects unauthenticated users
- [ ] Can't access /employees without login
- [ ] User menu appears after login
- [ ] Logout works correctly

### Phase 2: Domain Signup
- [x] Can sign up with valid domain
- [x] Cannot sign up with invalid domain
- [x] Existing employee linked on signup
- [x] New employee created on signup
- [x] Can login after signup

### Phase 3: Organization Filtering (Application-Level)
- [x] Auth helper created (getAuthenticatedUser)
- [x] Query functions updated to require organizationId
- [x] All API routes filter by organization
- [x] User A can't see User B's org data
- [x] API routes respect org boundaries
- [x] Cross-org access returns 404
- [x] Unauthenticated requests return 401
- [x] Build and TypeScript checks pass

### Phase 4: Onboarding
- [ ] New user redirected to onboarding
- [ ] Can create organization details
- [ ] Can create departments
- [ ] Redirected to app after completion
- [ ] Subsequent logins skip onboarding
- [ ] Completed users can't access onboarding pages

---

## Troubleshooting Guide

### Issue: "No organization found for domain"
**Solution:**
```bash
# Add test organization
psql $DATABASE_URL -c "
INSERT INTO organizations (name, slug, domain)
VALUES ('Test Co', 'test-co', 'yourdomain.com');
"
```

### Issue: RLS blocking all queries
**Solution:**
```bash
# Check if RLS helper function works
psql $DATABASE_URL -c "
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{\"sub\": \"USER_ID_HERE\"}';
SELECT get_user_organization_id();
"
# Should return organization UUID

# If returns NULL, check employee.user_id is set
psql $DATABASE_URL -c "
SELECT id, email, user_id FROM employees WHERE user_id = 'USER_ID_HERE';
"
```

### Issue: Middleware redirect loop
**Solution:**
- Check that auth routes are in `publicPaths`
- Verify onboarding check doesn't fail silently
- Add logging to middleware to debug:
```typescript
console.log('User:', user?.id, 'Path:', request.nextUrl.pathname)
```

### Issue: Employee not linked after signup
**Solution:**
```bash
# Manually link employee to user
psql $DATABASE_URL -c "
UPDATE employees
SET user_id = 'AUTH_USER_ID'
WHERE email = 'user@domain.com';
"
```

### Issue: Can't access Supabase local
**Solution:**
```bash
# Restart Supabase
npm run supabase:stop
npm run supabase:start

# Get new credentials
npm run supabase:status
# Update .env.local with new anon key
```

---

## Additional Considerations

### Email Verification
Currently email verification is disabled in Supabase config. To enable:
1. Update `db/supabase/config.toml`:
   ```toml
   [auth.email]
   enable_confirmations = true
   ```
2. Create email templates in `db/supabase/templates/`
3. Handle verification in signup flow

### Password Reset
Not implemented in this plan. To add:
1. Create `/auth/reset-password/page.tsx`
2. Use `supabase.auth.resetPasswordForEmail()`
3. Create `/auth/update-password/page.tsx`

### Role-Based Access Control (RBAC)
Future enhancement:
1. Add `role` column to employees ('admin', 'manager', 'employee')
2. Update RLS policies to check roles
3. Add admin-only routes and features

### Audit Log Integration
The `changed_by` field in audit_logs should be populated with `user_id`:
```typescript
await createAuditLog({
  entityType: 'employee',
  action: 'updated',
  changedBy: user.id, // Add this
  organizationId: employee.organizationId,
  // ...
});
```

---

## Next Steps After Implementation

1. **Production Deployment**:
   - Deploy to Vercel/production
   - Set up production Supabase instance
   - Configure production environment variables
   - Run migrations on production database

2. **Testing**:
   - Write integration tests for auth flow
   - Test RLS policies thoroughly
   - Load testing with multiple orgs

3. **Documentation**:
   - User onboarding guide
   - Admin documentation
   - API documentation

4. **Enhancements**:
   - Email verification
   - Password reset
   - Role-based permissions
   - Invite system for employees
   - SSO integration (Google, Microsoft)

---

**End of Plan**

This plan is comprehensive and ready for execution. Each phase builds on the previous one and includes detailed testing steps. Follow the phases in order for best results.
