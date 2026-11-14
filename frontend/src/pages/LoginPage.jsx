import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PublicHeader } from '../components/layout/PublicHeader.jsx'
import { Alert } from '../components/ui/Alert.jsx'
import { Button } from '../components/ui/Button.jsx'
import { ErrorSummary } from '../components/ui/ErrorSummary.jsx'
import { TextField } from '../components/ui/TextField.jsx'
import { USE_MOCK } from '../config/app.js'
import { ROLE_HOME } from '../config/navigation.js'
import { useAuth } from '../hooks/useAuth.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { AuthError } from '../services/errors.js'
import './LoginPage.css'

const USUARIO_FIELD = 'login-usuario'
const PASSWORD_FIELD = 'login-password'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState([])
  const [credentialsError, setCredentialsError] = useState('')
  const [lockedError, setLockedError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorVersion, setErrorVersion] = useState(0)

  useDocumentTitle('Iniciar sesión')

  useEffect(() => {
    document.getElementById(USUARIO_FIELD)?.focus()
  }, [])

  useEffect(() => {
    if (lockedError) {
      document.getElementById('login-locked')?.focus()
    }
  }, [lockedError])

  const usuarioError = fieldErrors.find(
    (error) => error.fieldId === USUARIO_FIELD,
  )?.label

  const passwordError = fieldErrors.find(
    (error) => error.fieldId === PASSWORD_FIELD,
  )?.label

  const handleUsuarioChange = (event) => {
    setUsuario(event.target.value)
    setFieldErrors((current) =>
      current.filter((error) => error.fieldId !== USUARIO_FIELD),
    )
    setCredentialsError('')
  }

  const handlePasswordChange = (event) => {
    setPassword(event.target.value)
    setFieldErrors((current) =>
      current.filter((error) => error.fieldId !== PASSWORD_FIELD),
    )
    setCredentialsError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return

    const nextErrors = []
    if (usuario.trim() === '') {
      nextErrors.push({
        fieldId: USUARIO_FIELD,
        label: 'Ingrese su usuario',
      })
    }
    if (password === '') {
      nextErrors.push({
        fieldId: PASSWORD_FIELD,
        label: 'Ingrese su contraseña',
      })
    }

    setCredentialsError('')
    setLockedError('')

    if (nextErrors.length > 0) {
      setFieldErrors(nextErrors)
      setErrorVersion((version) => version + 1)
      return
    }

    setFieldErrors([])
    setSubmitting(true)

    try {
      const session = await login({
        usuario: usuario.trim(),
        password,
      })
      navigate(ROLE_HOME[session.rol] ?? '/login', { replace: true })
    } catch (error) {
      if (error instanceof AuthError && error.code === 'LOCKED') {
        setLockedError(error.message)
      } else if (error instanceof AuthError) {
        setCredentialsError(error.message)
      } else {
        setCredentialsError('No se pudo iniciar sesión. Intente nuevamente.')
      }
      setErrorVersion((version) => version + 1)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-layout">
      <PublicHeader />
      <main className="login-page">
        <div className="login-card">
          <h1 className="login-card__title">Iniciar sesión</h1>
          <p className="login-card__subtitle">Acceso para personal autorizado</p>
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {fieldErrors.length > 0 ? (
              <ErrorSummary
                key={`fields-${errorVersion}`}
                errors={fieldErrors}
              />
            ) : null}
            {credentialsError ? (
              <ErrorSummary
                key={`credentials-${errorVersion}`}
                title={credentialsError}
              />
            ) : null}
            {lockedError ? (
              <div
                id="login-locked"
                className="login-card__locked"
                tabIndex={-1}
              >
                <Alert variant="warning" title={lockedError} />
              </div>
            ) : null}
            <TextField
              id={USUARIO_FIELD}
              label="Usuario"
              value={usuario}
              onChange={handleUsuarioChange}
              autoComplete="username"
              error={usuarioError}
              required
            />
            <TextField
              id={PASSWORD_FIELD}
              label="Contraseña"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              autoComplete="current-password"
              error={passwordError}
              required
            />
            <Button type="submit" variant="primary" fullWidth disabled={submitting}>
              {submitting ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
          <div className="login-card__help">
            <p>¿Olvidó su contraseña?</p>
            <p>Comuníquese con la mesa de ayuda de TI.</p>
          </div>
        </div>
        <p className="login-page__notice">
          Uso exclusivo del personal. Las acciones quedan registradas.
        </p>
        {USE_MOCK ? (
          <p className="login-page__demo">
            Modo demostración: atencion / demo1234 · operador1 / demo1234 ·
            operador2 / demo1234
          </p>
        ) : null}
        <p className="visually-hidden" role="status" aria-live="polite">
          {submitting ? 'Ingresando…' : ''}
        </p>
      </main>
    </div>
  )
}
