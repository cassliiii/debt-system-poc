import {
  HashRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'
import { ProtectedRoute } from './components/auth/ProtectedRoute.jsx'
import { AppShell } from './components/layout/AppShell.jsx'
import { ROLE_HOME } from './config/navigation.js'
import { AuthProvider } from './context/AuthContext.jsx'
import { useAuth } from './hooks/useAuth.js'
import { CargaPage } from './pages/CargaPage.jsx'
import { ConsultaPage } from './pages/ConsultaPage.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { NotFoundPage } from './pages/NotFoundPage.jsx'
import { UiPreview } from './pages/UiPreview.jsx'

function HomeRedirect() {
  const { user, loading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  return <Navigate to={ROLE_HOME[user.rol] ?? '/login'} replace />
}

function LoginRoute() {
  const { user, loading } = useAuth()

  if (loading) return null
  if (user) return <Navigate to={ROLE_HOME[user.rol] ?? '/login'} replace />

  return <LoginPage />
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route
            path="/consulta"
            element={
              <ProtectedRoute allowedRoles={['atencion']}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<ConsultaPage />} />
          </Route>
          <Route
            path="/carga"
            element={
              <ProtectedRoute allowedRoles={['operador']}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<CargaPage />} />
          </Route>
          {import.meta.env.DEV ? (
            <Route path="/ui-preview" element={<UiPreview />} />
          ) : null}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}

export default App
