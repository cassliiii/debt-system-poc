import { APP_NAME, ENTIDAD } from '../../config/app.js'
import './AppHeader.css'

export function PublicHeader() {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__entity">{ENTIDAD}</span>
        <span className="app-header__separator" aria-hidden="true">
          /
        </span>
        <span className="app-header__system">{APP_NAME}</span>
      </div>
    </header>
  )
}
