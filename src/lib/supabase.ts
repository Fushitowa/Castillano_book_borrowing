import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Book, Borrower, Loan, StaffProfile } from '../types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

export async function loadStaffProfile(userId: string): Promise<StaffProfile> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.from('user_profiles').select('id, full_name, role').eq('id', userId).single()
  if (error) throw error
  return data as StaffProfile
}

export async function loadLibrary() {
  if (!supabase) return null
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

export async function createLoan(bookId: string, borrowerId: string, dueAt: string) {
  if (!supabase) return null
  const { error } = await supabase.rpc('borrow_book', { p_book_id: bookId, p_borrower_id: borrowerId, p_due_at: dueAt })
  if (error) throw error
}

export async function returnLoan(loanId: string) {
  if (!supabase) return null
  const { error } = await supabase.rpc('return_book', { p_loan_id: loanId })
  if (error) throw error
}
