export type Book = {
  id: string
  title: string
  author: string
  category: string
  isbn: string
  cover: string
  color: string
  total_copies: number
  available_copies: number
  created_at?: string
}

export type Borrower = {
  id: string
  name: string
  email: string
  initials: string
  color: string
}

export type Loan = {
  id: string
  book_id: string
  borrower_id: string
  status: 'borrowed' | 'returned'
  borrowed_at: string
  due_at: string
  returned_at?: string | null
  book?: Book
  borrower?: Borrower
}

export type StaffRole = 'admin' | 'librarian'
export type StaffProfile = {
  id: string
  full_name: string
  role: StaffRole
  email?: string
}
