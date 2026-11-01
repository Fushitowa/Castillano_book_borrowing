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
4. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor. It includes the permanent starter collection of books and manga, without adding readers or loans.
5. Restart the Vite server. Create your first staff account from the registration page. The first account becomes **Admin**; later signups become **Librarian**. If accounts already exist, rerunning the schema promotes the earliest account to Admin.
6. On first staff sign-in, the app adds the permanent starter catalog if the connected catalog is empty. It includes regular books plus Naruto, One Piece, Jujutsu Kaisen, Demon Slayer, My Hero Academia, Spy x Family, and Attack on Titan, with no demo borrowers or checkouts.

Account signup and sign-in use Supabase Auth. A database trigger creates the matching `public.users` profile. Public signups receive the Librarian role after the first account. An existing Admin can create another Admin from **Admin portal → Create an Admin account**; run [`supabase/admin-account-setup.sql`](supabase/admin-account-setup.sql) once in the Supabase SQL editor to enable this for an existing installation. RLS restricts library reads to authenticated staff, and the role-change function checks that the caller is already an Admin. Borrow and return actions use database functions so copy counts and loan status change together.

The **Dashboard** gives admins collection, active-reader, loan, and overdue summaries. On the Books page, admins get an **Add book** action and inventory-management actions instead of checkout actions. The **Admin portal** can add titles, upload a cover image, increase copy counts, add and edit borrowers, view each borrower's active loan count, and deactivate/reactivate borrower accounts. Borrowers with active loans cannot be deactivated. If your Supabase project was set up earlier, rerun the latest `supabase/schema.sql` to install the admin-only database functions, borrower status field, and book-cover storage bucket and policies.

For an existing project, run or rerun [`supabase/customer-portal-setup.sql`](supabase/customer-portal-setup.sql) in the Supabase SQL Editor. It adds the public book catalog policy, the permanent starter books and manga (preserving existing ISBN records and inventory), customer request tables, and staff review functions. Borrow requests include customer contact details and the requested loan period; approving a request checks out a copy for that many days. Return notices do not mark a loan returned until a staff member confirms the physical book.

To remove the original demo checkouts and reader records from an existing Supabase database, run [`supabase/remove-demo-borrowers.sql`](supabase/remove-demo-borrowers.sql) once in the SQL Editor. It targets only the fixed demo record IDs and restores copies for demo loans that were still active.

## Stack

- React 18 + TypeScript + Vite
- Supabase JavaScript client
- Lucide icons
- Blue and slate responsive interface
