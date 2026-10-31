-- Jireh Library database. Run this file once in the Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null default 'librarian' check (role in ('admin', 'librarian')),
  created_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  category text not null default 'General',
  isbn text unique,
  cover text,
  color text not null default '#d5e3f6',
  total_copies integer not null default 1 check (total_copies >= 0),
  available_copies integer not null default 1 check (available_copies >= 0 and available_copies <= total_copies),
  created_at timestamptz not null default now()
);

create table if not exists public.borrowers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  initials text not null,
  color text not null default 'blue',
  created_at timestamptz not null default now()
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete restrict,
  borrower_id uuid not null references public.borrowers(id) on delete restrict,
  status text not null default 'borrowed' check (status in ('borrowed', 'returned')),
  borrowed_at timestamptz not null default now(),
  due_at timestamptz not null,
  returned_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists loans_status_due_idx on public.loans(status, due_at);
create index if not exists loans_borrower_idx on public.loans(borrower_id);

-- Each Supabase Auth signup receives a database profile with the least-privileged role.
create or replace function public.create_library_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is not null then
    insert into public.users (id, full_name, email, role)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
      new.email,
      'librarian'
    ) on conflict (id) do update set email = excluded.email;
  end if;
  return new;
end; $$;

drop trigger if exists on_auth_user_created_library_profile on auth.users;
create trigger on_auth_user_created_library_profile
after insert on auth.users
for each row execute procedure public.create_library_user();

create or replace function public.is_library_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.users where id = auth.uid() and role in ('admin', 'librarian'));
$$;

create or replace function public.is_library_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

-- Atomic functions keep copy counts and loan records consistent during concurrent checkouts.
create or replace function public.borrow_book(p_book_id uuid, p_borrower_id uuid, p_due_at timestamptz)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_loan_id uuid;
begin
  if auth.uid() is null or not public.is_library_staff() then raise exception 'Staff sign-in is required'; end if;
  if p_due_at <= now() then raise exception 'The due date must be in the future'; end if;
  update books set available_copies = available_copies - 1
  where id = p_book_id and available_copies > 0;
  if not found then raise exception 'This book has no available copies'; end if;
  insert into loans(book_id, borrower_id, due_at)
  values (p_book_id, p_borrower_id, p_due_at) returning id into new_loan_id;
  return new_loan_id;
end; $$;

create or replace function public.return_book(p_loan_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare returned_book_id uuid;
begin
  if auth.uid() is null or not public.is_library_staff() then raise exception 'Staff sign-in is required'; end if;
  update loans set status = 'returned', returned_at = now()
  where id = p_loan_id and status = 'borrowed' returning book_id into returned_book_id;
  if returned_book_id is null then raise exception 'Loan is missing or has already been returned'; end if;
  update books set available_copies = least(total_copies, available_copies + 1) where id = returned_book_id;
end; $$;

-- Only signed-in staff can read library data. Role changes are made by an administrator.
alter table public.users enable row level security;
alter table public.books enable row level security;
alter table public.borrowers enable row level security;
alter table public.loans enable row level security;

drop policy if exists "public demo books" on public.books;
drop policy if exists "public demo borrowers" on public.borrowers;
drop policy if exists "public demo loans" on public.loans;
drop policy if exists "staff read books" on public.books;
drop policy if exists "staff read borrowers" on public.borrowers;
drop policy if exists "staff read loans" on public.loans;
drop policy if exists "read own or manage staff profiles" on public.users;
create policy "staff read books" on public.books for select to authenticated using (public.is_library_staff());
create policy "staff read borrowers" on public.borrowers for select to authenticated using (public.is_library_staff());
create policy "staff read loans" on public.loans for select to authenticated using (public.is_library_staff());
create policy "read own or manage staff profiles" on public.users for select to authenticated
  using (id = auth.uid() or public.is_library_admin());

revoke all on table public.users, public.books, public.borrowers, public.loans from anon;
grant select on table public.users, public.books, public.borrowers, public.loans to authenticated;
revoke all on function public.is_library_staff() from public, anon;
revoke all on function public.is_library_admin() from public, anon;
revoke all on function public.borrow_book(uuid, uuid, timestamptz) from public, anon;
revoke all on function public.return_book(uuid) from public, anon;
grant execute on function public.is_library_staff() to authenticated;
grant execute on function public.is_library_admin() to authenticated;
grant execute on function public.borrow_book(uuid, uuid, timestamptz) to authenticated;
grant execute on function public.return_book(uuid) to authenticated;

-- Signup creates librarian accounts. Promote your first administrator in the SQL editor:
-- update public.users set role = 'admin'
-- where email = 'your-admin-email@example.com';
