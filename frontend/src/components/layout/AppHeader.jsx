import { APP_NAME, ENTIDAD } from '../../config/app.js'
import { getAreaByCode } from '../../config/areas.js'
import { ROLES } from '../../config/navigation.js'
import { useAuth } from '../../hooks/useAuth.js'
import './AppHeader.css'

export function AppHeader() {
  const { user, logout } = useAuth()
  const roleLabel = user ? (ROLES[user.rol] ?? user.rol) : ''
  const area = user?.area ? getAreaByCode(user.area) : null
  const userName =
    user?.rol === 'operador' && area
      ? `${user.nombre}, ${roleLabel} · ${area.shortLabel}`
      : user
        ? `${user.nombre}, ${roleLabel}`
        : ''

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__entity">{ENTIDAD}</span>
        <span className="app-header__separator" aria-hidden="true">
          /
        </span>
        <span className="app-header__system">{APP_NAME}</span>
      </div>
      {user ? (
        <div className="app-header__user">
          <span className="app-header__user-name">{userName}</span>
          <button
            type="button"
            className="app-header__logout"
            onClick={logout}
          >
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </header>
  )
}
