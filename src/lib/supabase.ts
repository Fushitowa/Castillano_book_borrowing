import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Book, Borrower, BorrowRequest, Loan, ReturnRequest, StaffProfile } from '../types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

export async function loadStaffProfile(userId: string): Promise<StaffProfile> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.from('users').select('id, full_name, role, email').eq('id', userId).single()
  if (error) throw error
  return data as StaffProfile
}

export async function getAdminSetupAvailability(): Promise<boolean> {
  if (!supabase) return false
  const { data, error } = await supabase.rpc('admin_setup_available')
  if (error) throw error
  return Boolean(data)
}

export async function loadLibrary() {
  if (!supabase) return null
  const catalogCheck = await supabase.from('books').select('id').limit(1)
  if (catalogCheck.error) throw catalogCheck.error
  if (!catalogCheck.data?.length) {
    const { error } = await supabase.rpc('seed_demo_library')
    if (error) throw error
  }
  const [books, loans] = await Promise.all([
    supabase.from('books').select('*').order('title'),
    supabase.from('loans').select('*, book:books(*), borrower:borrowers(*)').order('borrowed_at', { ascending: false }),
  ])
  if (books.error) throw books.error
  if (loans.error) throw loans.error
  const borrowers = await supabase.from('borrowers').select('*').order('name')
  if (borrowers.error) throw borrowers.error
  const bookRows = books.data as Book[]
  const borrowerMap = new Map((borrowers.data ?? []).map((borrower) => [borrower.id, borrower]))
  const hydratedLoans = (loans.data as Loan[]).map((loan) => ({ ...loan, borrower: borrowerMap.get(loan.borrower_id) }))
  return { books: bookRows, loans: hydratedLoans, borrowers: borrowers.data as Borrower[] }
}

export async function loadPublicBooks(): Promise<Book[]> {
  if (!supabase) throw new Error('The library catalog is unavailable right now.')
  const { data, error } = await supabase.from('books').select('id, title, author, category, isbn, cover, color, total_copies, available_copies, created_at').order('title')
  if (error) throw error
  return data as Book[]
}

export async function submitBorrowRequest(customerName: string, customerEmail: string, customerAddress: string, requestedDays: number, bookId: string) {
  if (!supabase) throw new Error('The library request service is unavailable right now.')
  const { error } = await supabase.rpc('customer_submit_borrow_request', {
    p_customer_name: customerName,
    p_customer_email: customerEmail,
    p_customer_address: customerAddress,
    p_requested_days: requestedDays,
    p_book_id: bookId,
  })
  if (error) throw error
}

export async function submitReturnRequest(customerName: string, customerEmail: string, bookId: string) {
  if (!supabase) throw new Error('The library request service is unavailable right now.')
  const { error } = await supabase.rpc('customer_submit_return_request', {
    p_customer_name: customerName,
    p_customer_email: customerEmail,
    p_book_id: bookId,
  })
  if (error) throw error
}

export async function loadBorrowRequests(): Promise<BorrowRequest[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('borrow_requests').select('*, book:books(id, title, author, cover, color)').order('requested_at', { ascending: false })
  if (error) throw error
  return data as BorrowRequest[]
}

export async function loadReturnRequests(): Promise<ReturnRequest[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('return_requests').select('*, book:books(id, title, author, cover, color)').order('requested_at', { ascending: false })
  if (error) throw error
  return data as ReturnRequest[]
}

export async function reviewBorrowRequest(requestId: string, decision: 'approve' | 'reject') {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.rpc(decision === 'approve' ? 'staff_approve_borrow_request' : 'staff_reject_borrow_request', { p_request_id: requestId })
  if (error) throw error
}

export async function reviewReturnRequest(requestId: string, loanId: string | null, decision: 'approve' | 'reject') {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.rpc(decision === 'approve' ? 'staff_approve_return_request' : 'staff_reject_return_request', {
    p_request_id: requestId,
    ...(decision === 'approve' ? { p_loan_id: loanId } : {}),
  })
  if (error) throw error
}

export async function uploadBookCover(file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured')
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from('book-covers').upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return supabase.storage.from('book-covers').getPublicUrl(path).data.publicUrl
}

export async function addBook(input: { title: string; author: string; category: string; isbn: string | null; cover: string | null; totalCopies: number }) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.rpc('admin_add_book', {
    p_title: input.title,
    p_author: input.author,
    p_category: input.category,
    p_isbn: input.isbn,
    p_cover: input.cover,
    p_total_copies: input.totalCopies,
  })
  if (error) throw error
}

export async function addBookCopies(bookId: string, quantity: number) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.rpc('admin_add_book_copies', { p_book_id: bookId, p_quantity: quantity })
  if (error) throw error
}

export async function addBorrower(name: string, email: string) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.rpc('admin_add_borrower', { p_name: name, p_email: email })
  if (error) throw error
}

export async function updateBorrower(id: string, name: string, email: string) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.rpc('admin_update_borrower', { p_borrower_id: id, p_name: name, p_email: email })
  if (error) throw error
}

export async function setBorrowerActive(id: string, active: boolean) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.rpc('admin_set_borrower_active', { p_borrower_id: id, p_is_active: active })
  if (error) throw error
}

export async function createAdminAccount(fullName: string, email: string, password: string) {
  if (!supabase || !url || !key) throw new Error('Supabase is not configured')
  // Keep the current administrator session separate from the new signup.
  const registrationClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data, error } = await registrationClient.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
  if (error) throw error
  if (!data.user) throw new Error('Supabase did not return the new account. Please try again.')
  if (data.user.identities?.length === 0) throw new Error('An account with this email already exists.')
  const { error: roleError } = await supabase.rpc('admin_promote_staff_to_admin', { p_user_id: data.user.id })
  if (roleError) throw roleError
  return { confirmationRequired: !data.session }
}

export async function returnLoan(loanId: string) {
  if (!supabase) return null
  const { error } = await supabase.rpc('return_book', { p_loan_id: loanId })
  if (error) throw error
}
