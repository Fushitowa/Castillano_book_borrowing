import { useState, type FormEvent } from 'react'
import { ArrowRight, BookOpen, KeyRound, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react'
import type { StaffProfile, StaffRole } from './types'

type Props = {
  connected: boolean
  adminSetupAvailable: boolean
  loading: boolean
  error: string
  success: string
  onSignIn: (email: string, password: string, role: StaffRole) => Promise<void>
  onSignUp: (fullName: string, email: string, password: string) => Promise<void>
  onDemoSignIn: (role: StaffRole) => void
}

export default function LoginScreen({ connected, adminSetupAvailable, loading, error, success, onSignIn, onSignUp, onDemoSignIn }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [loginRole, setLoginRole] = useState<StaffRole>('admin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    if (mode === 'signup') {
      if (password !== confirmPassword) { setFormError('Your passwords do not match.'); return }
      void onSignUp(fullName.trim(), email.trim(), password)
    } else void onSignIn(email.trim(), password, loginRole)
  }
  const switchMode = () => { setMode((current) => current === 'signin' ? 'signup' : 'signin'); setFormError('') }

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
      <h2>{mode === 'signin' ? loginRole === 'admin' ? 'Admin sign in' : 'Librarian sign in' : adminSetupAvailable ? 'Create Admin account' : 'Create your account'}</h2><p className="login-intro">{mode === 'signin' ? 'Sign in with your staff account.' : adminSetupAvailable ? 'Set up the first administrator for this library.' : 'Create a librarian account for your library workspace.'}</p>
      {connected && mode === 'signin' && <div className="login-role-switch" aria-label="Choose sign-in role"><button type="button" className={loginRole === 'admin' ? 'selected' : ''} onClick={() => setLoginRole('admin')}><ShieldCheck size={14} /> Admin</button><button type="button" className={loginRole === 'librarian' ? 'selected' : ''} onClick={() => setLoginRole('librarian')}><UserRound size={14} /> Librarian</button></div>}
      {connected ? <form className="login-form" onSubmit={submit}>
        {mode === 'signup' && <><label htmlFor="staff-name">Full name</label><div className="login-input"><UserRound size={17} /><input autoComplete="name" id="staff-name" type="text" placeholder="Your name" value={fullName} onChange={(event) => setFullName(event.target.value)} required maxLength={80} /></div></>}
        <label htmlFor="staff-email">Email address</label><div className="login-input"><Mail size={17} /><input autoComplete="username" id="staff-email" type="email" placeholder="you@jirehlibrary.org" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
        <div className="password-label-row"><label htmlFor="staff-password">Password</label>{mode === 'signin' && <span><KeyRound size={12} /> Secure staff sign-in</span>}</div><div className="login-input"><LockKeyhole size={17} /><input autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} id="staff-password" type="password" placeholder={mode === 'signin' ? 'Enter your password' : 'Create a password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /></div>
        {mode === 'signup' && <><label htmlFor="confirm-password">Confirm password</label><div className="login-input"><LockKeyhole size={17} /><input autoComplete="new-password" id="confirm-password" type="password" placeholder="Re-enter your password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} /></div></>}
        {formError && <div className="login-error" role="alert">{formError}</div>}{error && <div className="login-error" role="alert">{error}</div>}{success && <div className="login-success" role="status">{success}</div>}
        <button className="login-submit" type="submit" disabled={loading}>{loading ? 'Please wait…' : <>{mode === 'signin' ? `Sign in as ${loginRole === 'admin' ? 'Admin' : 'Librarian'}` : adminSetupAvailable ? 'Create Admin account' : 'Create Librarian account'} <ArrowRight size={16} /></>}</button>
        <p className="login-note"><ShieldCheck size={14} />{mode === 'signup' && adminSetupAvailable ? 'The first account will receive Admin access.' : 'New accounts receive the Librarian role by default.'}</p>
      </form> : <div className="demo-access">
        <div className="demo-notice"><span className="demo-dot" /><span>Demo mode is on. Connect Supabase to use secure staff accounts.</span></div>
        {error && <div className="login-error" role="alert">{error}</div>}
        <p className="demo-label">CONTINUE AS</p>
        <button className="demo-role-button" onClick={() => onDemoSignIn('admin')}><span className="demo-role-icon admin"><ShieldCheck size={17} /></span><span><strong>Administrator</strong><small>Full access to the library desk</small></span><ArrowRight size={16} /></button>
        <button className="demo-role-button" onClick={() => onDemoSignIn('librarian')}><span className="demo-role-icon librarian"><UserRound size={17} /></span><span><strong>Librarian</strong><small>Manage checkouts and returns</small></span><ArrowRight size={16} /></button>
        <p className="login-note"><ShieldCheck size={14} /> Demo access is stored only in this browser session.</p>
      </div>}
      <div className="login-bottom">{connected ? <><span>{mode === 'signin' ? 'New to the library desk?' : 'Already have an account?'}</span><button type="button" onClick={switchMode}>{mode === 'signin' ? adminSetupAvailable ? 'Set up first Admin' : 'Create an account' : 'Sign in instead'}</button></> : <><span>Need an account?</span><span>Connect Supabase to register</span></>}</div>
      <a className="login-customer-link" href="/customer"><span className="login-customer-icon"><BookOpen size={18} /></span><span className="login-customer-copy"><strong>Browse as a customer</strong><small>Explore books and request a loan without an account</small></span><ArrowRight className="login-customer-arrow" size={18} /></a>
    </div><div className="login-copyright">© {new Date().getFullYear()} Jireh Library <span>·</span> Provision of Knowledge</div></section>
  </main>
}

export const demoProfile = (role: StaffRole): StaffProfile => role === 'admin'
  ? { id: 'demo-admin', full_name: 'Jireh Castillano', role: 'admin', email: 'admin@jirehlibrary.local' }
  : { id: 'demo-librarian', full_name: 'Jireh Castillano', role: 'librarian', email: 'librarian@jirehlibrary.local' }
