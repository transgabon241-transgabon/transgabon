import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app.tsx'
import './index.css' 
import { AuthProvider } from './lib/auth.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Enveloppe l'application dans le fournisseur d'authentification Supabase de production */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)