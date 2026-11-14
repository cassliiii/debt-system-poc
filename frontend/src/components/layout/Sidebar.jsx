import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../../config/navigation.js'
import { useAuth } from '../../hooks/useAuth.js'
import './Sidebar.css'

export function Sidebar() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  const items = NAV_ITEMS.filter((item) =>
    user ? item.roles.includes(user.rol) : false,
  )

  return (
    <>
      <button
        type="button"
        className="sidebar__toggle"
        aria-expanded={open}
        aria-controls="sidebar-menu"
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        Menú
      </button>
      <aside
        id="sidebar-menu"
        className={`sidebar${open ? ' sidebar--open' : ''}`}
      >
        <nav aria-label="Menú principal">
          <ul className="sidebar__list">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    isActive
                      ? 'sidebar__item sidebar__item--active'
                      : 'sidebar__item'
                  }
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  )
}
