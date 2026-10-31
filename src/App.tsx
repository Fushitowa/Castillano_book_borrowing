import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowDownLeft, ArrowUpRight, Bell, BookOpen, BookPlus, CalendarDays, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Command, Filter, LayoutDashboard, Library, LogOut, Menu, MoreHorizontal, Plus, Search, Settings2, ShieldCheck, Undo2, Users, X } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { initialBooks, initialBorrowers, initialLoans } from './data'
import { addBook as addBookToSupabase, addBookCopies as addCopiesInSupabase, addBorrower as addBorrowerToSupabase, createAdminAccount as createAdminAccountInSupabase, createLoan, getAdminSetupAvailability, loadBorrowRequests, loadLibrary, loadReturnRequests, loadStaffProfile, returnLoan, reviewBorrowRequest, reviewReturnRequest, setBorrowerActive, supabase, updateBorrower as updateBorrowerInSupabase, uploadBookCover } from './lib/supabase'
import LoginScreen, { demoProfile } from './LoginScreen'
import AdminPortal from './AdminPortal'
import RequestDesk from './RequestDesk'
import type { NewBookInput } from './AdminPortal'
import type { Book, Borrower, BorrowRequest, Loan, ReturnRequest, StaffProfile, StaffRole } from './types'

type Page = 'Dashboard' | 'Books' | 'Borrowing' | 'Requests' | 'Admin portal'
const currencyDate = (date: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(date))
const isOverdue = (loan: Loan) => loan.status === 'borrowed' && new Date(loan.due_at).getTime() < Date.now()
const daysLeft = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)

function App() {
  const [staff, setStaff] = useState<StaffProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!supabase)
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')
  const [adminSetupAvailable, setAdminSetupAvailable] = useState(false)
  const [page, setPage] = useState<Page>('Dashboard')
  const [books, setBooks] = useState(initialBooks)
  const [borrowers, setBorrowers] = useState(initialBorrowers)
  const [loans, setLoans] = useState(initialLoans)
  const [borrowRequests, setBorrowRequests] = useState<BorrowRequest[]>([])
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All books')
  const [modal, setModal] = useState(false)
  const [utilityPanel, setUtilityPanel] = useState<'settings' | 'help' | null>(null)
  const [selectedBook, setSelectedBook] = useState('')
  const [selectedBorrower, setSelectedBorrower] = useState('')
  const [selectedAdminBookId, setSelectedAdminBookId] = useState('')
  const [dueDate, setDueDate] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 14); return date.toISOString().slice(0, 10) })
  const [loading, setLoading] = useState(false)
  const [adminBusy, setAdminBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const knownPendingRequests = useRef<number | null>(null)

  useEffect(() => {
    const authClient = supabase
    if (!authClient) return
    let mounted = true
    const initializeAuth = async () => {
      const { data, error } = await authClient.auth.getSession()
      if (!mounted) return
      if (error) setAuthError(error.message)
      try { setAdminSetupAvailable(await getAdminSetupAvailability()) } catch { setAdminSetupAvailable(false) }
      if (!mounted) return
      if (data.session) {
        setSession(data.session)
        try { setStaff(await loadStaffProfile(data.session.user.id)) }
        catch { setAuthError('Your account does not have a staff profile yet. Ask an administrator to set it up.') }
      }
      setAuthReady(true)
    }
    void initializeAuth()
    const { data: { subscription } } = authClient.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      if (!nextSession) {
        setStaff(null)
        knownPendingRequests.current = null
        setAuthReady(true)
        return
      }
      setAuthReady(false)
      window.setTimeout(() => {
        void loadStaffProfile(nextSession.user.id).then((profile) => {
          if (mounted) { setStaff(profile); setAuthError(''); setAuthReady(true) }
        }).catch(() => {
          if (mounted) { setStaff(null); setAuthError('Your account does not have a staff profile yet. Ask an administrator to set it up.'); setAuthReady(true) }
        })
      }, 0)
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  const sync = async () => {
    if (!supabase) return
    try {
      const data = await loadLibrary()
      if (data) {
        setBooks(data.books)
        setLoans(data.loans)
        setBorrowers(data.borrowers)
      }
      if (data && supabase) {
        const [borrowRows, returnRows] = await Promise.all([loadBorrowRequests(), loadReturnRequests()])
        setBorrowRequests(borrowRows)
        setReturnRequests(returnRows)
        const pending = borrowRows.filter((request) => request.status === 'pending').length + returnRows.filter((request) => request.status === 'pending').length
        if (knownPendingRequests.current !== null && pending > knownPendingRequests.current) setToast(`${pending - knownPendingRequests.current} new customer request${pending - knownPendingRequests.current === 1 ? '' : 's'} received`)
        knownPendingRequests.current = pending
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not load the library')
    }
  }
  useEffect(() => { if (staff && session) void sync() }, [staff?.id, session?.user.id])
  useEffect(() => {
    if (!staff || !session || !supabase) return
    let active = true
    const refreshRequests = async () => {
      try {
        const [borrows, returns] = await Promise.all([loadBorrowRequests(), loadReturnRequests()])
        if (active) {
          setBorrowRequests(borrows); setReturnRequests(returns)
          const pending = borrows.filter((request) => request.status === 'pending').length + returns.filter((request) => request.status === 'pending').length
          if (knownPendingRequests.current !== null && pending > knownPendingRequests.current) setToast(`${pending - knownPendingRequests.current} new customer request${pending - knownPendingRequests.current === 1 ? '' : 's'} received`)
          knownPendingRequests.current = pending
        }
      } catch { /* The initial sync reports setup errors; polling stays quiet. */ }
    }
    const interval = window.setInterval(() => void refreshRequests(), 15000)
    return () => { active = false; window.clearInterval(interval) }
  }, [staff?.id, session?.user.id])
  useEffect(() => { if (staff?.role !== 'admin' && page === 'Admin portal') setPage('Dashboard') }, [staff?.role, page])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3200); return () => window.clearTimeout(timer) }, [toast])
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        document.querySelector<HTMLInputElement>('.search-box input')?.focus()
      }
      if (event.key === 'Escape') { setModal(false); setUtilityPanel(null) }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const activeLoans = useMemo(() => loans.filter((loan) => loan.status === 'borrowed'), [loans])
  const overdueLoans = useMemo(() => activeLoans.filter(isOverdue), [activeLoans])
  const loanRows = useMemo(() => loans.map((loan) => ({ ...loan, book: loan.book ?? books.find((book) => book.id === loan.book_id), borrower: loan.borrower ?? borrowers.find((member) => member.id === loan.borrower_id) })), [loans, books, borrowers])
  const filteredBooks = books.filter((book) => {
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || `${book.title} ${book.author} ${book.category} ${book.isbn}`.toLowerCase().includes(query)
    const matchesFilter = filter === 'All books' || (filter === 'Available' ? book.available_copies > 0 : book.category === filter)
    return matchesSearch && matchesFilter
  })
  const filteredLoans = loanRows.filter((loan) => `${loan.book?.title ?? ''} ${loan.borrower?.name ?? ''} ${loan.borrower?.email ?? ''}`.toLowerCase().includes(search.toLowerCase()))
  const popularBooks = [...books].sort((a, b) => (b.total_copies - b.available_copies) - (a.total_copies - a.available_copies)).slice(0, 4)

  const borrow = async () => {
    if (!selectedBook || !selectedBorrower) return
    const book = books.find((item) => item.id === selectedBook)
    const borrower = borrowers.find((item) => item.id === selectedBorrower)
    if (!book || !borrower || book.available_copies < 1) return
    setLoading(true)
    try {
      if (supabase) {
        await createLoan(book.id, borrower.id, new Date(`${dueDate}T23:59:00`).toISOString())
        await sync()
      } else {
        const due = new Date(`${dueDate}T23:59:00`).toISOString()
        const loan: Loan = { id: `l${Date.now()}`, book_id: book.id, borrower_id: borrower.id, status: 'borrowed', borrowed_at: new Date().toISOString(), due_at: due }
        setLoans((items) => [loan, ...items])
        setBooks((items) => items.map((item) => item.id === book.id ? { ...item, available_copies: item.available_copies - 1 } : item))
      }
      setToast(`“${book.title}” checked out to ${borrower.name}`)
      setModal(false); setSelectedBook(''); setSelectedBorrower('')
    } catch (error) { setToast(error instanceof Error ? error.message : 'Could not complete checkout') }
    finally { setLoading(false) }
  }

  const returnBook = async (loan: Loan & { book?: Book }) => {
    if (supabase) {
      try { await returnLoan(loan.id); await sync(); setToast(`${loan.book?.title ?? 'Book'} marked as returned`) }
      catch (error) { setToast(error instanceof Error ? error.message : 'Could not return this book') }
    } else {
      setLoans((items) => items.map((item) => item.id === loan.id ? { ...item, status: 'returned', returned_at: new Date().toISOString() } : item))
      setBooks((items) => items.map((item) => item.id === loan.book_id ? { ...item, available_copies: Math.min(item.total_copies, item.available_copies + 1) } : item))
      setToast(`${loan.book?.title ?? 'Book'} marked as returned`)
    }
  }

  const addAdminBook = async (input: NewBookInput): Promise<boolean> => {
    if (staff?.role !== 'admin') { setToast('Administrator access is required'); return false }
    setAdminBusy(true)
    try {
      if (supabase) {
        const cover = input.coverFile ? await uploadBookCover(input.coverFile) : null
        await addBookToSupabase({ title: input.title, author: input.author, category: input.category, isbn: input.isbn, totalCopies: input.totalCopies, cover })
        await sync()
      } else {
        if (input.isbn && books.some((book) => book.isbn === input.isbn)) throw new Error('A book with that ISBN is already in the catalog')
        const localBook: Book = { id: `local-book-${Date.now()}`, title: input.title, author: input.author, category: input.category, isbn: input.isbn ?? '', cover: input.coverFile ? URL.createObjectURL(input.coverFile) : '', color: '#d5e3f6', total_copies: input.totalCopies, available_copies: input.totalCopies }
        setBooks((items) => [...items, localBook])
      }
      setToast(`“${input.title}” added to the catalog`)
      return true
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not add this book')
      return false
    } finally { setAdminBusy(false) }
  }

  const addAdminCopies = async (bookId: string, quantity: number): Promise<boolean> => {
    if (staff?.role !== 'admin') { setToast('Administrator access is required'); return false }
    const target = books.find((book) => book.id === bookId)
    if (!target || quantity < 1 || quantity > 500) return false
    setAdminBusy(true)
    try {
      if (supabase) {
        await addCopiesInSupabase(bookId, quantity)
        await sync()
      } else {
        setBooks((items) => items.map((book) => book.id === bookId ? { ...book, total_copies: book.total_copies + quantity, available_copies: book.available_copies + quantity } : book))
      }
      setToast(`${quantity} ${quantity === 1 ? 'copy' : 'copies'} added to “${target.title}”`)
      return true
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not update the copy count')
      return false
    } finally { setAdminBusy(false) }
  }

  const addAdminBorrower = async (name: string, email: string): Promise<boolean> => {
    if (staff?.role !== 'admin') { setToast('Administrator access is required'); return false }
    setAdminBusy(true)
    try {
      if (supabase) {
        await addBorrowerToSupabase(name, email)
        await sync()
      } else {
        if (borrowers.some((borrower) => borrower.email.toLowerCase() === email.toLowerCase())) throw new Error('A borrower with that email already exists')
        const parts = name.trim().split(/\s+/)
        const initials = `${parts[0]?.[0] ?? ''}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase()
        const colors = ['lavender', 'peach', 'mint', 'blue', 'pink']
        const borrower: Borrower = { id: `local-member-${Date.now()}`, name, email, initials, color: colors[borrowers.length % colors.length], is_active: true }
        setBorrowers((items) => [...items, borrower])
      }
      setToast(`${name} added as a borrower`)
      return true
    } catch (error) { setToast(error instanceof Error ? error.message : 'Could not add this borrower'); return false }
    finally { setAdminBusy(false) }
  }

  const updateAdminBorrower = async (id: string, name: string, email: string): Promise<boolean> => {
    if (staff?.role !== 'admin') { setToast('Administrator access is required'); return false }
    setAdminBusy(true)
    try {
      if (supabase) {
        await updateBorrowerInSupabase(id, name, email)
        await sync()
      } else {
        if (borrowers.some((borrower) => borrower.id !== id && borrower.email.toLowerCase() === email.toLowerCase())) throw new Error('A borrower with that email already exists')
        const parts = name.trim().split(/\s+/)
        const initials = `${parts[0]?.[0] ?? ''}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase()
        setBorrowers((items) => items.map((borrower) => borrower.id === id ? { ...borrower, name, email, initials } : borrower))
      }
      setToast('Borrower details updated')
      return true
    } catch (error) { setToast(error instanceof Error ? error.message : 'Could not update this borrower'); return false }
    finally { setAdminBusy(false) }
  }

  const toggleAdminBorrower = async (id: string, isActive: boolean): Promise<boolean> => {
    if (staff?.role !== 'admin') { setToast('Administrator access is required'); return false }
    const borrower = borrowers.find((item) => item.id === id)
    if (!borrower) return false
    if (!isActive && loans.some((loan) => loan.borrower_id === id && loan.status === 'borrowed')) { setToast('Return this borrower’s active books before deactivating the account'); return false }
    setAdminBusy(true)
    try {
      if (supabase) {
        await setBorrowerActive(id, isActive)
        await sync()
      } else setBorrowers((items) => items.map((item) => item.id === id ? { ...item, is_active: isActive } : item))
      setToast(`${borrower.name} ${isActive ? 'reactivated' : 'deactivated'}`)
      return true
    } catch (error) { setToast(error instanceof Error ? error.message : 'Could not update this borrower'); return false }
    finally { setAdminBusy(false) }
  }

  const createAdminAccount = async (fullName: string, email: string, password: string): Promise<boolean> => {
    if (staff?.role !== 'admin') { setToast('Administrator access is required'); return false }
    setAdminBusy(true)
    try {
      const result = await createAdminAccountInSupabase(fullName, email, password)
      setToast(result.confirmationRequired ? 'Admin account created. Email confirmation is required before sign-in.' : 'Admin account created successfully')
      return true
    } catch (error) { setToast(error instanceof Error ? error.message : 'Could not create this Admin account'); return false }
    finally { setAdminBusy(false) }
  }

  const reviewBorrow = async (requestId: string, decision: 'approve' | 'reject') => {
    setAdminBusy(true)
    try {
      await reviewBorrowRequest(requestId, decision)
      await sync()
      setToast(decision === 'approve' ? 'Borrow request approved and checked out' : 'Borrow request declined')
    } catch (error) { setToast(error instanceof Error ? error.message : 'Could not review the borrow request') }
    finally { setAdminBusy(false) }
  }

  const reviewReturn = async (requestId: string, loanId: string | null, decision: 'approve' | 'reject') => {
    setAdminBusy(true)
    try {
      await reviewReturnRequest(requestId, loanId, decision)
      await sync()
      setToast(decision === 'approve' ? 'Return confirmed and book marked available' : 'Return notice declined')
    } catch (error) { setToast(error instanceof Error ? error.message : 'Could not review the return notice') }
    finally { setAdminBusy(false) }
  }

  const signIn = async (email: string, password: string, expectedRole: StaffRole) => {
    if (!supabase) return
    setAuthSubmitting(true); setAuthError(''); setAuthSuccess('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (!data.user) throw new Error('Sign-in did not return a user account.')
      const profile = await loadStaffProfile(data.user.id)
      if (profile.role !== expectedRole) {
        await supabase.auth.signOut()
        throw new Error(`This account is registered as ${profile.role === 'admin' ? 'Admin' : 'Librarian'}. Choose the matching sign-in option.`)
      }
      setSession(data.session); setStaff(profile)
      if (profile.role === 'admin') setAdminSetupAvailable(false)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not sign in. Check your email and password.')
    } finally { setAuthSubmitting(false) }
  }
  const signUp = async (fullName: string, email: string, password: string) => {
    if (!supabase) return
    setAuthSubmitting(true); setAuthError(''); setAuthSuccess('')
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
      if (error) throw error
      setAdminSetupAvailable(false)
      if (data.session && data.user) {
        const profile = await loadStaffProfile(data.user.id)
        setSession(data.session); setStaff(profile)
      } else {
        setAuthSuccess('Account created. Check your email to confirm it, then sign in.')
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not create your account. Please try again.')
    } finally { setAuthSubmitting(false) }
  }
  const signInDemo = (role: StaffRole) => { setAuthError(''); setAuthSuccess(''); setStaff(demoProfile(role)) }
  const signOut = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut()
      if (error) { setToast(error.message); return }
    }
    setStaff(null); setSession(null); setPage('Dashboard'); knownPendingRequests.current = null
  }

  const pendingRequestCount = borrowRequests.filter((request) => request.status === 'pending').length + returnRequests.filter((request) => request.status === 'pending').length
  const nav = [{ name: 'Dashboard' as Page, icon: LayoutDashboard }, { name: 'Books' as Page, icon: Library }, { name: 'Borrowing' as Page, icon: BookOpen }, { name: 'Requests' as Page, icon: Undo2 }, ...(staff?.role === 'admin' ? [{ name: 'Admin portal' as Page, icon: ShieldCheck }] : [])]
  const beginCheckout = (bookId = '') => {
    if (staff?.role === 'admin') return
    setSelectedBook(bookId); setSelectedBorrower(''); setModal(true)
  }
  const manageBookCopies = (bookId: string) => { setSelectedAdminBookId(bookId); setPage('Admin portal') }

  if (!authReady) return <div className="auth-loading"><img src="/jireh-library-logo.jpg" alt="Jireh Library" /><span>Opening your library desk…</span></div>
  if (!staff) return <LoginScreen connected={Boolean(supabase)} adminSetupAvailable={adminSetupAvailable} loading={authSubmitting} error={authError} success={authSuccess} onSignIn={signIn} onSignUp={signUp} onDemoSignIn={signInDemo} />

  const staffInitials = staff.full_name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><img className="brand-logo" src="/jireh-library-logo.jpg" alt="Jireh Library — Provision of Knowledge" /></div>
      <div className="nav-label">MENU</div>
      <nav className="nav-list">{nav.map(({ name, icon: Icon }) => <button key={name} className={`nav-item ${page === name ? 'active' : ''}`} onClick={() => { setPage(name); setSearch(''); setSidebarOpen(false) }}><Icon size={18} strokeWidth={1.9} /><span>{name}</span>{name === 'Borrowing' && overdueLoans.length > 0 && <span className="nav-count">{overdueLoans.length}</span>}{name === 'Requests' && pendingRequestCount > 0 && <span className="nav-count">{pendingRequestCount}</span>}</button>)}</nav>
      <div className="sidebar-spacer" />
      <div className="nav-list bottom-nav"><button className="nav-item" onClick={() => setUtilityPanel('settings')}><Settings2 size={18} /><span>Settings</span></button><button className="nav-item" onClick={() => setUtilityPanel('help')}><CircleHelp size={18} /><span>Help & support</span></button></div>
      <div className="profile"><div className="profile-avatar">{staffInitials}</div><div className="profile-info"><strong>{staff.full_name}</strong><small>{staff.role === 'admin' ? 'Administrator' : 'Librarian'}</small></div><button aria-label="Sign out" title="Sign out" onClick={() => void signOut()} className="icon-button profile-menu"><LogOut size={17} /></button></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb"><button className="mobile-menu icon-button" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Open navigation"><Menu size={20} /></button><span>Library</span><ChevronRight size={14} /><strong>{page}</strong></div><div className="topbar-actions"><div className="today-chip"><CalendarDays size={15} /><span>{new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}</span></div><span className={`role-chip ${staff.role}`}><span />{staff.role === 'admin' ? 'Admin' : 'Librarian'}</span><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setPage(pendingRequestCount > 0 ? 'Requests' : 'Borrowing')}><Bell size={18} />{(overdueLoans.length > 0 || pendingRequestCount > 0) && <i />}</button><div className="top-avatar">{staffInitials}</div></div></header>
      <div className="content-wrap">
        {page === 'Dashboard' && <>
          <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" />{staff.role === 'admin' ? 'ADMIN DASHBOARD' : 'YOUR LIBRARY AT A GLANCE'}</div><h1>{staff.role === 'admin' ? 'Your library dashboard.' : <>A good day to <span>turn a page.</span></>}</h1><p className="welcome-sub">Here’s what’s happening at your library today.</p></div><div className="dashboard-actions">{staff.role === 'admin' ? <button className="secondary-button admin-tools-button" onClick={() => setPage('Admin portal')}><ShieldCheck size={15} /> Admin tools</button> : <button className="primary-button" onClick={() => beginCheckout()}><Plus size={17} /> New checkout</button>}</div></section>
          <section className="stats-grid">
            <StatCard icon={<Library size={18} />} label="Books in collection" value={books.reduce((sum, book) => sum + book.total_copies, 0).toLocaleString()} delta={`${books.length} titles in your catalog`} tone="blue" />
            <StatCard icon={<BookOpen size={18} />} label="Currently borrowed" value={activeLoans.length.toString().padStart(2, '0')} delta="Across your community" tone="violet" />
            <StatCard icon={<Users size={18} />} label="Active readers" value={new Set(activeLoans.map((loan) => loan.borrower_id)).size.toString().padStart(2, '0')} delta="Readers with a book out" tone="mint" />
            <StatCard icon={<Clock3 size={18} />} label="Past due" value={overdueLoans.length.toString().padStart(2, '0')} delta={overdueLoans.length ? 'A friendly follow-up may help' : 'You’re all caught up'} tone="amber" />
          </section>
          <section className="dashboard-grid">
            <div className="panel recent-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>A little look at what’s moving.</p></div><button className="text-button" onClick={() => setPage('Borrowing')}>View all <ArrowUpRight size={15} /></button></div>
              <div className="table-scroll"><table className="activity-table"><thead><tr><th>BOOK & READER</th><th>CHECKED OUT</th><th>DUE DATE</th><th>STATUS</th><th></th></tr></thead><tbody>{loanRows.slice(0, 5).map((loan) => <tr key={loan.id}><td><div className="loan-book-cell"><BookCover book={loan.book} small /><div><strong>{loan.book?.title ?? 'Unknown book'}</strong><small>{loan.borrower?.name ?? 'Unknown reader'}</small></div></div></td><td>{currencyDate(loan.borrowed_at)}</td><td>{currencyDate(loan.due_at)}</td><td><StatusBadge loan={loan} /></td><td><button title="Return book" className="return-mini" disabled={loan.status === 'returned'} onClick={() => void returnBook(loan)}>{loan.status === 'returned' ? <Check size={15} /> : <ArrowDownLeft size={15} />}</button></td></tr>)}</tbody></table>{loanRows.length === 0 && <EmptyState title="No checkouts yet" copy={staff.role === 'admin' ? 'Checkout activity will appear here when books are lent to readers.' : 'Your next favorite read is one checkout away.'} action={staff.role === 'admin' ? undefined : 'Check out a book'} onClick={() => beginCheckout()} />}</div>
            </div>
            <div className="panel popular-panel"><div className="panel-heading"><div><h2>Reader favorites</h2><p>The most borrowed titles.</p></div><button className="icon-button subtle" aria-label="Browse all books" title="Browse all books" onClick={() => setPage('Books')}><MoreHorizontal size={19} /></button></div><div className="favorite-list">{popularBooks.map((book, i) => <div className="favorite-row" key={book.id}><span className="rank">0{i + 1}</span><BookCover book={book} small /><div className="favorite-info"><strong>{book.title}</strong><small>{book.author}</small></div><span className="borrow-count">{book.total_copies - book.available_copies}<small> out</small></span></div>)}</div><button className="panel-footer-link" onClick={() => setPage('Books')}>Browse full collection <ArrowUpRight size={14} /></button></div>
          </section>
          <section className="panel collection-panel"><div className="panel-heading"><div><h2>Recently added</h2><p>Good stories, ready to be found.</p></div><button className="text-button" onClick={() => setPage('Books')}>View collection <ArrowUpRight size={15} /></button></div><div className="book-grid">{books.slice(0, 4).map((book) => <BookTile key={book.id} book={book} isAdmin={staff.role === 'admin'} onBorrow={() => staff.role === 'admin' ? manageBookCopies(book.id) : beginCheckout(book.id)} />)}</div></section>
        </>}
        {page === 'Books' && <><PageHeading eyebrow={staff.role === 'admin' ? 'ADMIN CATALOG' : 'THE COLLECTION'} title={staff.role === 'admin' ? 'Manage your books.' : 'Find your next read.'} copy={staff.role === 'admin' ? 'Add titles, update your stock, and keep your catalog current.' : 'Explore the shelves, see what’s available, and send a good book on its way.'} action={staff.role === 'admin' ? <button className="primary-button" onClick={() => { setSelectedAdminBookId(''); setPage('Admin portal') }}><Plus size={17} /> Add book</button> : <button className="primary-button" onClick={() => beginCheckout()}><Plus size={17} /> New checkout</button>} /><div className="toolbar"><label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, author, ISBN..." /><kbd><Command size={11} /> K</kbd></label><div className="select-wrap"><Filter size={15} /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>All books</option><option>Available</option>{[...new Set(books.map((book) => book.category))].sort().map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={14} /></div><span className="result-count">{filteredBooks.length} titles</span></div><div className="catalog-grid">{filteredBooks.map((book) => <BookTile key={book.id} book={book} isAdmin={staff.role === 'admin'} onBorrow={() => staff.role === 'admin' ? manageBookCopies(book.id) : beginCheckout(book.id)} />)}{!filteredBooks.length && <div className="empty-card"><Search size={22} /><strong>No books found</strong><span>Try another title, author or category.</span></div>}</div></>}
        {page === 'Borrowing' && <><PageHeading eyebrow="THE LENDING DESK" title="Books on the move." copy="Keep track of every checkout and help each story find its way home." action={staff.role === 'admin' ? null : <button className="primary-button" onClick={() => beginCheckout()}><Plus size={17} /> New checkout</button>} /><div className="borrow-summary"><div><span className="summary-icon blue"><BookOpen size={18} /></span><div><strong>{activeLoans.length}</strong><small>Active checkouts</small></div></div><div><span className="summary-icon amber"><Clock3 size={18} /></span><div><strong>{overdueLoans.length}</strong><small>Need a gentle nudge</small></div></div><div><span className="summary-icon mint"><Check size={18} /></span><div><strong>{loans.filter((loan) => loan.status === 'returned').length}</strong><small>Returned this month</small></div></div></div><div className="panel full-table-panel"><div className="panel-heading table-panel-heading"><div><h2>All checkouts</h2><p>Every book and the reader holding it.</p></div><label className="search-box compact"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search checkouts..." /></label></div><div className="table-scroll"><table className="activity-table all-loans"><thead><tr><th>BOOK</th><th>READER</th><th>CHECKED OUT</th><th>DUE DATE</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{filteredLoans.map((loan) => <tr key={loan.id}><td><div className="loan-book-cell"><BookCover book={loan.book} small /><div><strong>{loan.book?.title ?? 'Unknown book'}</strong><small>{loan.book?.author}</small></div></div></td><td><div className="member-cell"><Avatar member={loan.borrower} /><div><strong>{loan.borrower?.name ?? 'Unknown reader'}</strong><small>{loan.borrower?.email}</small></div></div></td><td>{currencyDate(loan.borrowed_at)}</td><td>{currencyDate(loan.due_at)}</td><td><StatusBadge loan={loan} /></td><td>{loan.status === 'borrowed' ? <button className="return-button" onClick={() => void returnBook(loan)}><ArrowDownLeft size={14} /> Return</button> : <span className="returned-label"><Check size={14} /> Returned</span>}</td></tr>)}</tbody></table>{filteredLoans.length === 0 && <EmptyState title="No checkouts match" copy="Try changing your search." action={staff.role === 'admin' ? undefined : 'New checkout'} onClick={() => beginCheckout()} />}</div></div></>}
        {page === 'Requests' && <RequestDesk borrowRequests={borrowRequests} returnRequests={returnRequests} loans={loans} busy={adminBusy} onApproveBorrow={(id) => void reviewBorrow(id, 'approve')} onRejectBorrow={(id) => void reviewBorrow(id, 'reject')} onApproveReturn={(id, loanId) => void reviewReturn(id, loanId, 'approve')} onRejectReturn={(id) => void reviewReturn(id, null, 'reject')} />}
        {page === 'Admin portal' && staff.role === 'admin' && <AdminPortal books={books} preferredBookId={selectedAdminBookId} borrowers={borrowers} loans={loans} busy={adminBusy} onAddBook={addAdminBook} onAddCopies={addAdminCopies} onAddBorrower={addAdminBorrower} onUpdateBorrower={updateAdminBorrower} onToggleBorrower={toggleAdminBorrower} onCreateAdmin={createAdminAccount} />}
        <footer className="footer"><span><span className="footer-mark">b.</span> Made for readers, with care.</span><span>{supabase ? <><span className="connection-dot connected" /> Connected to Supabase</> : <><span className="connection-dot" /> Demo mode · Connect Supabase to save changes</>}</span></footer>
      </div>
    </main>
    {sidebarOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    {utilityPanel && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setUtilityPanel(null) }}><section className="checkout-modal utility-modal" role="dialog" aria-modal="true" aria-labelledby="utility-title"><div className="modal-top"><div className="modal-icon">{utilityPanel === 'settings' ? <Settings2 size={19} /> : <CircleHelp size={19} />}</div><button className="icon-button" aria-label="Close dialog" onClick={() => setUtilityPanel(null)}><X size={19} /></button></div>{utilityPanel === 'settings' ? <><div className="modal-heading"><div className="eyebrow"><span className="eyebrow-line" />ACCOUNT & SYSTEM</div><h2 id="utility-title">Settings</h2><p>Your signed-in library account and connection status.</p></div><div className="utility-details"><div><span>Account</span><strong>{staff.full_name}</strong></div><div><span>Email</span><strong>{staff.email ?? 'Not available'}</strong></div><div><span>Access</span><strong>{staff.role === 'admin' ? 'Administrator' : 'Librarian'}</strong></div><div><span>Database</span><strong>{supabase ? 'Supabase connected' : 'Demo mode (this browser only)'}</strong></div></div></> : <><div className="modal-heading"><div className="eyebrow"><span className="eyebrow-line" />QUICK GUIDE</div><h2 id="utility-title">Help & support</h2><p>How to use the Jireh Library desk.</p></div><div className="utility-help"><p><strong>Books:</strong> Search and filter the catalog. Admins can add titles and copies; Librarians can start checkouts.</p><p><strong>Borrowing:</strong> Review active and overdue loans. Mark a loan returned when a reader brings a book back.</p>{staff.role === 'admin' && <p><strong>Admin portal:</strong> Add books and covers, manage copy counts and borrower records, and create Admin accounts.</p>}<p><strong>Search shortcut:</strong> Press Ctrl+K (or ⌘K on Mac) to focus the catalog search.</p></div></>}<div className="modal-actions"><button className="primary-button" onClick={() => setUtilityPanel(null)}>Done</button></div></section></div>}
    {toast && <div className="toast"><span><Check size={15} /></span>{toast}<button onClick={() => setToast('')} aria-label="Dismiss notification"><X size={15} /></button></div>}
    {modal && staff.role !== 'admin' && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(false) }}><section className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title"><div className="modal-top"><div className="modal-icon"><BookPlus size={19} /></div><button className="icon-button" aria-label="Close dialog" onClick={() => setModal(false)}><X size={19} /></button></div><div className="modal-heading"><div className="eyebrow"><span className="eyebrow-line" />A NEW ADVENTURE</div><h2 id="checkout-title">Check out a book</h2><p>Pair a good story with a curious reader.</p></div><div className="form-field"><label htmlFor="book-select">Choose a book</label><div className="form-select"><BookOpen size={17} /><select id="book-select" value={selectedBook} onChange={(event) => setSelectedBook(event.target.value)}><option value="">Select from the collection</option>{books.map((book) => <option key={book.id} value={book.id} disabled={book.available_copies === 0}>{book.title} — {book.available_copies > 0 ? `${book.available_copies} available` : 'All copies out'}</option>)}</select><ChevronDown size={15} /></div></div><div className="form-field"><label htmlFor="reader-select">Choose a reader</label><div className="form-select"><Users size={17} /><select id="reader-select" value={selectedBorrower} onChange={(event) => setSelectedBorrower(event.target.value)}><option value="">Select a community member</option>{borrowers.filter((member) => member.is_active !== false).map((member) => <option key={member.id} value={member.id}>{member.name} · {member.email}</option>)}</select><ChevronDown size={15} /></div></div><div className="form-field"><label htmlFor="due-date">Due date</label><div className="form-select"><CalendarDays size={17} /><input id="due-date" type="date" value={dueDate} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setDueDate(event.target.value)} /></div><small className="field-hint">The standard lending period is 14 days.</small></div><div className="modal-actions"><button className="secondary-button" onClick={() => setModal(false)}>Cancel</button><button className="primary-button modal-submit" disabled={!selectedBook || !selectedBorrower || loading || books.find((book) => book.id === selectedBook)?.available_copies === 0} onClick={() => void borrow()}>{loading ? 'Checking out…' : <><BookOpen size={16} /> Confirm checkout</>}</button></div></section></div>}
  </div>
}

function StatCard({ icon, label, value, delta, tone }: { icon: ReactNode; label: string; value: string; delta: string; tone: string }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-delta">{tone === 'amber' && Number(value) > 0 ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}{delta}</div><div className={`stat-decoration ${tone}`} /></div> }
function PageHeading({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action: ReactNode }) { return <section className="welcome-row page-heading"><div><div className="eyebrow"><span className="eyebrow-line" />{eyebrow}</div><h1>{title}</h1><p className="welcome-sub">{copy}</p></div>{action}</section> }
function BookCover({ book, small = false }: { book?: Book; small?: boolean }) { if (!book) return <div className={`book-cover missing ${small ? 'cover-small' : ''}`}><BookOpen size={20} /></div>; return <div className={`book-cover ${small ? 'cover-small' : ''}`} style={{ backgroundColor: book.color }}>{book.cover && <img src={book.cover} alt={`${book.title} cover`} loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none' }} />}<span className="cover-fallback"><BookOpen size={small ? 17 : 25} /></span></div> }
function BookTile({ book, onBorrow, isAdmin = false }: { book: Book; onBorrow: () => void; isAdmin?: boolean }) { return <article className="book-tile"><div className="book-art-wrap"><BookCover book={book} /><span className={`availability-pill ${book.available_copies === 0 ? 'unavailable' : ''}`}><span />{book.available_copies > 0 ? `${book.available_copies} available` : 'All checked out'}</span><button className="book-more icon-button" aria-label={isAdmin ? `Add copies of ${book.title}` : `Check out ${book.title}`} title={isAdmin ? 'Add copies' : 'Check out'} disabled={!isAdmin && book.available_copies === 0} onClick={onBorrow}><MoreHorizontal size={18} /></button></div><div className="book-tile-copy"><span className="category-tag">{book.category}</span><strong>{book.title}</strong><span>{book.author}</span><div className="book-tile-bottom"><small>{book.total_copies} copies</small><button disabled={!isAdmin && book.available_copies === 0} onClick={onBorrow}>{isAdmin ? 'Add copies' : book.available_copies > 0 ? 'Check out' : 'Unavailable'}{(isAdmin || book.available_copies > 0) && <ArrowUpRight size={14} />}</button></div></div></article> }
function Avatar({ member, large = false }: { member?: Borrower; large?: boolean }) { const color = member?.color ?? 'blue'; return <div className={`avatar avatar-${color} ${large ? 'avatar-large' : ''}`}>{member?.initials ?? '??'}</div> }
function StatusBadge({ loan }: { loan: Loan }) { if (loan.status === 'returned') return <span className="status-badge returned"><Check size={12} />Returned</span>; if (isOverdue(loan)) return <span className="status-badge overdue"><span />Overdue</span>; const left = daysLeft(loan.due_at); return <span className="status-badge on-loan"><span />{left <= 2 ? `Due in ${left} day${left === 1 ? '' : 's'}` : 'On loan'}</span> }
function EmptyState({ title, copy, action, onClick }: { title: string; copy: string; action?: string; onClick: () => void }) { return <div className="empty-state"><div className="empty-icon"><BookOpen size={21} /></div><strong>{title}</strong><span>{copy}</span>{action && <button className="text-button" onClick={onClick}>{action} <ArrowUpRight size={14} /></button>}</div> }

export default App
