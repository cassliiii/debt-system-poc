import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button.jsx'
import { Panel } from '../components/ui/Panel.jsx'
import { ROLE_HOME } from '../config/navigation.js'
import { useAuth } from '../hooks/useAuth.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import './NotFoundPage.css'

export function NotFoundPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useDocumentTitle('Página no encontrada')

  const destination = user ? (ROLE_HOME[user.rol] ?? '/login') : '/login'

  return (
    <main className="not-found-page">
      <Panel title="Página no encontrada">
        <p className="not-found-page__text">
          La dirección no existe o no tiene permiso para verla.
        </p>
        <Button variant="link" onClick={() => navigate(destination)}>
          Ir al inicio
        </Button>
      </Panel>
    </main>
  )
}
