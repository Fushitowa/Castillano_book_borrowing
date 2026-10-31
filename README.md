# Jireh Library

A responsive library borrowing dashboard built with React, TypeScript, Vite and Supabase. Without credentials, clearly labeled demo roles let you explore the interface. Connect a Supabase project for real staff accounts and persistent library data.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run dev` and open the local URL printed by Vite.
4. To run the no-login customer catalog on its own local port, run `npm run dev:customer` in a second terminal and open `http://localhost:5174/customer`. Customers can browse without an account and submit borrow or return requests; staff continue to use the main app on port 5173.

## Connect Supabase accounts and database

1. Create a Supabase project.
2. In your project's **Connect** dialog, copy the Project URL and publishable key into `.env.local` (copy `.env.example` first). Never put a secret/service-role key in this frontend.
3. In **Authentication → Providers**, enable Email/password sign-in and signups.
4. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor. For sample catalog data, also run [`supabase/seed.sql`](supabase/seed.sql).
5. Restart the Vite server. Create your first staff account from the registration page. The first account becomes **Admin**; later signups become **Librarian**. If accounts already exist, rerunning the schema promotes the earliest account to Admin.
6. On first staff sign-in, the app adds ten sample books if the connected catalog is empty. Optionally run `supabase/seed.sql` to also add demo borrowers and example checkouts. The local demo catalog includes the same titles.

Account signup and sign-in use Supabase Auth. A database trigger creates the matching `public.users` profile. Public signups receive the Librarian role after the first account. An existing Admin can create another Admin from **Admin portal → Create an Admin account**; run [`supabase/admin-account-setup.sql`](supabase/admin-account-setup.sql) once in the Supabase SQL editor to enable this for an existing installation. RLS restricts library reads to authenticated staff, and the role-change function checks that the caller is already an Admin. Borrow and return actions use database functions so copy counts and loan status change together.

The **Dashboard** gives admins collection, active-reader, loan, and overdue summaries. On the Books page, admins get an **Add book** action and inventory-management actions instead of checkout actions. The **Admin portal** can add titles, upload a cover image, increase copy counts, add and edit borrowers, view each borrower's active loan count, and deactivate/reactivate borrower accounts. Borrowers with active loans cannot be deactivated. If your Supabase project was set up earlier, rerun the latest `supabase/schema.sql` to install the admin-only database functions, borrower status field, and book-cover storage bucket and policies.

For an existing project, run [`supabase/customer-portal-setup.sql`](supabase/customer-portal-setup.sql) once in the Supabase SQL Editor. It adds the public book catalog policy, customer request tables, and staff review functions. Borrow requests do not check out a copy until a staff member approves them. Return notices do not mark a loan returned until a staff member confirms the physical book.

## Stack

- React 18 + TypeScript + Vite
- Supabase JavaScript client
- Lucide icons
- Blue and slate responsive interface
