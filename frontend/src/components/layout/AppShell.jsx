import { Outlet } from 'react-router-dom'
import { AppHeader } from './AppHeader.jsx'
import { Sidebar } from './Sidebar.jsx'
import { SkipLink } from './SkipLink.jsx'
import './AppShell.css'

export function AppShell() {
  return (
    <div className="app-shell">
      <SkipLink />
      <AppHeader />
      <div className="app-shell__body">
        <Sidebar />
        <main id="contenido" className="app-shell__main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
