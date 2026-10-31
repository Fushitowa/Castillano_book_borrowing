import { useEffect, useState, type FormEvent } from 'react'
import { BookCopy, BookPlus, Boxes, Check, ImagePlus, Pencil, Plus, ShieldCheck, UserPlus, Users, UserRoundCheck, UserRoundX } from 'lucide-react'
import type { Book, Borrower, Loan } from './types'

export type NewBookInput = { title: string; author: string; category: string; isbn: string | null; totalCopies: number; coverFile: File | null }

type Props = {
  books: Book[]
  preferredBookId?: string
  borrowers: Borrower[]
  loans: Loan[]
  busy: boolean
  onAddBook: (book: NewBookInput) => Promise<boolean>
  onAddCopies: (bookId: string, quantity: number) => Promise<boolean>
  onAddBorrower: (name: string, email: string) => Promise<boolean>
  onUpdateBorrower: (id: string, name: string, email: string) => Promise<boolean>
  onToggleBorrower: (id: string, isActive: boolean) => Promise<boolean>
  onCreateAdmin: (fullName: string, email: string, password: string) => Promise<boolean>
}

export default function AdminPortal({ books, preferredBookId, borrowers, loans, busy, onAddBook, onAddCopies, onAddBorrower, onUpdateBorrower, onToggleBorrower, onCreateAdmin }: Props) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [category, setCategory] = useState('Fiction')
  const [isbn, setIsbn] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverError, setCoverError] = useState('')
  const [coverPreview, setCoverPreview] = useState('')
  const [initialCopies, setInitialCopies] = useState(1)
  const [selectedBook, setSelectedBook] = useState('')
  const [copiesToAdd, setCopiesToAdd] = useState(1)
  const [borrowerName, setBorrowerName] = useState('')
  const [borrowerEmail, setBorrowerEmail] = useState('')
  const [editingBorrowerId, setEditingBorrowerId] = useState('')
  const [editingBorrowerName, setEditingBorrowerName] = useState('')
  const [editingBorrowerEmail, setEditingBorrowerEmail] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminNotice, setAdminNotice] = useState('')

  useEffect(() => {
    if (preferredBookId && books.some((book) => book.id === preferredBookId)) { setSelectedBook(preferredBookId); return }
    if (!selectedBook && books.length) setSelectedBook(books[0].id)
    if (selectedBook && !books.some((book) => book.id === selectedBook)) setSelectedBook(books[0]?.id ?? '')
  }, [books, preferredBookId, selectedBook])
  useEffect(() => {
    if (!coverFile) { setCoverPreview(''); return }
    const previewUrl = URL.createObjectURL(coverFile)
    setCoverPreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [coverFile])

  const submitBook = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const succeeded = await onAddBook({ title: title.trim(), author: author.trim(), category: category.trim() || 'General', isbn: isbn.trim() || null, totalCopies: initialCopies, coverFile })
    if (succeeded) { setTitle(''); setAuthor(''); setIsbn(''); setInitialCopies(1); setCoverFile(null); setCoverError('') }
  }
  const handleCoverFile = (file?: File) => {
    setCoverError('')
    if (!file) { setCoverFile(null); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setCoverError('Choose a JPG, PNG, or WebP image.'); return }
    if (file.size > 5 * 1024 * 1024) { setCoverError('Cover images must be 5 MB or smaller.'); return }
    setCoverFile(file)
  }
  const submitCopies = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (selectedBook && await onAddCopies(selectedBook, copiesToAdd)) setCopiesToAdd(1)
  }
  const submitBorrower = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (await onAddBorrower(borrowerName.trim(), borrowerEmail.trim())) { setBorrowerName(''); setBorrowerEmail('') }
  }
  const submitAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAdminNotice('')
    if (await onCreateAdmin(adminName.trim(), adminEmail.trim(), adminPassword)) {
      setAdminName(''); setAdminEmail(''); setAdminPassword('')
      setAdminNotice('Admin account created. If email confirmation is enabled in Supabase, the new admin must confirm their email before signing in.')
    }
  }
  const startEditBorrower = (borrower: Borrower) => {
    setEditingBorrowerId(borrower.id); setEditingBorrowerName(borrower.name); setEditingBorrowerEmail(borrower.email)
  }
  const saveBorrower = async (borrowerId: string) => {
    if (await onUpdateBorrower(borrowerId, editingBorrowerName.trim(), editingBorrowerEmail.trim())) setEditingBorrowerId('')
  }
  const selected = books.find((book) => book.id === selectedBook)

  return <>
    <section className="welcome-row page-heading"><div><div className="eyebrow"><span className="eyebrow-line" />LIBRARY ADMINISTRATION</div><h1>Manage your collection.</h1><p className="welcome-sub">Add new titles and keep your shelves stocked.</p></div><span className="admin-portal-chip"><Boxes size={15} /> {books.length} titles</span></section>
    <section className="admin-action-grid">
      <form className="panel admin-form" onSubmit={(event) => void submitBook(event)}>
        <div className="admin-form-heading"><span className="admin-form-icon"><BookPlus size={18} /></span><div><h2>Add a book</h2><p>Create a title in your library catalog.</p></div></div>
        <div className="admin-field"><label htmlFor="new-title">Book title</label><input id="new-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. The Great Gatsby" required maxLength={160} /></div>
        <div className="admin-two-fields"><div className="admin-field"><label htmlFor="new-author">Author</label><input id="new-author" value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Author name" required maxLength={120} /></div><div className="admin-field"><label htmlFor="new-category">Category</label><input id="new-category" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Fiction" maxLength={60} /></div></div>
        <div className="admin-two-fields"><div className="admin-field"><label htmlFor="new-isbn">ISBN <span>Optional</span></label><input id="new-isbn" value={isbn} onChange={(event) => setIsbn(event.target.value)} placeholder="ISBN-13" maxLength={20} /></div><div className="admin-field"><label htmlFor="initial-copies">Starting copies</label><input id="initial-copies" type="number" min={1} max={500} value={initialCopies} onChange={(event) => setInitialCopies(Number(event.target.value))} required /></div></div>
        <div className="admin-field cover-field"><label htmlFor="new-cover">Book cover <span>Optional</span></label><div className="cover-file-row"><label className="cover-file-button" htmlFor="new-cover"><ImagePlus size={15} /> Choose image</label><input id="new-cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleCoverFile(event.target.files?.[0])} /><span>{coverFile?.name ?? 'JPG, PNG or WebP · Max 5 MB'}</span>{coverPreview && <img className="cover-file-preview" src={coverPreview} alt="Book cover preview" />}</div>{coverError && <small className="cover-file-error">{coverError}</small>}</div>
        <button className="primary-button admin-submit" type="submit" disabled={busy}><Plus size={16} /> {busy ? 'Saving…' : 'Add book to catalog'}</button>
      </form>

      <form className="panel admin-form" onSubmit={(event) => void submitCopies(event)}>
        <div className="admin-form-heading"><span className="admin-form-icon copy-icon"><BookCopy size={18} /></span><div><h2>Add copies</h2><p>Increase the stock for an existing title.</p></div></div>
        <div className="admin-field"><label htmlFor="copy-book">Select a book</label><select id="copy-book" value={selectedBook} onChange={(event) => setSelectedBook(event.target.value)} required disabled={!books.length}><option value="" disabled>Select a title</option>{books.map((book) => <option key={book.id} value={book.id}>{book.title} — {book.author}</option>)}</select></div>
        <div className="admin-field"><label htmlFor="copies-to-add">Number of copies to add</label><input id="copies-to-add" type="number" min={1} max={500} value={copiesToAdd} onChange={(event) => setCopiesToAdd(Number(event.target.value))} required /></div>
        {selected ? <div className="copy-preview"><span className="copy-preview-icon"><Boxes size={16} /></span><span><strong>{selected.title}</strong><small>{selected.available_copies} available of {selected.total_copies} total copies</small></span><span className="copy-preview-add">+{copiesToAdd}</span></div> : <div className="copy-preview empty-copy-preview"><span>Add a book first, then you can add more copies here.</span></div>}
        <button className="primary-button admin-submit" type="submit" disabled={busy || !selectedBook}><Plus size={16} /> {busy ? 'Updating…' : 'Add copies to inventory'}</button>
      </form>
    </section>

    <section className="panel admin-staff-create">
      <div className="panel-heading"><div><h2>Create an Admin account</h2><p>Give another trusted staff member administrator access.</p></div><span className="admin-form-icon"><ShieldCheck size={18} /></span></div>
      <form className="borrower-add-form" onSubmit={(event) => void submitAdmin(event)}>
        <div className="admin-field"><label htmlFor="new-admin-name">Full name</label><input id="new-admin-name" autoComplete="name" value={adminName} onChange={(event) => setAdminName(event.target.value)} placeholder="Staff member name" required maxLength={80} /></div>
        <div className="admin-field"><label htmlFor="new-admin-email">Email address</label><input id="new-admin-email" autoComplete="email" type="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} placeholder="admin@example.com" required maxLength={254} /></div>
        <div className="admin-field"><label htmlFor="new-admin-password">Temporary password</label><input id="new-admin-password" autoComplete="new-password" type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="At least 8 characters" required minLength={8} /></div>
        <button className="primary-button borrower-add-button" type="submit" disabled={busy}><ShieldCheck size={15} /> {busy ? 'Creating…' : 'Create Admin account'}</button>
      </form>
      <p className="login-note"><ShieldCheck size={14} /> Only the currently signed-in administrator can create another Admin account.</p>
      {adminNotice && <div className="login-success" role="status">{adminNotice}</div>}
    </section>

    <section className="panel admin-inventory"><div className="panel-heading"><div><h2>Current inventory</h2><p>Copy counts update as books are checked out and returned.</p></div><span className="inventory-count">{books.reduce((sum, book) => sum + book.total_copies, 0)} copies</span></div>
      <div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th>BOOK</th><th>CATEGORY</th><th>AVAILABLE</th><th>TOTAL COPIES</th><th></th></tr></thead><tbody>{books.map((book) => <tr key={book.id}><td><div className="inventory-title"><span className="inventory-book-mark"><BookCopy size={15} /></span><span><strong>{book.title}</strong><small>{book.author}</small></span></div></td><td><span className="category-tag">{book.category}</span></td><td>{book.available_copies}</td><td>{book.total_copies}</td><td><span className="inventory-ok"><Check size={13} /> Tracked</span></td></tr>)}</tbody></table>{!books.length && <div className="empty-state"><div className="empty-icon"><BookPlus size={20} /></div><strong>No books yet</strong><span>Add your first title using the form above.</span></div>}</div>
    </section>

    <section className="panel admin-borrowers"><div className="panel-heading"><div><h2>Borrower management</h2><p>Review reader accounts, edit details, and control checkout access.</p></div><span className="inventory-count">{borrowers.length} readers</span></div>
      <form className="borrower-add-form" onSubmit={(event) => void submitBorrower(event)}><div className="admin-field"><label htmlFor="borrower-name">Full name</label><input id="borrower-name" value={borrowerName} onChange={(event) => setBorrowerName(event.target.value)} placeholder="Reader name" required maxLength={120} /></div><div className="admin-field"><label htmlFor="borrower-email">Email address</label><input id="borrower-email" type="email" value={borrowerEmail} onChange={(event) => setBorrowerEmail(event.target.value)} placeholder="reader@email.com" required maxLength={254} /></div><button className="primary-button borrower-add-button" disabled={busy}><UserPlus size={15} /> Add borrower</button></form>
      <div className="inventory-table-wrap"><table className="inventory-table borrower-table"><thead><tr><th>BORROWER</th><th>ACTIVE LOANS</th><th>STATUS</th><th>ACCOUNT ACTIONS</th></tr></thead><tbody>{borrowers.map((borrower) => {
        const activeLoans = loans.filter((loan) => loan.borrower_id === borrower.id && loan.status === 'borrowed').length
        const isEditing = editingBorrowerId === borrower.id
        const isActive = borrower.is_active !== false
        return <tr key={borrower.id}><td>{isEditing ? <div className="borrower-edit-fields"><input aria-label="Borrower name" value={editingBorrowerName} onChange={(event) => setEditingBorrowerName(event.target.value)} /><input aria-label="Borrower email" type="email" value={editingBorrowerEmail} onChange={(event) => setEditingBorrowerEmail(event.target.value)} /></div> : <div className="inventory-title"><span className="borrower-avatar-small">{borrower.initials}</span><span><strong>{borrower.name}</strong><small>{borrower.email}</small></span></div>}</td><td><span className="borrower-loan-count">{activeLoans}</span></td><td><span className={`borrower-status ${isActive ? 'active' : 'inactive'}`}>{isActive ? <><UserRoundCheck size={12} /> Active</> : <><UserRoundX size={12} /> Inactive</>}</span></td><td><div className="borrower-actions">{isEditing ? <><button className="row-action save" disabled={busy || !editingBorrowerName.trim() || !editingBorrowerEmail.trim()} onClick={() => void saveBorrower(borrower.id)}><Check size={13} /> Save</button><button className="row-action" onClick={() => setEditingBorrowerId('')}>Cancel</button></> : <><button className="row-action" onClick={() => startEditBorrower(borrower)}><Pencil size={12} /> Edit</button><button className={`row-action ${isActive ? 'deactivate' : 'reactivate'}`} disabled={busy || (isActive && activeLoans > 0)} title={isActive && activeLoans > 0 ? 'Return the active loans before deactivating' : undefined} onClick={() => void onToggleBorrower(borrower.id, !isActive)}>{isActive ? 'Deactivate' : 'Reactivate'}</button></>}</div></td></tr>
      })}</tbody></table>{!borrowers.length && <div className="empty-state"><div className="empty-icon"><Users size={20} /></div><strong>No borrowers yet</strong><span>Add a reader with the form above to start lending.</span></div>}</div>
    </section>
  </>
}
