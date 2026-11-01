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
alter table public.borrowers add column if not exists is_active boolean not null default true;

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

create table if not exists public.borrow_requests (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete restrict,
  customer_name text not null,
  customer_email text not null,
  customer_address text not null default '',
  requested_days integer not null default 14 check (requested_days between 1 and 30),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  loan_id uuid references public.loans(id) on delete set null
);

alter table public.borrow_requests add column if not exists customer_address text not null default '';
alter table public.borrow_requests add column if not exists requested_days integer not null default 14 check (requested_days between 1 and 30);

create table if not exists public.return_requests (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete restrict,
  customer_name text not null,
  customer_email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  loan_id uuid references public.loans(id) on delete set null
);

create index if not exists loans_status_due_idx on public.loans(status, due_at);
create index if not exists loans_borrower_idx on public.loans(borrower_id);
create index if not exists borrow_requests_status_requested_idx on public.borrow_requests(status, requested_at desc);
create index if not exists return_requests_status_requested_idx on public.return_requests(status, requested_at desc);
create unique index if not exists borrow_requests_pending_email_book_idx on public.borrow_requests(lower(customer_email), book_id) where status = 'pending';
create unique index if not exists return_requests_pending_email_book_idx on public.return_requests(lower(customer_email), book_id) where status = 'pending';

-- Each Supabase Auth signup receives a database profile with the least-privileged role.
create or replace function public.create_library_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare assigned_role text;
begin
  -- Serialize first-account setup so exactly one first signup becomes the administrator.
  perform pg_advisory_xact_lock(8573112026);
  if new.email is not null then
    if exists(select 1 from public.users) then assigned_role := 'librarian'; else assigned_role := 'admin'; end if;
    insert into public.users (id, full_name, email, role)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
      new.email,
      assigned_role
    ) on conflict (id) do update set email = excluded.email;
  end if;
  return new;
end; $$;

create or replace function public.admin_setup_available()
returns boolean language sql stable security definer set search_path = public as $$
  select not exists(select 1 from public.users);
$$;

drop trigger if exists on_auth_user_created_library_profile on auth.users;
create trigger on_auth_user_created_library_profile
after insert on auth.users
for each row execute procedure public.create_library_user();

-- Backfill profiles for accounts created before the auth trigger was installed.
insert into public.users (id, full_name, email, role, created_at)
select id,
       coalesce(nullif(raw_user_meta_data ->> 'full_name', ''), split_part(email, '@', 1)),
       email,
       'librarian',
       created_at
from auth.users
where email is not null
on conflict (id) do nothing;

-- If accounts were created before this bootstrap flow was installed, promote the earliest one.
do $$
begin
  if not exists(select 1 from public.users where role = 'admin') then
    update public.users set role = 'admin'
    where id = (select id from public.users order by created_at, id limit 1);
  end if;
end; $$;

create or replace function public.is_library_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.users where id = auth.uid() and role in ('admin', 'librarian'));
$$;

create or replace function public.is_library_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

-- Additional administrator accounts are created by an existing admin through
-- the app. The public signup trigger still assigns the least-privileged role.
create or replace function public.admin_promote_staff_to_admin(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_library_admin() then
    raise exception 'Administrator access is required';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Choose a different staff account';
  end if;
  update public.users set role = 'admin' where id = p_user_id and role = 'librarian';
  if not found then
    raise exception 'The new staff profile was not found or is already an administrator';
  end if;
end; $$;

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

drop function if exists public.customer_submit_borrow_request(text, text, uuid);
create or replace function public.customer_submit_borrow_request(p_customer_name text, p_customer_email text, p_customer_address text, p_requested_days integer, p_book_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare request_id uuid; pending_count integer;
begin
  if nullif(trim(p_customer_name), '') is null or length(trim(p_customer_name)) > 120 then
    raise exception 'Enter your name (up to 120 characters)';
  end if;
  if nullif(trim(p_customer_email), '') is null or length(trim(p_customer_email)) > 254
     or trim(p_customer_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address';
  end if;
  if nullif(trim(p_customer_address), '') is null or length(trim(p_customer_address)) > 300 then
    raise exception 'Enter your address (up to 300 characters)';
  end if;
  if p_requested_days is null or p_requested_days < 1 or p_requested_days > 30 then
    raise exception 'Choose a borrowing period from 1 to 30 days';
  end if;
  if not exists(select 1 from books where id = p_book_id and available_copies > 0) then
    raise exception 'This book is currently unavailable';
  end if;
  select count(*) into pending_count from borrow_requests
  where lower(customer_email) = lower(trim(p_customer_email)) and status = 'pending';
  if pending_count >= 10 then raise exception 'You already have several requests awaiting review'; end if;
  insert into borrow_requests(book_id, customer_name, customer_email, customer_address, requested_days)
  values (p_book_id, trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_address), p_requested_days) returning id into request_id;
  return request_id;
end; $$;

create or replace function public.customer_submit_return_request(p_customer_name text, p_customer_email text, p_book_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare request_id uuid; pending_count integer;
begin
  if nullif(trim(p_customer_name), '') is null or length(trim(p_customer_name)) > 120 then
    raise exception 'Enter your name (up to 120 characters)';
  end if;
  if nullif(trim(p_customer_email), '') is null or length(trim(p_customer_email)) > 254
     or trim(p_customer_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address';
  end if;
  select count(*) into pending_count from return_requests
  where lower(customer_email) = lower(trim(p_customer_email)) and status = 'pending';
  if pending_count >= 10 then raise exception 'You already have several return notices awaiting review'; end if;
  insert into return_requests(book_id, customer_name, customer_email)
  values (p_book_id, trim(p_customer_name), lower(trim(p_customer_email))) returning id into request_id;
  return request_id;
end; $$;

create or replace function public.staff_approve_borrow_request(p_request_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare request_row borrow_requests%rowtype; borrower_id uuid; new_loan_id uuid;
begin
  if auth.uid() is null or not public.is_library_staff() then raise exception 'Staff sign-in is required'; end if;
  select * into request_row from borrow_requests where id = p_request_id for update;
  if not found or request_row.status <> 'pending' then raise exception 'Borrow request is missing or already reviewed'; end if;
  insert into borrowers(name, email, initials, color, is_active)
  values (
    request_row.customer_name,
    request_row.customer_email,
    upper(left(request_row.customer_name, 1) || left((regexp_split_to_array(trim(request_row.customer_name), '[[:space:]]+'))[array_length(regexp_split_to_array(trim(request_row.customer_name), '[[:space:]]+'), 1)], 1)),
    'blue', true
  )
  on conflict(email) do update set is_active = true
  returning id into borrower_id;
  new_loan_id := public.borrow_book(request_row.book_id, borrower_id, now() + make_interval(days => request_row.requested_days));
  update borrow_requests set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), loan_id = new_loan_id where id = p_request_id;
  return new_loan_id;
end; $$;

create or replace function public.staff_reject_borrow_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_library_staff() then raise exception 'Staff sign-in is required'; end if;
  update borrow_requests set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_request_id and status = 'pending';
  if not found then raise exception 'Borrow request is missing or already reviewed'; end if;
end; $$;

create or replace function public.staff_approve_return_request(p_request_id uuid, p_loan_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare request_row return_requests%rowtype; matching_loan_id uuid;
begin
  if auth.uid() is null or not public.is_library_staff() then raise exception 'Staff sign-in is required'; end if;
  select * into request_row from return_requests where id = p_request_id for update;
  if not found or request_row.status <> 'pending' then raise exception 'Return notice is missing or already reviewed'; end if;
  select l.id into matching_loan_id
  from loans l join borrowers b on b.id = l.borrower_id
  where l.id = p_loan_id and l.book_id = request_row.book_id and l.status = 'borrowed'
    and lower(b.email) = lower(request_row.customer_email)
  for update of l;
  if matching_loan_id is null then raise exception 'The selected loan does not match this return notice'; end if;
  perform public.return_book(matching_loan_id);
  update return_requests set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), loan_id = matching_loan_id where id = p_request_id;
end; $$;

create or replace function public.staff_reject_return_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_library_staff() then raise exception 'Staff sign-in is required'; end if;
  update return_requests set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_request_id and status = 'pending';
  if not found then raise exception 'Return notice is missing or already reviewed'; end if;
end; $$;

drop function if exists public.admin_add_book(text, text, text, text, integer);
create or replace function public.admin_add_book(
  p_title text, p_author text, p_category text, p_isbn text, p_cover text, p_total_copies integer
)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_book_id uuid;
begin
  if auth.uid() is null or not public.is_library_admin() then raise exception 'Administrator access is required'; end if;
  if nullif(trim(p_title), '') is null or nullif(trim(p_author), '') is null then raise exception 'Title and author are required'; end if;
  if p_total_copies < 1 or p_total_copies > 500 then raise exception 'Initial copies must be between 1 and 500'; end if;
  insert into books (title, author, category, isbn, cover, total_copies, available_copies)
  values (trim(p_title), trim(p_author), coalesce(nullif(trim(p_category), ''), 'General'), nullif(trim(p_isbn), ''), nullif(trim(p_cover), ''), p_total_copies, p_total_copies)
  returning id into new_book_id;
  return new_book_id;
end; $$;

create or replace function public.admin_add_book_copies(p_book_id uuid, p_quantity integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_library_admin() then raise exception 'Administrator access is required'; end if;
  if p_quantity < 1 or p_quantity > 500 then raise exception 'Copies to add must be between 1 and 500'; end if;
  update books
  set total_copies = total_copies + p_quantity,
      available_copies = available_copies + p_quantity
  where id = p_book_id;
  if not found then raise exception 'Book not found'; end if;
end; $$;

create or replace function public.admin_add_borrower(p_name text, p_email text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_borrower_id uuid; borrower_initials text; name_parts text[];
begin
  if auth.uid() is null or not public.is_library_admin() then raise exception 'Administrator access is required'; end if;
  if nullif(trim(p_name), '') is null or nullif(trim(p_email), '') is null then raise exception 'Name and email are required'; end if;
  name_parts := regexp_split_to_array(trim(p_name), '[[:space:]]+');
  borrower_initials := upper(left(name_parts[1], 1) || left(name_parts[array_length(name_parts, 1)], 1));
  insert into borrowers (name, email, initials, color, is_active)
  values (trim(p_name), lower(trim(p_email)), borrower_initials, 'blue', true)
  returning id into new_borrower_id;
  return new_borrower_id;
end; $$;

create or replace function public.admin_update_borrower(p_borrower_id uuid, p_name text, p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare name_parts text[]; borrower_initials text;
begin
  if auth.uid() is null or not public.is_library_admin() then raise exception 'Administrator access is required'; end if;
  if nullif(trim(p_name), '') is null or nullif(trim(p_email), '') is null then raise exception 'Name and email are required'; end if;
  name_parts := regexp_split_to_array(trim(p_name), '[[:space:]]+');
  borrower_initials := upper(left(name_parts[1], 1) || left(name_parts[array_length(name_parts, 1)], 1));
  update borrowers set name = trim(p_name), email = lower(trim(p_email)), initials = borrower_initials
  where id = p_borrower_id;
  if not found then raise exception 'Borrower not found'; end if;
end; $$;

create or replace function public.admin_set_borrower_active(p_borrower_id uuid, p_is_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_library_admin() then raise exception 'Administrator access is required'; end if;
  if not p_is_active and exists(select 1 from loans where borrower_id = p_borrower_id and status = 'borrowed') then
    raise exception 'Return the borrower’s active loans before deactivating the account';
  end if;
  update borrowers set is_active = p_is_active where id = p_borrower_id;
  if not found then raise exception 'Borrower not found'; end if;
end; $$;

-- Populate an empty catalog for a first-run demo. This function can only seed the fixed sample set once.
create or replace function public.seed_demo_library()
returns integer language plpgsql security definer set search_path = public as $$
declare inserted_count integer;
begin
  if auth.uid() is null or not public.is_library_staff() then raise exception 'Staff sign-in is required'; end if;
  if exists(select 1 from books limit 1) then return 0; end if;
  insert into books (id, title, author, category, isbn, cover, color, total_copies, available_copies) values
    ('00000000-0000-4000-8000-000000000001', 'The Creative Act', 'Rick Rubin', 'Creativity', '978-0593652886', 'https://covers.openlibrary.org/b/isbn/9780593652886-L.jpg', '#dec8b4', 8, 8),
    ('00000000-0000-4000-8000-000000000002', 'Atomic Habits', 'James Clear', 'Self growth', '978-0735211292', 'https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg', '#d5e3f6', 12, 12),
    ('00000000-0000-4000-8000-000000000003', 'Educated', 'Tara Westover', 'Memoir', '978-0399590504', 'https://covers.openlibrary.org/b/isbn/9780399590504-L.jpg', '#b9c2b6', 7, 7),
    ('00000000-0000-4000-8000-000000000004', 'The Midnight Library', 'Matt Haig', 'Fiction', '978-0525559474', 'https://covers.openlibrary.org/b/isbn/9780525559474-L.jpg', '#acb5cd', 10, 10),
    ('00000000-0000-4000-8000-000000000005', 'Thinking, Fast and Slow', 'Daniel Kahneman', 'Psychology', '978-0374533557', 'https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg', '#e6d2b1', 6, 6),
    ('00000000-0000-4000-8000-000000000006', 'Maybe You Should Talk to Someone', 'Lori Gottlieb', 'Psychology', '978-1328662057', 'https://covers.openlibrary.org/b/isbn/9781328662057-L.jpg', '#d5b7ad', 9, 9),
    ('00000000-0000-4000-8000-000000000007', 'The Hobbit', 'J.R.R. Tolkien', 'Fantasy', '9780547928227', 'https://covers.openlibrary.org/b/isbn/9780547928227-L.jpg', '#bfd0ad', 8, 8),
    ('00000000-0000-4000-8000-000000000008', 'Pride and Prejudice', 'Jane Austen', 'Classics', '9780141439518', 'https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg', '#d9c3ce', 5, 5),
    ('00000000-0000-4000-8000-000000000009', 'The Book Thief', 'Markus Zusak', 'Historical fiction', '9780375842207', 'https://covers.openlibrary.org/b/isbn/9780375842207-L.jpg', '#c6c8ce', 6, 6),
    ('00000000-0000-4000-8000-000000000010', 'The Alchemist', 'Paulo Coelho', 'Fiction', '9780062315007', 'https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg', '#dcc590', 7, 7),
    ('00000000-0000-4000-8000-000000000101', 'Naruto, Vol. 1', 'Masashi Kishimoto', 'Manga', '9781569319000', 'https://covers.openlibrary.org/b/isbn/9781569319000-L.jpg', '#f4d6a2', 3, 3),
    ('00000000-0000-4000-8000-000000000102', 'One Piece, Vol. 1', 'Eiichiro Oda', 'Manga', '9781569319017', 'https://covers.openlibrary.org/b/isbn/9781569319017-L.jpg', '#d5e6f5', 3, 3),
    ('00000000-0000-4000-8000-000000000103', 'Jujutsu Kaisen, Vol. 1', 'Gege Akutami', 'Manga', '9781974710027', 'https://covers.openlibrary.org/b/isbn/9781974710027-L.jpg', '#d8d2ed', 3, 3),
    ('00000000-0000-4000-8000-000000000104', 'Demon Slayer: Kimetsu no Yaiba, Vol. 1', 'Koyoharu Gotouge', 'Manga', '9781974700523', 'https://covers.openlibrary.org/b/isbn/9781974700523-L.jpg', '#c9e0cf', 3, 3),
    ('00000000-0000-4000-8000-000000000105', 'My Hero Academia, Vol. 1', 'Kohei Horikoshi', 'Manga', '9781421582696', 'https://covers.openlibrary.org/b/isbn/9781421582696-L.jpg', '#e5e2b8', 3, 3),
    ('00000000-0000-4000-8000-000000000106', 'Spy x Family, Vol. 1', 'Tatsuya Endo', 'Manga', '9781974715466', 'https://covers.openlibrary.org/b/isbn/9781974715466-L.jpg', '#ecd8bf', 3, 3),
    ('00000000-0000-4000-8000-000000000107', 'Attack on Titan, Vol. 1', 'Hajime Isayama', 'Manga', '9781612620244', 'https://covers.openlibrary.org/b/isbn/9781612620244-L.jpg', '#bdc7d2', 3, 3)
  on conflict (id) do nothing;
  get diagnostics inserted_count = row_count;

  return inserted_count;
end; $$;

-- Only signed-in staff can read library data. Role changes are made by an administrator.
alter table public.users enable row level security;
alter table public.books enable row level security;
alter table public.borrowers enable row level security;
alter table public.loans enable row level security;
alter table public.borrow_requests enable row level security;
alter table public.return_requests enable row level security;

drop policy if exists "public demo books" on public.books;
drop policy if exists "public demo borrowers" on public.borrowers;
drop policy if exists "public demo loans" on public.loans;
drop policy if exists "staff read books" on public.books;
drop policy if exists "staff add books" on public.books;
drop policy if exists "staff read borrowers" on public.borrowers;
drop policy if exists "staff read loans" on public.loans;
drop policy if exists "public catalog books" on public.books;
drop policy if exists "staff read borrow requests" on public.borrow_requests;
drop policy if exists "staff read return requests" on public.return_requests;
drop policy if exists "read own or manage staff profiles" on public.users;
create policy "public catalog books" on public.books for select to anon, authenticated using (true);
create policy "staff read books" on public.books for select to authenticated using (public.is_library_staff());
create policy "staff read borrowers" on public.borrowers for select to authenticated using (public.is_library_staff());
create policy "staff read loans" on public.loans for select to authenticated using (public.is_library_staff());
create policy "staff read borrow requests" on public.borrow_requests for select to authenticated using (public.is_library_staff());
create policy "staff read return requests" on public.return_requests for select to authenticated using (public.is_library_staff());
create policy "read own or manage staff profiles" on public.users for select to authenticated
  using (id = auth.uid() or public.is_library_admin());

revoke all on table public.users, public.books, public.borrowers, public.loans, public.borrow_requests, public.return_requests from anon;
grant select on table public.books to anon;
grant select on table public.users, public.books, public.borrowers, public.loans, public.borrow_requests, public.return_requests to authenticated;
revoke insert, update, delete on table public.books from anon, authenticated;
revoke insert, update, delete on table public.borrow_requests, public.return_requests from anon, authenticated;
grant select on table public.borrow_requests, public.return_requests to authenticated;
revoke all on function public.is_library_staff() from public, anon;
revoke all on function public.is_library_admin() from public, anon;
revoke all on function public.admin_promote_staff_to_admin(uuid) from public, anon;
revoke all on function public.customer_submit_borrow_request(text, text, text, integer, uuid) from public;
revoke all on function public.customer_submit_return_request(text, text, uuid) from public;
revoke all on function public.staff_approve_borrow_request(uuid) from public, anon;
revoke all on function public.staff_reject_borrow_request(uuid) from public, anon;
revoke all on function public.staff_approve_return_request(uuid, uuid) from public, anon;
revoke all on function public.staff_reject_return_request(uuid) from public, anon;
revoke all on function public.borrow_book(uuid, uuid, timestamptz) from public, anon;
revoke all on function public.return_book(uuid) from public, anon;
revoke all on function public.admin_add_book(text, text, text, text, text, integer) from public, anon;
revoke all on function public.admin_add_book_copies(uuid, integer) from public, anon;
revoke all on function public.admin_add_borrower(text, text) from public, anon;
revoke all on function public.admin_update_borrower(uuid, text, text) from public, anon;
revoke all on function public.admin_set_borrower_active(uuid, boolean) from public, anon;
revoke all on function public.seed_demo_library() from public, anon;
grant execute on function public.is_library_staff() to authenticated;
grant execute on function public.is_library_admin() to authenticated;
grant execute on function public.admin_promote_staff_to_admin(uuid) to authenticated;
grant execute on function public.customer_submit_borrow_request(text, text, text, integer, uuid) to anon, authenticated;
grant execute on function public.customer_submit_return_request(text, text, uuid) to anon, authenticated;
grant execute on function public.staff_approve_borrow_request(uuid) to authenticated;
grant execute on function public.staff_reject_borrow_request(uuid) to authenticated;
grant execute on function public.staff_approve_return_request(uuid, uuid) to authenticated;
grant execute on function public.staff_reject_return_request(uuid) to authenticated;
grant execute on function public.borrow_book(uuid, uuid, timestamptz) to authenticated;
grant execute on function public.return_book(uuid) to authenticated;
grant execute on function public.admin_add_book(text, text, text, text, text, integer) to authenticated;
grant execute on function public.admin_add_book_copies(uuid, integer) to authenticated;
grant execute on function public.admin_add_borrower(text, text) to authenticated;
grant execute on function public.admin_update_borrower(uuid, text, text) to authenticated;
grant execute on function public.admin_set_borrower_active(uuid, boolean) to authenticated;
grant execute on function public.seed_demo_library() to authenticated;

-- Public covers are readable by anyone; only admins may add, replace, or remove them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('book-covers', 'book-covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "public read book covers" on storage.objects;
drop policy if exists "admins upload book covers" on storage.objects;
drop policy if exists "admins update book covers" on storage.objects;
drop policy if exists "admins delete book covers" on storage.objects;
create policy "public read book covers" on storage.objects for select to public using (bucket_id = 'book-covers');
create policy "admins upload book covers" on storage.objects for insert to authenticated with check (bucket_id = 'book-covers' and public.is_library_admin());
create policy "admins update book covers" on storage.objects for update to authenticated using (bucket_id = 'book-covers' and public.is_library_admin()) with check (bucket_id = 'book-covers' and public.is_library_admin());
create policy "admins delete book covers" on storage.objects for delete to authenticated using (bucket_id = 'book-covers' and public.is_library_admin());

-- Signup creates librarian accounts. Promote your first administrator in the SQL editor:
-- update public.users set role = 'admin'
-- where email = 'your-admin-email@example.com';
