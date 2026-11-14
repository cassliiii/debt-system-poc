import { useEffect } from 'react'
import { APP_NAME } from '../config/app.js'

/**
 * Asigna el título del documento.
 * @param {string} title
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = `${title} — ${APP_NAME}`
  }, [title])
}
