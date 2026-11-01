import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, ChevronDown, CircleHelp, Library, LoaderCircle, Mail, MapPin, Search, ShieldCheck, Undo2, UserRound, X } from 'lucide-react'
import type { Book } from './types'
import { libraryCatalogBooks } from './data'
import { loadPublicBooks, submitBorrowRequest, submitReturnRequest } from './lib/supabase'
import './customer.css'

export default function CustomerPortal() {
  const [books, setBooks] = useState<Book[]>([])
  const [catalogUnavailable, setCatalogUnavailable] = useState(false)
  const [catalogMessage, setCatalogMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All books')
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [requestFormOpen, setRequestFormOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [requestedDays, setRequestedDays] = useState('14')
  const [returnName, setReturnName] = useState('')
  const [returnEmail, setReturnEmail] = useState('')
  const [returnBookId, setReturnBookId] = useState('')
  const [formError, setFormError] = useState('')

  const refreshCatalog = useCallback(async () => {
    setLoading(true)
    setCatalogMessage('')
    try {
      const rows = await loadPublicBooks()
      if (rows.length) {
        setBooks(rows)
        setCatalogUnavailable(false)
      } else {
        setBooks(libraryCatalogBooks)
        setCatalogUnavailable(true)
        setCatalogMessage('The Supabase catalog is empty. Run supabase/customer-portal-setup.sql in the Supabase SQL Editor to add the library catalog.')
      }
    } catch (loadError) {
      setBooks(libraryCatalogBooks)
      setCatalogUnavailable(true)
      setCatalogMessage(loadError instanceof Error ? loadError.message : 'Could not reach the Supabase catalog. Check your project URL and network, then retry.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refreshCatalog() }, [refreshCatalog])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 7000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const filteredBooks = useMemo(() => {
    const term = search.trim().toLowerCase()
    return books.filter((book) => {
      const matchesText = !term || `${book.title} ${book.author} ${book.category} ${book.isbn ?? ''}`.toLowerCase().includes(term)
      const matchesFilter = filter === 'All books' || (filter === 'Available' ? book.available_copies > 0 : book.category === filter)
      return matchesText && matchesFilter
    })
  }, [books, search, filter])

  const requestBorrow = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedBook) return
    setBusy(true); setFormError('')
    try {
      await submitBorrowRequest(customerName.trim(), customerEmail.trim(), customerAddress.trim(), Number(requestedDays), selectedBook.id)
      setNotice(`Your request for “${selectedBook.title}” was sent to the library staff. It is not checked out until a librarian approves it.`)
      setSelectedBook(null); setRequestFormOpen(false); setCustomerName(''); setCustomerEmail(''); setCustomerAddress(''); setRequestedDays('14')
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Could not send your borrow request. Please try again.')
    } finally { setBusy(false) }
  }

  const requestReturn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!returnBookId) return
    setBusy(true); setError('')
    try {
      await submitReturnRequest(returnName.trim(), returnEmail.trim(), returnBookId)
      setNotice('Your return notice was sent to the library staff. The book will be marked returned after staff confirms it.')
      setReturnName(''); setReturnEmail(''); setReturnBookId('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not send your return notice. Check the details and try again.')
    } finally { setBusy(false) }
  }

  const categories = [...new Set(books.map((book) => book.category))].sort()

  return <main className="customer-page">
    <header className="customer-header">
      <a className="customer-brand" href="/customer" aria-label="Jireh Library customer home"><img src="/jireh-library-logo.jpg" alt="Jireh Library — Provision of Knowledge" /></a>
      <div className="customer-header-actions"><span className="customer-public-badge"><Library size={14} /> Public catalog</span><a href="/" className="customer-staff-link"><ShieldCheck size={14} /> Staff portal</a></div>
    </header>

    <section className="customer-hero"><div className="customer-hero-copy"><span className="customer-eyebrow"><span /> YOUR NEXT GOOD READ</span><h1>Find a book.<br /><em>Start a story.</em></h1><p>Browse the Jireh Library collection. No account needed. Send a borrow request and our librarian will confirm availability.</p><a href="#customer-catalog" className="customer-primary-link">Browse the collection <ArrowRight size={16} /></a></div><div className="customer-hero-art"><div className="hero-book-stack"><span className="stack-book stack-book-one"><BookOpen size={25} /></span><span className="stack-book stack-book-two"><BookOpen size={25} /></span><span className="stack-book stack-book-three"><BookOpen size={25} /></span></div><div className="hero-art-caption"><strong>A little time with a book</strong><span>can take you a long way.</span></div></div></section>

    <section id="customer-catalog" className="customer-catalog-section">
      <div className="customer-section-heading"><div><span className="customer-eyebrow">THE COLLECTION</span><h2>Stories waiting for you.</h2><p>Requests are confirmed by a librarian before a copy is checked out.</p></div><span className="customer-title-count">{books.length} {books.length === 1 ? 'title' : 'titles'}</span></div>
      <div className="customer-toolbar"><label className="customer-search"><Search size={17} /><input aria-label="Search books" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, author, category or ISBN" /></label><label className="customer-filter"><span>Show</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>All books</option><option>Available</option>{categories.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={14} /></label></div>
      {catalogUnavailable && <div className="customer-catalog-notice" role="status"><BookOpen size={17} /><span><strong>Live catalog unavailable</strong><small>{catalogMessage || 'You can browse the library titles, but requests need the live Supabase connection.'}</small></span><button type="button" disabled={loading} onClick={() => void refreshCatalog()}>{loading ? 'Checking…' : 'Retry connection'}</button></div>}
      {loading ? <div className="customer-loading"><LoaderCircle size={20} /> Loading the catalog…</div> : filteredBooks.length ? <div className="customer-book-grid">{filteredBooks.map((book) => <article className="customer-book-card" key={book.id} role="button" tabIndex={0} aria-label={`View details for ${book.title}`} onClick={() => { setSelectedBook(book); setRequestFormOpen(false) }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedBook(book); setRequestFormOpen(false) } }}>
        <div className="customer-book-art" style={{ backgroundColor: book.color || '#edf3fb' }}><span className={`customer-stock ${catalogUnavailable ? '' : book.available_copies > 0 ? 'in-stock' : 'out-stock'}`}><i />{catalogUnavailable ? 'Availability pending' : book.available_copies > 0 ? `${book.available_copies} available` : 'Currently unavailable'}</span>{book.cover ? <img src={book.cover} alt={`Cover of ${book.title}`} loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none' }} /> : <span className="customer-cover-placeholder"><BookOpen size={32} /></span>}</div>
        <div className="customer-book-copy"><span className="customer-book-category">{book.category}</span><h3>{book.title}</h3><p>{book.author}</p><div className="customer-book-bottom"><span>{catalogUnavailable ? 'Jireh Library catalog' : `${book.total_copies} ${book.total_copies === 1 ? 'copy' : 'copies'}`}</span><span className="customer-card-link">View details <ArrowRight size={14} /></span></div></div>
      </article>)}</div> : <div className="customer-empty"><BookOpen size={22} /><strong>{books.length ? 'No matching books' : 'No books in the catalog yet'}</strong><span>{books.length ? 'Try a different search or filter.' : 'Please check again later or contact the library.'}</span></div>}
    </section>

    <section className="customer-return-panel"><div className="customer-return-intro"><span className="customer-return-icon"><Undo2 size={18} /></span><span className="customer-eyebrow">RETURN A BOOK</span><h2>Let the library know.</h2><p>Send a return notice with the email address used when the book was borrowed. A librarian will confirm the book and update the record.</p><div className="customer-privacy-note"><CircleHelp size={14} /> A notice does not mark the book as returned until the library receives it.</div></div><form className="customer-return-form" onSubmit={(event) => void requestReturn(event)}>
      <label>Your name<input value={returnName} onChange={(event) => setReturnName(event.target.value)} autoComplete="name" required maxLength={120} placeholder="Full name" /></label>
      <label>Email used for the loan<input value={returnEmail} onChange={(event) => setReturnEmail(event.target.value)} autoComplete="email" type="email" required maxLength={254} placeholder="you@example.com" /></label>
      <label>Book to return<select value={returnBookId} onChange={(event) => setReturnBookId(event.target.value)} required disabled={catalogUnavailable}><option value="">Choose a book</option>{books.map((book) => <option key={book.id} value={book.id}>{book.title} — {book.author}</option>)}</select></label>
      <button className="customer-submit" type="submit" disabled={busy || !books.length || catalogUnavailable}>{busy ? 'Sending…' : 'Send return notice'} <ArrowRight size={15} /></button>
      {error && <div className="customer-alert" role="alert">{error}</div>}
    </form></section>

    <footer className="customer-footer"><span>Jireh Library <i /> Provision of Knowledge</span><span>Made for readers, with care.</span></footer>
    {notice && <div className="customer-toast" role="status"><Check size={17} /><span>{notice}</span><button aria-label="Dismiss notice" onClick={() => setNotice('')}><X size={16} /></button></div>}
    {selectedBook && !requestFormOpen && <div className="customer-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedBook(null) }}><section className="customer-modal customer-detail-modal" role="dialog" aria-modal="true" aria-labelledby="customer-detail-title"><button type="button" className="customer-modal-close" aria-label="Close book details" onClick={() => setSelectedBook(null)}><X size={18} /></button><div className="customer-detail-layout"><div className="customer-detail-cover" style={{ backgroundColor: selectedBook.color || '#edf3fb' }}>{selectedBook.cover ? <img src={selectedBook.cover} alt={`Cover of ${selectedBook.title}`} onError={(event) => { event.currentTarget.style.display = 'none' }} /> : <BookOpen size={34} />}</div><div className="customer-detail-copy"><span className="customer-book-category">{selectedBook.category}</span><h2 id="customer-detail-title">{selectedBook.title}</h2><p className="customer-detail-author">by {selectedBook.author}</p><p className="customer-detail-summary">Review the book details below. Send a request and the librarian will confirm availability before checkout.</p><dl className="customer-book-facts"><div><dt>Availability</dt><dd>{catalogUnavailable ? 'Availability unavailable' : selectedBook.available_copies > 0 ? `${selectedBook.available_copies} available` : 'Currently unavailable'}</dd></div>{selectedBook.isbn && <div><dt>ISBN</dt><dd>{selectedBook.isbn}</dd></div>}<div><dt>Copies in collection</dt><dd>{catalogUnavailable ? 'Not available' : selectedBook.total_copies}</dd></div></dl></div></div>{catalogUnavailable && <div className="customer-alert customer-preview-alert">Live catalog availability could not be confirmed. The request form is available, but requests are paused until the connection returns.</div>}<div className="customer-detail-actions"><button type="button" className="customer-detail-secondary" onClick={() => setSelectedBook(null)}>Back to catalog</button><button type="button" className="customer-submit" disabled={!catalogUnavailable && selectedBook.available_copies < 1} onClick={() => { setFormError(''); setRequestFormOpen(true) }}>{!catalogUnavailable && selectedBook.available_copies < 1 ? 'Unavailable' : 'Request'} <ArrowRight size={15} /></button></div></section></div>}
    {selectedBook && requestFormOpen && <div className="customer-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setRequestFormOpen(false) }}><section className="customer-modal customer-request-modal" role="dialog" aria-modal="true" aria-labelledby="customer-borrow-title"><div className="customer-modal-heading"><button type="button" className="customer-modal-back" aria-label="Back to book details" onClick={() => setRequestFormOpen(false)}><ArrowLeft size={16} /> Book details</button><button type="button" className="customer-modal-close" aria-label="Close request form" onClick={() => { setRequestFormOpen(false); setSelectedBook(null) }}><X size={18} /></button><span className="customer-eyebrow">BORROW REQUEST</span><h2 id="customer-borrow-title">Request “{selectedBook.title}”</h2><p>Fill in your details and choose how long you need the book. The librarian will receive your request.</p></div>{catalogUnavailable && <div className="customer-alert customer-preview-alert">The live catalog is unavailable. Your request cannot be sent until the database reconnects.</div>}<form className="customer-request-form" onSubmit={(event) => void requestBorrow(event)}><label><span><UserRound size={14} /> Full name</span><input autoFocus autoComplete="name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} required maxLength={120} placeholder="Your full name" /></label><label><span><Mail size={14} /> Email address</span><input type="email" autoComplete="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} required maxLength={254} placeholder="you@example.com" /></label><label><span><MapPin size={14} /> Home address</span><input autoComplete="street-address" value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} required maxLength={300} placeholder="Street, barangay, city" /></label><label><span><CalendarDays size={14} /> Borrow for (days)</span><input type="number" inputMode="numeric" min={1} max={30} step={1} value={requestedDays} onChange={(event) => setRequestedDays(event.target.value)} required /><small>Choose 1 to 30 days. The requested period will be included for librarian review.</small></label>{formError && <div className="customer-alert" role="alert">{formError}</div>}<div className="customer-request-actions"><button type="button" className="customer-detail-secondary" disabled={busy} onClick={() => setRequestFormOpen(false)}>Cancel</button><button className="customer-submit" type="submit" disabled={busy || catalogUnavailable || Number(requestedDays) < 1 || Number(requestedDays) > 30}>{busy ? 'Sending request…' : 'Send request to librarian'} <ArrowRight size={15} /></button></div></form></section></div>}
  </main>
}


