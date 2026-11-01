-- Permanent starter catalog. Run after schema.sql to add the standard books and manga.
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
