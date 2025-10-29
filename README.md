## Prerequisites
- Node.js (v18 or higher recommended)
- npm
- Docker Desktop
- Supabase CLI

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Run `Docker Desktop`

3. Configure environment variables:

Copy the `.env.example` into a `.env` file in the project root

4. Start local Supabase:

```bash
npm run supabase:start
```

This will start local PostgreSQL and Supabase services. Keep this running while developing.

5. Run database migrations:

```bash
npm run db:migrate
```

This will create the initial database tables (e.g., organizations) in your local Supabase database.

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

## NextJS

- This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.
- Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
