-- Install public customer borrow/return requests. Safe to run again.
-- Add the permanent starter catalog. Existing titles/stock with these ISBNs are preserved.
insert into public.books (id, title, author, category, isbn, cover, color, total_copies, available_copies) values
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
on conflict (isbn) do nothing;

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
alter table public.borrowers add column if not exists is_active boolean not null default true;

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

create index if not exists borrow_requests_status_requested_idx on public.borrow_requests(status, requested_at desc);
create index if not exists return_requests_status_requested_idx on public.return_requests(status, requested_at desc);
create unique index if not exists borrow_requests_pending_email_book_idx on public.borrow_requests(lower(customer_email), book_id) where status = 'pending';
create unique index if not exists return_requests_pending_email_book_idx on public.return_requests(lower(customer_email), book_id) where status = 'pending';

drop function if exists public.customer_submit_borrow_request(text, text, uuid);
create or replace function public.customer_submit_borrow_request(p_customer_name text, p_customer_email text, p_customer_address text, p_requested_days integer, p_book_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare request_id uuid; pending_count integer;
begin
  if nullif(trim(p_customer_name), '') is null or length(trim(p_customer_name)) > 120 then raise exception 'Enter your name (up to 120 characters)'; end if;
  if nullif(trim(p_customer_email), '') is null or length(trim(p_customer_email)) > 254
     or trim(p_customer_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email address'; end if;
  if nullif(trim(p_customer_address), '') is null or length(trim(p_customer_address)) > 300 then raise exception 'Enter your address (up to 300 characters)'; end if;
  if p_requested_days is null or p_requested_days < 1 or p_requested_days > 30 then raise exception 'Choose a borrowing period from 1 to 30 days'; end if;
  if not exists(select 1 from public.books where id = p_book_id and available_copies > 0) then raise exception 'This book is currently unavailable'; end if;
  select count(*) into pending_count from public.borrow_requests where lower(customer_email) = lower(trim(p_customer_email)) and status = 'pending';
  if pending_count >= 10 then raise exception 'You already have several requests awaiting review'; end if;
  insert into public.borrow_requests(book_id, customer_name, customer_email, customer_address, requested_days) values (p_book_id, trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_address), p_requested_days) returning id into request_id;
  return request_id;
end; $$;

create or replace function public.customer_submit_return_request(p_customer_name text, p_customer_email text, p_book_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare request_id uuid; pending_count integer;
begin
  if nullif(trim(p_customer_name), '') is null or length(trim(p_customer_name)) > 120 then raise exception 'Enter your name (up to 120 characters)'; end if;
  if nullif(trim(p_customer_email), '') is null or length(trim(p_customer_email)) > 254
     or trim(p_customer_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email address'; end if;
  select count(*) into pending_count from public.return_requests where lower(customer_email) = lower(trim(p_customer_email)) and status = 'pending';
  if pending_count >= 10 then raise exception 'You already have several return notices awaiting review'; end if;
  insert into public.return_requests(book_id, customer_name, customer_email) values (p_book_id, trim(p_customer_name), lower(trim(p_customer_email))) returning id into request_id;
  return request_id;
end; $$;

create or replace function public.staff_approve_borrow_request(p_request_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare request_row public.borrow_requests%rowtype; borrower_id uuid; new_loan_id uuid; name_parts text[];
begin
  if auth.uid() is null or not public.is_library_staff() then raise exception 'Staff sign-in is required'; end if;
  select * into request_row from public.borrow_requests where id = p_request_id for update;
  if not found or request_row.status <> 'pending' then raise exception 'Borrow request is missing or already reviewed'; end if;
  name_parts := regexp_split_to_array(trim(request_row.customer_name), '[[:space:]]+');
  insert into public.borrowers(name, email, initials, color, is_active)
  values (request_row.customer_name, request_row.customer_email, upper(left(name_parts[1], 1) || left(name_parts[array_length(name_parts, 1)], 1)), 'blue', true)
  on conflict(email) do update set is_active = true returning id into borrower_id;
  new_loan_id := public.borrow_book(request_row.book_id, borrower_id, now() + make_interval(days => request_row.requested_days));
  update public.borrow_requests set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), loan_id = new_loan_id where id = p_request_id;
  return new_loan_id;
end; $$;

create or replace function public.staff_reject_borrow_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_library_staff() then raise exception 'Staff sign-in is required'; end if;
  update public.borrow_requests set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid() where id = p_request_id and status = 'pending';
  if not found then raise exception 'Borrow request is missing or already reviewed'; end if;
end; $$;

create or replace function public.staff_approve_return_request(p_request_id uuid, p_loan_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare request_row public.return_requests%rowtype; matching_loan_id uuid;
begin
  if auth.uid() is null or not public.is_library_staff() then raise exception 'Staff sign-in is required'; end if;
  select * into request_row from public.return_requests where id = p_request_id for update;
  if not found or request_row.status <> 'pending' then raise exception 'Return notice is missing or already reviewed'; end if;
  select l.id into matching_loan_id from public.loans l join public.borrowers b on b.id = l.borrower_id
  where l.id = p_loan_id and l.book_id = request_row.book_id and l.status = 'borrowed' and lower(b.email) = lower(request_row.customer_email) for update of l;
  if matching_loan_id is null then raise exception 'The selected loan does not match this return notice'; end if;
  perform public.return_book(matching_loan_id);
  update public.return_requests set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), loan_id = matching_loan_id where id = p_request_id;
end; $$;

create or replace function public.staff_reject_return_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_library_staff() then raise exception 'Staff sign-in is required'; end if;
  update public.return_requests set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid() where id = p_request_id and status = 'pending';
  if not found then raise exception 'Return notice is missing or already reviewed'; end if;
end; $$;

alter table public.borrow_requests enable row level security;
alter table public.return_requests enable row level security;
alter table public.books enable row level security;
drop policy if exists "staff read borrow requests" on public.borrow_requests;
drop policy if exists "staff read return requests" on public.return_requests;
drop policy if exists "public demo books" on public.books;
drop policy if exists "staff add books" on public.books;
create policy "staff read borrow requests" on public.borrow_requests for select to authenticated using (public.is_library_staff());
create policy "staff read return requests" on public.return_requests for select to authenticated using (public.is_library_staff());

drop policy if exists "public catalog books" on public.books;
create policy "public catalog books" on public.books for select to anon, authenticated using (true);
grant select on public.books to anon;
revoke insert, update, delete on public.books from anon, authenticated;
revoke all on public.borrow_requests, public.return_requests from anon, authenticated;
grant select on public.borrow_requests, public.return_requests to authenticated;
revoke all on function public.customer_submit_borrow_request(text, text, text, integer, uuid) from public;
revoke all on function public.customer_submit_return_request(text, text, uuid) from public;
revoke all on function public.staff_approve_borrow_request(uuid) from public, anon;
revoke all on function public.staff_reject_borrow_request(uuid) from public, anon;
revoke all on function public.staff_approve_return_request(uuid, uuid) from public, anon;
revoke all on function public.staff_reject_return_request(uuid) from public, anon;
grant execute on function public.customer_submit_borrow_request(text, text, text, integer, uuid) to anon, authenticated;
grant execute on function public.customer_submit_return_request(text, text, uuid) to anon, authenticated;
grant execute on function public.staff_approve_borrow_request(uuid) to authenticated;
grant execute on function public.staff_reject_borrow_request(uuid) to authenticated;
grant execute on function public.staff_approve_return_request(uuid, uuid) to authenticated;
grant execute on function public.staff_reject_return_request(uuid) to authenticated;
