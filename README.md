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

3. Start local Supabase:

```bash
supabase start
```

This will start local PostgreSQL and Supabase services. Keep this running while developing.

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser

## Stopping Services

When done developing:

```bash
supabase stop
```

Note: Supabase runs independently from Next.js, so you can restart `npm run dev` without restarting Supabase. 

## NextJS

- This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.
- Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
