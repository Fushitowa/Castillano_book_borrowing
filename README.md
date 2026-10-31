# Jireh Library

A responsive library borrowing dashboard built with React, TypeScript, Vite and Supabase. Without credentials, clearly labeled demo roles let you explore the interface. Connect a Supabase project for real staff accounts and persistent library data.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run dev` and open the local URL printed by Vite.

## Connect Supabase accounts and database

1. Create a Supabase project.
2. In your project's **Connect** dialog, copy the Project URL and publishable key into `.env.local` (copy `.env.example` first). Never put a secret/service-role key in this frontend.
3. In **Authentication → Providers**, enable Email/password sign-in and signups.
4. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor. For sample catalog data, also run [`supabase/seed.sql`](supabase/seed.sql).
5. Restart the Vite server. Create your first staff account from the registration page. New signups receive the **Librarian** role by default.
6. Promote the first account to **Admin** in the SQL editor:

   ```sql
   update public.users set role = 'admin' where email = 'your-email@example.com';
   ```

7. Run `supabase/seed.sql` to add the ten sample books, demo borrowers, and example checkouts to the connected database. The local demo catalog also includes these sample titles.

Account signup and sign-in use Supabase Auth. A database trigger creates the matching `public.users` profile. RLS restricts library reads to authenticated staff; role changes must be made by an administrator in Supabase. Borrow and return actions use database functions so copy counts and loan status change together.

## Stack

- React 18 + TypeScript + Vite
- Supabase JavaScript client
- Lucide icons
- Blue and slate responsive interface
