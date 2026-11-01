export type Book = {
  id: string
  title: string
  author: string
  category: string
  isbn: string | null
  cover: string | null
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
  is_active?: boolean
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

export type BorrowRequest = {
  id: string
  book_id: string
  customer_name: string
  customer_email: string
  customer_address: string
  requested_days: number
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  reviewed_at?: string | null
  reviewed_by?: string | null
  loan_id?: string | null
  book?: Pick<Book, 'id' | 'title' | 'author' | 'cover' | 'color'>
}

export type ReturnRequest = {
  id: string
  book_id: string
  customer_name: string
  customer_email: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  reviewed_at?: string | null
  reviewed_by?: string | null
  loan_id?: string | null
  book?: Pick<Book, 'id' | 'title' | 'author' | 'cover' | 'color'>
}
