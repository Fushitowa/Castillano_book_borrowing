import type { Book, Borrower, Loan } from './types'

export const initialBooks: Book[] = [
  { id: 'b1', title: 'The Creative Act', author: 'Rick Rubin', category: 'Creativity', isbn: '978-0593652886', cover: 'https://covers.openlibrary.org/b/isbn/9780593652886-L.jpg', color: '#dec8b4', total_copies: 8, available_copies: 7 },
  { id: 'b2', title: 'Atomic Habits', author: 'James Clear', category: 'Self growth', isbn: '978-0735211292', cover: 'https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg', color: '#d5e3f6', total_copies: 12, available_copies: 11 },
  { id: 'b3', title: 'Educated', author: 'Tara Westover', category: 'Memoir', isbn: '978-0399590504', cover: 'https://covers.openlibrary.org/b/isbn/9780399590504-L.jpg', color: '#b9c2b6', total_copies: 7, available_copies: 6 },
  { id: 'b4', title: 'The Midnight Library', author: 'Matt Haig', category: 'Fiction', isbn: '978-0525559474', cover: 'https://covers.openlibrary.org/b/isbn/9780525559474-L.jpg', color: '#acb5cd', total_copies: 10, available_copies: 9 },
  { id: 'b5', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', category: 'Psychology', isbn: '978-0374533557', cover: 'https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg', color: '#e6d2b1', total_copies: 6, available_copies: 5 },
  { id: 'b6', title: 'Maybe You Should Talk to Someone', author: 'Lori Gottlieb', category: 'Psychology', isbn: '978-1328662057', cover: 'https://covers.openlibrary.org/b/isbn/9781328662057-L.jpg', color: '#d5b7ad', total_copies: 9, available_copies: 8 },
]

export const initialBorrowers: Borrower[] = [
  { id: 'm1', name: 'Olivia Rhye', email: 'olivia.rhye@email.com', initials: 'OR', color: 'lavender' },
  { id: 'm2', name: 'Phoenix Baker', email: 'phoenix.baker@email.com', initials: 'PB', color: 'peach' },
  { id: 'm3', name: 'Lana Steiner', email: 'lana.steiner@email.com', initials: 'LS', color: 'mint' },
  { id: 'm4', name: 'Demi Wilkinson', email: 'demi.wilkinson@email.com', initials: 'DW', color: 'blue' },
  { id: 'm5', name: 'Candice Wu', email: 'candice.wu@email.com', initials: 'CW', color: 'pink' },
]

const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString() }
export const initialLoans: Loan[] = [
  { id: 'l1', book_id: 'b1', borrower_id: 'm1', status: 'borrowed', borrowed_at: day(-7), due_at: day(7) },
  { id: 'l2', book_id: 'b2', borrower_id: 'm2', status: 'borrowed', borrowed_at: day(-12), due_at: day(-2) },
  { id: 'l3', book_id: 'b3', borrower_id: 'm3', status: 'borrowed', borrowed_at: day(-5), due_at: day(9) },
  { id: 'l4', book_id: 'b4', borrower_id: 'm4', status: 'borrowed', borrowed_at: day(-3), due_at: day(11) },
  { id: 'l5', book_id: 'b5', borrower_id: 'm5', status: 'borrowed', borrowed_at: day(-10), due_at: day(4) },
  { id: 'l6', book_id: 'b6', borrower_id: 'm1', status: 'borrowed', borrowed_at: day(-4), due_at: day(10) },
]
