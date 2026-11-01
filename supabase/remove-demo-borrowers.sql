-- Remove only the fixed demo checkout and reader rows from the original sample seed.
-- Real borrower records and customer loans are left alone.
begin;

with demo_loans as (
  delete from public.loans
  where id in (
    '00000000-0000-4000-8000-000000000021',
    '00000000-0000-4000-8000-000000000022',
    '00000000-0000-4000-8000-000000000023',
    '00000000-0000-4000-8000-000000000024',
    '00000000-0000-4000-8000-000000000025',
    '00000000-0000-4000-8000-000000000026'
  )
  returning book_id, status
), restored_copies as (
  select book_id, count(*) filter (where status = 'borrowed')::integer as quantity
  from demo_loans group by book_id
)
update public.books b
set available_copies = least(b.total_copies, b.available_copies + restored_copies.quantity)
from restored_copies
where b.id = restored_copies.book_id;

delete from public.borrowers b
where b.id in (
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000012',
  '00000000-0000-4000-8000-000000000013',
  '00000000-0000-4000-8000-000000000014',
  '00000000-0000-4000-8000-000000000015'
)
and b.email in (
  'olivia.rhye@email.com',
  'phoenix.baker@email.com',
  'lana.steiner@email.com',
  'demi.wilkinson@email.com',
  'candice.wu@email.com'
)
and not exists (select 1 from public.loans l where l.borrower_id = b.id);

commit;
