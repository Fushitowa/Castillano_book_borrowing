import { useState } from 'react'
import { ArrowDownLeft, BookOpen, Check, Clock3, Mail, Undo2, UserRound, X } from 'lucide-react'
import type { BorrowRequest, Loan, ReturnRequest } from './types'
import './requests.css'

type Props = {
  borrowRequests: BorrowRequest[]
  returnRequests: ReturnRequest[]
  loans: Loan[]
  busy: boolean
  onApproveBorrow: (id: string) => void
  onRejectBorrow: (id: string) => void
  onApproveReturn: (requestId: string, loanId: string) => void
  onRejectReturn: (id: string) => void
}

const dateLabel = (value: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value))

export default function RequestDesk({ borrowRequests, returnRequests, loans, busy, onApproveBorrow, onRejectBorrow, onApproveReturn, onRejectReturn }: Props) {
  const [selectedLoans, setSelectedLoans] = useState<Record<string, string>>({})
  const pendingBorrow = borrowRequests.filter((request) => request.status === 'pending').length
  const pendingReturn = returnRequests.filter((request) => request.status === 'pending').length

  return <>
    <section className="welcome-row page-heading"><div><div className="eyebrow"><span className="eyebrow-line" />CUSTOMER SERVICE</div><h1>Borrow and return requests.</h1><p className="welcome-sub">Review public requests. Inventory changes only after staff approval.</p></div><span className="request-count-chip"><Clock3 size={14} /> {pendingBorrow + pendingReturn} pending</span></section>

    <section className="request-section panel"><div className="panel-heading"><div><h2>Borrow requests</h2><p>{pendingBorrow} awaiting review · approving checks out one copy for 14 days.</p></div><span className="request-section-icon borrow"><BookOpen size={16} /></span></div>
      {borrowRequests.length ? <div className="request-list">{borrowRequests.map((request) => <article className="request-card" key={request.id}><div className="request-book-thumb">{request.book?.cover ? <img src={request.book.cover} alt="" /> : <BookOpen size={18} />}</div><div className="request-card-main"><div className="request-card-title"><strong>{request.book?.title ?? 'Book unavailable'}</strong><span className={`request-status ${request.status}`}>{request.status}</span></div><div className="request-meta"><span><UserRound size={13} /> {request.customer_name}</span><span><Mail size={13} /> {request.customer_email}</span><span><Clock3 size={13} /> {dateLabel(request.requested_at)}</span></div></div>{request.status === 'pending' && <div className="request-actions"><button className="request-approve" disabled={busy} onClick={() => onApproveBorrow(request.id)}><Check size={14} /> Approve</button><button className="request-reject" disabled={busy} onClick={() => onRejectBorrow(request.id)}><X size={14} /> Decline</button></div>}</article>)}</div> : <div className="request-empty"><BookOpen size={19} /><strong>No borrow requests yet</strong><span>Customer requests submitted from the public catalog will appear here.</span></div>}
    </section>

    <section className="request-section panel"><div className="panel-heading"><div><h2>Return notices</h2><p>{pendingReturn} awaiting confirmation · verify the physical book before approving.</p></div><span className="request-section-icon return"><Undo2 size={16} /></span></div>
      {returnRequests.length ? <div className="request-list">{returnRequests.map((request) => {
        const matchingLoans = loans.filter((loan) => loan.status === 'borrowed' && loan.book_id === request.book_id && loan.borrower?.email?.toLowerCase() === request.customer_email.toLowerCase())
        const selectedLoan = selectedLoans[request.id] ?? (matchingLoans.length === 1 ? matchingLoans[0].id : '')
        return <article className="request-card return-request-card" key={request.id}><div className="request-book-thumb return-thumb">{request.book?.cover ? <img src={request.book.cover} alt="" /> : <Undo2 size={18} />}</div><div className="request-card-main"><div className="request-card-title"><strong>{request.book?.title ?? 'Book unavailable'}</strong><span className={`request-status ${request.status}`}>{request.status}</span></div><div className="request-meta"><span><UserRound size={13} /> {request.customer_name}</span><span><Mail size={13} /> {request.customer_email}</span><span><Clock3 size={13} /> {dateLabel(request.requested_at)}</span></div>{request.status === 'pending' && matchingLoans.length > 1 && <label className="request-loan-select">Match active loan<select value={selectedLoan} onChange={(event) => setSelectedLoans((items) => ({ ...items, [request.id]: event.target.value }))}><option value="">Choose the loan</option>{matchingLoans.map((loan) => <option key={loan.id} value={loan.id}>Borrowed {dateLabel(loan.borrowed_at)} · due {dateLabel(loan.due_at)}</option>)}</select></label>}{request.status === 'pending' && matchingLoans.length === 0 && <small className="request-no-match">No active loan matches this email and book. Check the details before resolving.</small>}</div>{request.status === 'pending' && <div className="request-actions"><button className="request-approve" disabled={busy || !selectedLoan || !matchingLoans.some((loan) => loan.id === selectedLoan)} onClick={() => onApproveReturn(request.id, selectedLoan)}><ArrowDownLeft size={14} /> Confirm return</button><button className="request-reject" disabled={busy} onClick={() => onRejectReturn(request.id)}><X size={14} /> Decline</button></div>}</article>
      })}</div> : <div className="request-empty"><Undo2 size={19} /><strong>No return notices yet</strong><span>Customer return notices will appear here for staff confirmation.</span></div>}
    </section>
  </>
}
