import './SkipLink.css'

export function SkipLink() {
  const handleClick = (event) => {
    event.preventDefault()
    const target = document.getElementById('contenido')
    if (target) {
      target.focus({ preventScroll: true })
      target.scrollIntoView({ block: 'start' })
    }
  }

  return (
    <a className="skip-link" href="#contenido" onClick={handleClick}>
      Saltar al contenido
    </a>
  )
}
