import './Panel.css'

/**
 * Panel de contenido con borde y título opcional.
 * @param {object} props
 * @param {string} [props.title]
 * @param {import('react').ReactNode} props.children
 */
export function Panel({ title, children }) {
  return (
    <section className="panel">
      {title ? <h2 className="panel__title">{title}</h2> : null}
      <div className="panel__body">{children}</div>
    </section>
  )
}
