import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import CustomerPortal from './CustomerPortal'
import './styles.css'
import './login.css'
import './auth.css'
import './admin.css'
import './admin-borrowers.css'
import './admin-cover.css'

const isCustomerRoute = /^\/customer(?:\/|$)/.test(window.location.pathname)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isCustomerRoute ? <CustomerPortal /> : <App />}</React.StrictMode>,
)
