import { useState } from 'react'
import { Button } from './Button.jsx'
import './DataTable.css'

const numberFormatter = new Intl.NumberFormat('es-PE')

/**
 * Tabla de datos con paginación y primera columna fija.
 * @param {object} props
 * @param {string} props.caption
 * @param {Array<{ key: string, header: string, align?: 'left' | 'right', render?: (row: object) => import('react').ReactNode }>} props.columns
 * @param {Array<object>} props.rows
 * @param {(row: object, index: number) => string | number} [props.getRowKey]
 * @param {string} [props.emptyMessage]
 * @param {number} [props.pageSize]
 */
export function DataTable({
  caption,
  columns,
  rows,
  getRowKey,
  emptyMessage,
  pageSize = 50,
}) {
  const [page, setPage] = useState(0)

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, totalPages - 1)
  const start = currentPage * pageSize
  const end = Math.min(start + pageSize, rows.length)
  const pageRows = rows.slice(start, end)
  const hasPagination = rows.length > pageSize

  return (
    <div className="data-table">
      <div className="data-table__wrapper">
        <table className="data-table__table">
          {caption ? (
            <caption className="data-table__caption">{caption}</caption>
          ) : null}
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={
                    column.align === 'right'
                      ? 'data-table__head data-table__cell--right'
                      : 'data-table__head'
                  }
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  className="data-table__empty"
                  colSpan={Math.max(columns.length, 1)}
                >
                  {emptyMessage ?? 'No hay datos para mostrar.'}
                </td>
              </tr>
            ) : (
              pageRows.map((row, index) => (
                <tr
                  key={
                    getRowKey ? getRowKey(row, start + index) : start + index
                  }
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={
                        column.align === 'right'
                          ? 'data-table__cell data-table__cell--right num'
                          : 'data-table__cell'
                      }
                    >
                      {column.render
                        ? column.render(row)
                        : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {hasPagination ? (
        <nav className="data-table__pagination" aria-label="Paginación">
          <p className="data-table__counter num" aria-live="polite">
            Mostrando {numberFormatter.format(start + 1)} a{' '}
            {numberFormatter.format(end)} de{' '}
            {numberFormatter.format(rows.length)}
          </p>
          <div className="data-table__pagination-actions">
            <Button
              variant="secondary"
              disabled={currentPage === 0}
              onClick={() => setPage(Math.max(0, currentPage - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              disabled={currentPage >= totalPages - 1}
              onClick={() =>
                setPage(Math.min(totalPages - 1, currentPage + 1))
              }
            >
              Siguiente
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  )
}
