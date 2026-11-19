import { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X } from 'lucide-react'

export default function DataTable({
  columns = [],
  data = [],
  searchKey,
  searchPlaceholder = 'Search records...',
  pageSize = 10,
  emptyMessage = 'No records found',
  headerActions,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortOrder, setSortOrder] = useState('asc') // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1)

  // Filter
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data
    const q = searchTerm.toLowerCase().trim()

    return data.filter((row) => {
      if (typeof searchKey === 'function') {
        return searchKey(row, q)
      }
      if (typeof searchKey === 'string') {
        const val = row[searchKey]
        return val ? String(val).toLowerCase().includes(q) : false
      }
      // Default: search all string / number fields
      return Object.values(row).some((val) =>
        val !== null && val !== undefined && String(val).toLowerCase().includes(q)
      )
    })
  }, [data, searchTerm, searchKey])

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey]
      const valB = b[sortKey]
      if (valA === valB) return 0
      if (valA === null || valA === undefined) return 1
      if (valB === null || valB === undefined) return -1
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA
      }
      return sortOrder === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA))
    })
  }, [filteredData, sortKey, sortOrder])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize))
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize])

  const handleSort = (key, sortable) => {
    if (!sortable) return
    if (sortKey === key) {
      if (sortOrder === 'asc') setSortOrder('desc')
      else {
        setSortKey(null)
        setSortOrder('asc')
      }
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  return (
    <div className="bg-surface rounded-card border border-line shadow-soft flex flex-col">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-line flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-8 py-2 bg-page border border-line rounded-input text-xs text-ink placeholder:text-text-secondary focus:outline-none focus:border-cobalt"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setCurrentPage(1)
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-ink p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-page/70 border-b border-line text-text-secondary uppercase font-bold text-[11px] tracking-wider select-none">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key, col.sortable)}
                  className={`px-4 py-3 ${col.sortable ? 'cursor-pointer hover:text-ink' : ''} ${col.className || ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.label}</span>
                    {col.sortable && sortKey === col.key && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-cobalt" /> : <ChevronDown className="w-3.5 h-3.5 text-cobalt" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, idx) => (
                <tr key={row.id || idx} className="hover:bg-page/40 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-ink ${col.cellClassName || ''}`}>
                      {col.render ? col.render(row[col.key], row, idx) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-text-secondary">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3.5 border-t border-line flex items-center justify-between text-xs text-text-secondary">
        <div>
          Showing {sortedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
          {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} records
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="p-1.5 rounded-input bg-page border border-line hover:border-cobalt disabled:opacity-40 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-ink px-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-1.5 rounded-input bg-page border border-line hover:border-cobalt disabled:opacity-40 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
