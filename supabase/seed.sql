-- Optional sample catalog. Run after schema.sql for a populated demo project.
insert into public.books (id, title, author, category, isbn, cover, color, total_copies, available_copies) values
('00000000-0000-4000-8000-000000000001', 'The Creative Act', 'Rick Rubin', 'Creativity', '978-0593652886', 'https://covers.openlibrary.org/b/isbn/9780593652886-L.jpg', '#dec8b4', 8, 7),
('00000000-0000-4000-8000-000000000002', 'Atomic Habits', 'James Clear', 'Self growth', '978-0735211292', 'https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg', '#d5e3f6', 12, 11),
('00000000-0000-4000-8000-000000000003', 'Educated', 'Tara Westover', 'Memoir', '978-0399590504', 'https://covers.openlibrary.org/b/isbn/9780399590504-L.jpg', '#b9c2b6', 7, 6),
('00000000-0000-4000-8000-000000000004', 'The Midnight Library', 'Matt Haig', 'Fiction', '978-0525559474', 'https://covers.openlibrary.org/b/isbn/9780525559474-L.jpg', '#acb5cd', 10, 9),
('00000000-0000-4000-8000-000000000005', 'Thinking, Fast and Slow', 'Daniel Kahneman', 'Psychology', '978-0374533557', 'https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg', '#e6d2b1', 6, 5),
('00000000-0000-4000-8000-000000000006', 'Maybe You Should Talk to Someone', 'Lori Gottlieb', 'Psychology', '978-1328662057', 'https://covers.openlibrary.org/b/isbn/9781328662057-L.jpg', '#d5b7ad', 9, 8),
('00000000-0000-4000-8000-000000000007', 'The Hobbit', 'J.R.R. Tolkien', 'Fantasy', '9780547928227', 'https://covers.openlibrary.org/b/isbn/9780547928227-L.jpg', '#bfd0ad', 8, 8),
('00000000-0000-4000-8000-000000000008', 'Pride and Prejudice', 'Jane Austen', 'Classics', '9780141439518', 'https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg', '#d9c3ce', 5, 5),
('00000000-0000-4000-8000-000000000009', 'The Book Thief', 'Markus Zusak', 'Historical fiction', '9780375842207', 'https://covers.openlibrary.org/b/isbn/9780375842207-L.jpg', '#c6c8ce', 6, 6),
('00000000-0000-4000-8000-000000000010', 'The Alchemist', 'Paulo Coelho', 'Fiction', '9780062315007', 'https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg', '#dcc590', 7, 7)
on conflict (id) do nothing;

insert into public.borrowers (id, name, email, initials, color) values
('00000000-0000-4000-8000-000000000011', 'Olivia Rhye', 'olivia.rhye@email.com', 'OR', 'lavender'),
('00000000-0000-4000-8000-000000000012', 'Phoenix Baker', 'phoenix.baker@email.com', 'PB', 'peach'),
('00000000-0000-4000-8000-000000000013', 'Lana Steiner', 'lana.steiner@email.com', 'LS', 'mint'),
('00000000-0000-4000-8000-000000000014', 'Demi Wilkinson', 'demi.wilkinson@email.com', 'DW', 'blue'),
('00000000-0000-4000-8000-000000000015', 'Candice Wu', 'candice.wu@email.com', 'CW', 'pink')
on conflict (id) do nothing;

insert into public.loans (id, book_id, borrower_id, status, borrowed_at, due_at) values
('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'borrowed', now() - interval '7 days', now() + interval '7 days'),
('00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000012', 'borrowed', now() - interval '12 days', now() - interval '2 days'),
('00000000-0000-4000-8000-000000000023', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000013', 'borrowed', now() - interval '5 days', now() + interval '9 days'),
('00000000-0000-4000-8000-000000000024', '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000014', 'borrowed', now() - interval '3 days', now() + interval '11 days'),
('00000000-0000-4000-8000-000000000025', '00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000015', 'borrowed', now() - interval '10 days', now() + interval '4 days'),
('00000000-0000-4000-8000-000000000026', '00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000011', 'borrowed', now() - interval '4 days', now() + interval '10 days')
on conflict (id) do nothing;
