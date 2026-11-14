import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import './Modal.css'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

/**
 * Diálogo modal con foco atrapado y cierre con Escape.
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.title
 * @param {() => void} props.onClose
 * @param {import('react').ReactNode} props.children
 * @param {import('react').ReactNode} [props.secondaryAction]
 * @param {import('react').ReactNode} [props.primaryAction]
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  secondaryAction,
  primaryAction,
}) {
  const titleId = useId()
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const dialog = dialogRef.current
    const previouslyFocused = document.activeElement
    const focusables = Array.from(dialog.querySelectorAll(FOCUSABLE))
    const firstFocusable = focusables[0]

    if (firstFocusable) {
      firstFocusable.focus()
    } else {
      dialog.focus()
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const items = Array.from(dialog.querySelectorAll(FOCUSABLE))
      if (items.length === 0) {
        event.preventDefault()
        return
      }

      const first = items[0]
      const last = items[items.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus()
      }
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="modal-backdrop">
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <h2 id={titleId} className="modal__title">
          {title}
        </h2>
        <div className="modal__content">{children}</div>
        {secondaryAction || primaryAction ? (
          <div className="modal__actions">
            {secondaryAction}
            {primaryAction}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
