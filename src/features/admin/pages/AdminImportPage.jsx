import { useState, useRef } from 'react'
import { Upload, FileCheck, AlertCircle, CheckCircle, Info, RefreshCw, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/components/ui/Toast'

// Robust browser CSV parser
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return { headers: [], rows: [] }

  const parseLine = (line) => {
    const values = []
    let current = ''
    let insideQuote = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (insideQuote && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          insideQuote = !insideQuote
        }
      } else if (char === ',' && !insideQuote) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())
    return values
  }

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().trim())
  const rows = lines.slice(1).map((l) => parseLine(l))
  return { headers, rows }
}

const FILE_TYPES = [
  {
    type: 'stops',
    label: '1. Stops Master (stops.csv)',
    headers: ['name_en', 'name_kn', 'lat', 'lng'],
    template: 'name_en,name_kn,lat,lng\nOld Bus Stand,ಹಳೆ ಬಸ್ ನಿಲ್ದಾಣ,15.3524,75.1382\nRailway Station,ರೈಲ್ವೆ ನಿಲ್ದಾಣ,15.3489,75.1436',
  },
  {
    type: 'routes',
    label: '2. Routes Master (routes.csv)',
    headers: ['code', 'name_en', 'name_kn', 'color', 'two_way'],
    template: 'code,name_en,name_kn,color,two_way\n201,OBS - Airport,ಹಳೆ ಬಸ್ ನಿಲ್ದಾಣ - ವಿಮಾನ ನಿಲ್ದಾಣ,#3451F2,true\n45A,OBS - Chennamma Circle,ಹಳೆ ಬಸ್ ನಿಲ್ದಾಣ - ಚೆನ್ನಮ್ಮ ವೃತ್ತ,#F0643C,true',
  },
  {
    type: 'route_stops',
    label: '3. Route Stops Sequence (route_stops.csv)',
    headers: ['route_code', 'seq', 'stop_name_en', 'dist_km', 'min_from_prev'],
    template: 'route_code,seq,stop_name_en,dist_km,min_from_prev\n201,1,Old Bus Stand,0,0\n201,2,Chennamma Circle,1.8,7\n201,3,Airport,8.4,26',
  },
  {
    type: 'schedules',
    label: '4. Schedules (schedules.csv)',
    headers: ['route_code', 'day_type', 'first_bus', 'last_bus', 'headway_min'],
    template: 'route_code,day_type,first_bus,last_bus,headway_min\n201,weekday,06:00:00,21:30:00,15\n201,weekend,06:30:00,21:00:00,20',
  },
]

export default function AdminImportPage() {
  const [selectedType, setSelectedType] = useState('stops')
  const [fileName, setFileName] = useState('')
  const [parsedRows, setParsedRows] = useState([]) // [{ raw: {}, valid: bool, error?: string }]
  const [importing, setImporting] = useState(false)
  const [summary, setSummary] = useState(null)

  const fileInputRef = useRef(null)
  const { addToast } = useToastStore()

  const currentConfig = FILE_TYPES.find((f) => f.type === selectedType)

  // Validate parsed rows based on file type
  const validateRows = (headers, rows, type) => {
    // Check if required headers exist
    const required = currentConfig.headers
    const missingHeader = required.filter((r) => !headers.includes(r))
    if (missingHeader.length > 0) {
      addToast({
        message: `Missing required column headers: ${missingHeader.join(', ')}`,
        type: 'error',
      })
      return []
    }

    const headerIndices = {}
    headers.forEach((h, idx) => {
      headerIndices[h] = idx
    })

    return rows.map((r, rowIndex) => {
      const getVal = (field) => r[headerIndices[field]] ?? ''
      const rowObj = {}
      headers.forEach((h) => {
        rowObj[h] = getVal(h)
      })

      let valid = true
      let error = ''

      if (type === 'stops') {
        const name_en = getVal('name_en')
        const lat = parseFloat(getVal('lat'))
        const lng = parseFloat(getVal('lng'))
        if (!name_en) {
          valid = false
          error = 'Missing name_en'
        } else if (isNaN(lat) || isNaN(lng)) {
          valid = false
          error = 'Invalid lat or lng coordinates'
        }
      } else if (type === 'routes') {
        const code = getVal('code')
        const name_en = getVal('name_en')
        if (!code) {
          valid = false
          error = 'Missing route code'
        } else if (!name_en) {
          valid = false
          error = 'Missing route name_en'
        }
      } else if (type === 'route_stops') {
        const route_code = getVal('route_code')
        const seq = parseInt(getVal('seq'), 10)
        const stop_name_en = getVal('stop_name_en')
        if (!route_code) {
          valid = false
          error = 'Missing route_code'
        } else if (isNaN(seq) || seq < 1) {
          valid = false
          error = 'Invalid sequence number'
        } else if (!stop_name_en) {
          valid = false
          error = 'Missing stop_name_en'
        }
      } else if (type === 'schedules') {
        const route_code = getVal('route_code')
        const day_type = getVal('day_type')
        const headway_min = parseInt(getVal('headway_min'), 10)
        if (!route_code) {
          valid = false
          error = 'Missing route_code'
        } else if (!['weekday', 'weekend'].includes(day_type)) {
          valid = false
          error = "day_type must be 'weekday' or 'weekend'"
        } else if (isNaN(headway_min) || headway_min <= 0) {
          valid = false
          error = 'Invalid headway_min'
        }
      }

      return {
        rowNumber: rowIndex + 2, // header is line 1
        data: rowObj,
        valid,
        error,
      }
    })
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setFileName(file.name)
    setSummary(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target.result
      const { headers, rows } = parseCSV(text)
      const validated = validateRows(headers, rows, selectedType)
      setParsedRows(validated)
    }
    reader.readAsText(file)
  }

  // Handle actual database import
  const handleImport = async () => {
    const validItems = parsedRows.filter((r) => r.valid).map((r) => r.data)
    if (validItems.length === 0) {
      addToast({ message: 'No valid rows to import.', type: 'warning' })
      return
    }

    setImporting(true)
    let importedCount = 0
    let failedCount = 0

    try {
      if (selectedType === 'stops') {
        const payload = validItems.map((item) => ({
          name_en: item.name_en,
          name_kn: item.name_kn || null,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lng),
          active: true,
        }))

        const { error } = await supabase.from('stops').upsert(payload, {
          onConflict: 'name_en',
        })
        if (error) throw error
        importedCount = payload.length
      } else if (selectedType === 'routes') {
        const payload = validItems.map((item) => ({
          code: item.code.toUpperCase(),
          name_en: item.name_en,
          name_kn: item.name_kn || null,
          color: item.color || '#3451F2',
          two_way: item.two_way === 'false' ? false : true,
          active: true,
        }))

        const { error } = await supabase.from('routes').upsert(payload, {
          onConflict: 'code',
        })
        if (error) throw error
        importedCount = payload.length
      } else if (selectedType === 'route_stops') {
        // Resolve route_code -> route_id and stop_name_en -> stop_id
        const [
          { data: routes },
          { data: stops },
        ] = await Promise.all([
          supabase.from('routes').select('id, code'),
          supabase.from('stops').select('id, name_en'),
        ])

        const routeMap = new Map((routes || []).map((r) => [r.code.toUpperCase(), r.id]))
        const stopMap = new Map((stops || []).map((s) => [s.name_en.toLowerCase(), s.id]))

        const payload = []
        for (const item of validItems) {
          const routeId = routeMap.get(item.route_code.toUpperCase())
          const stopId = stopMap.get(item.stop_name_en.toLowerCase())

          if (!routeId) {
            failedCount++
            continue
          }
          if (!stopId) {
            failedCount++
            continue
          }

          payload.push({
            route_id: routeId,
            stop_id: stopId,
            seq: parseInt(item.seq, 10),
            dist_km: parseFloat(item.dist_km) || 0,
            min_from_prev: parseInt(item.min_from_prev, 10) || 0,
          })
        }

        if (payload.length > 0) {
          const { error } = await supabase.from('route_stops').upsert(payload, {
            onConflict: 'route_id,seq',
          })
          if (error) throw error
          importedCount = payload.length
        }
      } else if (selectedType === 'schedules') {
        const { data: routes } = await supabase.from('routes').select('id, code')
        const routeMap = new Map((routes || []).map((r) => [r.code.toUpperCase(), r.id]))

        const payload = []
        for (const item of validItems) {
          const routeId = routeMap.get(item.route_code.toUpperCase())
          if (!routeId) {
            failedCount++
            continue
          }

          payload.push({
            route_id: routeId,
            day_type: item.day_type,
            first_bus: item.first_bus.includes(':') && item.first_bus.split(':').length === 2 ? `${item.first_bus}:00` : item.first_bus,
            last_bus: item.last_bus.includes(':') && item.last_bus.split(':').length === 2 ? `${item.last_bus}:00` : item.last_bus,
            headway_min: parseInt(item.headway_min, 10),
          })
        }

        if (payload.length > 0) {
          const { error } = await supabase.from('schedules').upsert(payload, {
            onConflict: 'route_id,day_type',
          })
          if (error) throw error
          importedCount = payload.length
        }
      }

      setSummary({
        imported: importedCount,
        skipped: parsedRows.length - importedCount,
      })
      addToast({
        message: `Import complete! Successfully imported ${importedCount} records.`,
        type: 'success',
      })
    } catch (err) {
      addToast({ message: `Import error: ${err.message}`, type: 'error' })
    } finally {
      setImporting(false)
    }
  }

  const validCount = parsedRows.filter((r) => r.valid).length
  const invalidCount = parsedRows.filter((r) => !r.valid).length

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-ink font-heading flex items-center gap-2">
          <Upload className="w-5 h-5 text-cobalt" />
          Bulk CSV Import Pipeline
        </h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Populate system master data by uploading standard transit CSV tables with client-side validation preview.
        </p>
      </div>

      {/* Step 1: Select Format */}
      <div className="bg-surface rounded-card border border-line p-5 shadow-soft space-y-3">
        <label className="block text-xs font-bold text-ink">
          Step 1: Choose Dataset Type to Ingest:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {FILE_TYPES.map((f) => (
            <button
              key={f.type}
              type="button"
              onClick={() => {
                setSelectedType(f.type)
                setParsedRows([])
                setFileName('')
                setSummary(null)
              }}
              className={`p-3 rounded-input text-left border transition ${
                selectedType === f.type
                  ? 'border-cobalt bg-cobalt-tint/30 text-cobalt'
                  : 'border-line bg-page text-ink hover:border-text-secondary'
              }`}
            >
              <span className="text-xs font-bold block">{f.label}</span>
              <span className="text-[10px] text-text-secondary font-mono mt-1 block truncate">
                {f.headers.join(', ')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Upload File & Template */}
      <div className="bg-surface rounded-card border border-line p-5 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-xs font-extrabold text-ink uppercase tracking-wider">
              Step 2: Upload CSV File
            </h3>
            <span className="text-[11px] text-text-secondary">
              Must include columns: <code className="font-mono text-cobalt">{currentConfig.headers.join(', ')}</code>
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              const blob = new Blob([currentConfig.template], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `${selectedType}_sample_template.csv`
              a.click()
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-page border border-line hover:border-text-secondary rounded-input text-xs font-bold text-ink transition self-start sm:self-auto"
          >
            <FileText className="w-3.5 h-3.5 text-cobalt" />
            <span>Download CSV Template</span>
          </button>
        </div>

        {/* Upload Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="p-8 border-2 border-dashed border-line hover:border-cobalt rounded-card bg-page/50 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2"
        >
          <div className="w-10 h-10 rounded-full bg-cobalt-tint text-cobalt flex items-center justify-center shadow-xs">
            <Upload className="w-5 h-5" />
          </div>
          <div className="text-xs font-bold text-ink">
            {fileName ? fileName : 'Click to select or drag and drop your CSV file here'}
          </div>
          <span className="text-[10px] text-text-secondary">Supported format: .csv</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Summary Card */}
      {summary && (
        <div className="p-4 bg-success/10 border border-success/30 rounded-card flex items-center justify-between text-xs text-success">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="font-bold">
              Successfully committed {summary.imported} rows to database! ({summary.skipped} skipped/invalid).
            </span>
          </div>
        </div>
      )}

      {/* Step 3: Validation Preview Table */}
      {parsedRows.length > 0 && (
        <div className="bg-surface rounded-card border border-line p-5 shadow-soft space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-xs font-extrabold text-ink uppercase tracking-wider">
                Step 3: Validation Preview ({parsedRows.length} rows)
              </h3>
              <div className="flex items-center gap-3 mt-1 text-xs">
                <span className="text-success font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {validCount} Valid
                </span>
                {invalidCount > 0 && (
                  <span className="text-danger font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {invalidCount} Invalid (Will be skipped)
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleImport}
              disabled={importing || validCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-cobalt text-white rounded-input text-xs font-bold shadow-soft hover:bg-cobalt/90 transition disabled:opacity-50"
            >
              <FileCheck className="w-4 h-4" />
              <span>{importing ? 'Importing Rows...' : `Import ${validCount} Valid Rows`}</span>
            </button>
          </div>

          {/* Rows table */}
          <div className="border border-line rounded-input overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-page border-b border-line text-text-secondary font-bold text-[11px] sticky top-0">
                <tr>
                  <th className="p-2.5">Line</th>
                  <th className="p-2.5">Status</th>
                  {currentConfig.headers.map((h) => (
                    <th key={h} className="p-2.5">
                      {h}
                    </th>
                  ))}
                  <th className="p-2.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {parsedRows.map((r, i) => (
                  <tr
                    key={i}
                    className={r.valid ? 'hover:bg-page/50' : 'bg-danger/5 hover:bg-danger/10'}
                  >
                    <td className="p-2.5 font-mono text-text-secondary">{r.rowNumber}</td>
                    <td className="p-2.5">
                      {r.valid ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success">
                          Valid
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger/15 text-danger">
                          Error
                        </span>
                      )}
                    </td>
                    {currentConfig.headers.map((h) => (
                      <td key={h} className="p-2.5 font-mono">
                        {r.data[h] || <span className="text-text-secondary italic">null</span>}
                      </td>
                    ))}
                    <td className="p-2.5 text-danger font-semibold text-[11px]">
                      {r.error || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
