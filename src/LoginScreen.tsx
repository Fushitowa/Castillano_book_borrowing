import { useState, type FormEvent } from 'react'
import { ArrowRight, BookOpen, KeyRound, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react'
import type { StaffProfile, StaffRole } from './types'

type Props = {
  connected: boolean
  loading: boolean
  error: string
  onSignIn: (email: string, password: string) => Promise<void>
  onDemoSignIn: (role: StaffRole) => void
}

export default function LoginScreen({ connected, loading, error, onSignIn, onDemoSignIn }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void onSignIn(email.trim(), password)
  }

  return <main className="login-page">
    <section className="login-brand-panel">
      <img className="login-logo" src="/jireh-library-logo.jpg" alt="Jireh Library — Provision of Knowledge" />
      <div className="login-brand-copy"><span className="login-kicker"><BookOpen size={14} /> YOUR READING COMMUNITY</span><h1>Every story has<br />a place here.</h1><p>A calm, welcoming space to care for your collection and help every book find its next reader.</p></div>
      <div className="login-brand-footer"><span className="login-brand-mark">J</span><span>Jireh Library</span><span className="login-footer-rule" /><span>Provision of Knowledge</span></div>
      <div className="login-decoration decoration-one" /><div className="login-decoration decoration-two" />
    </section>
    <section className="login-form-panel"><div className="login-card">
      <div className="login-mobile-logo"><img src="/jireh-library-logo.jpg" alt="Jireh Library" /></div>
      <span className="login-small-kicker"><LockKeyhole size={14} /> STAFF PORTAL</span>
      <h2>Welcome back</h2><p className="login-intro">Sign in to your library workspace.</p>
      {connected ? <form className="login-form" onSubmit={submit}>
        <label htmlFor="staff-email">Email address</label><div className="login-input"><Mail size={17} /><input autoComplete="username" id="staff-email" type="email" placeholder="you@jirehlibrary.org" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
        <div className="password-label-row"><label htmlFor="staff-password">Password</label><span><KeyRound size={12} /> Secure staff sign-in</span></div><div className="login-input"><LockKeyhole size={17} /><input autoComplete="current-password" id="staff-password" type="password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} /></div>
        {error && <div className="login-error" role="alert">{error}</div>}
        <button className="login-submit" type="submit" disabled={loading}>{loading ? 'Signing in…' : <>Sign in <ArrowRight size={16} /></>}</button>
        <p className="login-note"><ShieldCheck size={14} /> Access is managed by your library administrator.</p>
      </form> : <div className="demo-access">
        <div className="demo-notice"><span className="demo-dot" /><span>Demo mode is on. Connect Supabase to use secure staff accounts.</span></div>
        {error && <div className="login-error" role="alert">{error}</div>}
        <p className="demo-label">CONTINUE AS</p>
        <button className="demo-role-button" onClick={() => onDemoSignIn('admin')}><span className="demo-role-icon admin"><ShieldCheck size={17} /></span><span><strong>Administrator</strong><small>Full access to the library desk</small></span><ArrowRight size={16} /></button>
        <button className="demo-role-button" onClick={() => onDemoSignIn('librarian')}><span className="demo-role-icon librarian"><UserRound size={17} /></span><span><strong>Librarian</strong><small>Manage checkouts and returns</small></span><ArrowRight size={16} /></button>
        <p className="login-note"><ShieldCheck size={14} /> Demo access is stored only in this browser session.</p>
      </div>}
      <div className="login-bottom"><span>Need an account?</span><span>Contact your library administrator</span></div>
    </div><div className="login-copyright">© {new Date().getFullYear()} Jireh Library <span>·</span> Provision of Knowledge</div></section>
  </main>
}

export const demoProfile = (role: StaffRole): StaffProfile => role === 'admin'
  ? { id: 'demo-admin', full_name: 'Jireh Castillano', role: 'admin', email: 'admin@jirehlibrary.local' }
  : { id: 'demo-librarian', full_name: 'Jireh Castillano', role: 'librarian', email: 'librarian@jirehlibrary.local' }
