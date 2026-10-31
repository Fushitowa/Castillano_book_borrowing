-- Install public customer borrow/return requests. Safe to run again.
create table if not exists public.borrow_requests (
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

create or replace function public.customer_submit_borrow_request(p_customer_name text, p_customer_email text, p_book_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare request_id uuid; pending_count integer;
begin
  if nullif(trim(p_customer_name), '') is null or length(trim(p_customer_name)) > 120 then raise exception 'Enter your name (up to 120 characters)'; end if;
  if nullif(trim(p_customer_email), '') is null or length(trim(p_customer_email)) > 254
     or trim(p_customer_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email address'; end if;
  if not exists(select 1 from public.books where id = p_book_id and available_copies > 0) then raise exception 'This book is currently unavailable'; end if;
  select count(*) into pending_count from public.borrow_requests where lower(customer_email) = lower(trim(p_customer_email)) and status = 'pending';
  if pending_count >= 10 then raise exception 'You already have several requests awaiting review'; end if;
  insert into public.borrow_requests(book_id, customer_name, customer_email) values (p_book_id, trim(p_customer_name), lower(trim(p_customer_email))) returning id into request_id;
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
  new_loan_id := public.borrow_book(request_row.book_id, borrower_id, now() + interval '14 days');
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
revoke all on function public.customer_submit_borrow_request(text, text, uuid) from public;
revoke all on function public.customer_submit_return_request(text, text, uuid) from public;
revoke all on function public.staff_approve_borrow_request(uuid) from public, anon;
revoke all on function public.staff_reject_borrow_request(uuid) from public, anon;
revoke all on function public.staff_approve_return_request(uuid, uuid) from public, anon;
revoke all on function public.staff_reject_return_request(uuid) from public, anon;
grant execute on function public.customer_submit_borrow_request(text, text, uuid) to anon, authenticated;
grant execute on function public.customer_submit_return_request(text, text, uuid) to anon, authenticated;
grant execute on function public.staff_approve_borrow_request(uuid) to authenticated;
grant execute on function public.staff_reject_borrow_request(uuid) to authenticated;
grant execute on function public.staff_approve_return_request(uuid, uuid) to authenticated;
grant execute on function public.staff_reject_return_request(uuid) to authenticated;
