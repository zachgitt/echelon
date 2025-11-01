## Prerequisites
- Node.js (v18 or higher recommended)
- npm
- Docker Desktop
- Supabase CLI
- Vercel CLI

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Run `Docker Desktop`

3. Start local Supabase:

```bash
npm run supabase:start
```

This will start local PostgreSQL and Supabase services. Keep this running while developing.

4. Configure environment variables:

Copy the `.env.example` into a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Then run `npm run supabase:status` and copy the **Publishable key** and **Secret key** into your `.env.local` file:
- Replace `your_anon_key_here` with the Publishable key
- Replace `your_service_role_key_here` with the Secret key

5. Run database migrations:

```bash
npm run db:migrate
```

This will create the initial database tables (organizations, employees, etc.) in your local Supabase database.

6. Run the development server:

```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) with your browser.

## Stopping Services

When done developing:

```bash
npm run supabase:stop
```

Note: Supabase runs independently from Next.js, so you can restart `npm run dev` without restarting Supabase.

## Database

### Drizzle ORM Commands

- `npm run db:generate` - Generate migration files from schema changes
- `npm run db:migrate` - Apply migrations to database
- `npm run db:studio` - Open Drizzle Studio (database browser)

### Supabase Commands

- `npm run supabase:start` - Start local Supabase
- `npm run supabase:stop` - Stop local Supabase
- `npm run supabase:status` - Check Supabase status

## Deployment

#### Push migrations to production Supabase
- `npx supabase login`
- `npx supabase projects list` - to get reference id
- `npx supabase link --project-ref [REF_ID]`
- Update .env.local file to production values
- `npx supabase db push`
#### Deploy to Vercel
- `vercel login`
- `vercel list` - to link
- `vercel --prod` - to push

