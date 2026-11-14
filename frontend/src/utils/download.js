/**
 * Guarda un Blob usando un enlace temporal.
 * @param {Blob} blob
 * @param {string} filename
 * @returns {void}
 */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}
