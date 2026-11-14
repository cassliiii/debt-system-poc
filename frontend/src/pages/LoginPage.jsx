import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import './LoginPage.css'

export function LoginPage() {
  useDocumentTitle('Iniciar sesión')

  return (
    <main className="login-page">
      <h1>Iniciar sesión</h1>
    </main>
  )
}
