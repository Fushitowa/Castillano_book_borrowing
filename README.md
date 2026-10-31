# Blueleaf Library

A responsive library borrowing dashboard built with React, TypeScript, Vite and Supabase. The app starts in demo mode with sample books and readers, so the checkout and return flows can be explored without credentials. Add Supabase credentials to persist transactions across sessions.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run dev` and open the local URL printed by Vite.

## Connect Supabase

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor. For a populated demo, then run [`supabase/seed.sql`](supabase/seed.sql).
3. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the project API settings.
4. Add books and borrowers to the `books` and `borrowers` tables, or start with the included demo seed. Members are managed in the `borrowers` table.
5. Restart the Vite server after changing environment variables.

The borrow and return actions use database functions so copy counts and loan status change together. The included SQL policies are suitable only for a private demo. Before opening this project to the public, add Supabase Auth, restrict read access to signed-in library staff, and replace the demo RPC grants with staff-authorized policies. Never put a Supabase service-role key in a browser app.

## Stack

- React 18 + TypeScript + Vite
- Supabase JavaScript client
- Lucide icons
- Blue and slate responsive interface
