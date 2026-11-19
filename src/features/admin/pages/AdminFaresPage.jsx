import { useState, useEffect } from 'react'
import { CreditCard, Save, Calculator, RefreshCw, CheckCircle, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { calculateLegFare } from '@/lib/fare'
import { useToastStore } from '@/components/ui/Toast'

export default function AdminFaresPage() {
  const [config, setConfig] = useState({
    min_fare: 5,
    per_stage: 5,
    stage_km: 2.0,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testDist, setTestDist] = useState(6.5)

  const { addToast } = useToastStore()

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('fare_config')
        .select('*')
        .eq('id', 1)
        .single()

      if (error) throw error
      if (data) {
        setConfig({
          min_fare: Number(data.min_fare),
          per_stage: Number(data.per_stage),
          stage_km: Number(data.stage_km),
        })
      }
    } catch (err) {
      addToast({ message: `Failed to load fare configuration: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase
        .from('fare_config')
        .update({
          min_fare: Number(config.min_fare),
          per_stage: Number(config.per_stage),
          stage_km: Number(config.stage_km),
        })
        .eq('id', 1)

      if (error) throw error

      addToast({ message: 'Fare configuration updated successfully!', type: 'success' })
      fetchConfig()
    } catch (err) {
      addToast({ message: `Error saving fare config: ${err.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const testFare = calculateLegFare(testDist, config)

  const sampleDistances = [1, 2, 3.5, 5, 8, 12, 18, 25]

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-ink font-heading flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-cobalt" />
            Fare Rules & Stage Matrix
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Configure stage distance length, base minimum fare, and per-stage incremental rate.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-cobalt text-white text-xs font-bold rounded-input shadow-soft hover:bg-cobalt/90 transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Fare Rules'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fare Parameters Form */}
        <div className="bg-surface rounded-card border border-line p-5 shadow-soft space-y-4">
          <h3 className="text-xs font-extrabold text-ink uppercase tracking-wider">
            Fare Parameters
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Minimum Base Fare (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-secondary">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={config.min_fare}
                  onChange={(e) =>
                    setConfig({ ...config, min_fare: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full pl-8 pr-3 py-2 bg-page border border-line rounded-input text-xs font-mono font-bold text-ink focus:outline-none focus:border-cobalt"
                />
              </div>
              <span className="text-[11px] text-text-secondary mt-1 block">
                Lowest possible fare charged for any trip segment.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Stage Length (km)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.5"
                  step="0.1"
                  required
                  value={config.stage_km}
                  onChange={(e) =>
                    setConfig({ ...config, stage_km: parseFloat(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs font-mono font-bold text-ink focus:outline-none focus:border-cobalt"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-secondary">
                  km
                </span>
              </div>
              <span className="text-[11px] text-text-secondary mt-1 block">
                Distance increment that qualifies as 1 fare stage.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Rate Per Stage (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-secondary">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={config.per_stage}
                  onChange={(e) =>
                    setConfig({ ...config, per_stage: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full pl-8 pr-3 py-2 bg-page border border-line rounded-input text-xs font-mono font-bold text-ink focus:outline-none focus:border-cobalt"
                />
              </div>
              <span className="text-[11px] text-text-secondary mt-1 block">
                Cost added per each stage calculated as ceil(distance / stage_km).
              </span>
            </div>
          </div>

          <div className="p-3 bg-page border border-line rounded-input flex items-start gap-2 text-xs text-text-secondary">
            <Info className="w-4 h-4 text-cobalt shrink-0 mt-0.5" />
            <div>
              <strong className="text-ink">Formula:</strong>
              <code className="block font-mono text-[11px] text-cobalt mt-0.5">
                Fare = max(min_fare, ceil(km / stage_km) × per_stage)
              </code>
            </div>
          </div>
        </div>

        {/* Live Simulator & Rate Chart */}
        <div className="bg-surface rounded-card border border-line p-5 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-cobalt" />
              Fare Simulator
            </h3>
            <span className="text-xs font-bold text-cobalt bg-cobalt-tint px-2 py-0.5 rounded-full">
              Live Preview
            </span>
          </div>

          {/* Test Distance Input */}
          <div className="p-4 bg-page border border-line rounded-input space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-ink">Test Travel Distance:</span>
              <span className="font-mono font-bold text-cobalt text-sm">{testDist} km</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="35"
              step="0.5"
              value={testDist}
              onChange={(e) => setTestDist(parseFloat(e.target.value))}
              className="w-full accent-cobalt cursor-pointer"
            />
            <div className="flex items-center justify-between pt-2 border-t border-line text-xs">
              <span className="text-text-secondary">Calculated Passenger Fare:</span>
              <span className="text-lg font-black text-ink font-heading">₹ {testFare}</span>
            </div>
          </div>

          {/* Sample Matrix Table */}
          <div>
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-2">
              Sample Distance Pricing Matrix:
            </span>
            <div className="border border-line rounded-input overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-page border-b border-line text-text-secondary font-bold text-[11px]">
                  <tr>
                    <th className="p-2.5">Distance</th>
                    <th className="p-2.5">Stages</th>
                    <th className="p-2.5 text-right">Computed Fare</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sampleDistances.map((d) => {
                    const stages = Math.ceil(d / (config.stage_km || 1))
                    const f = calculateLegFare(d, config)
                    return (
                      <tr key={d} className="hover:bg-page/50">
                        <td className="p-2.5 font-mono">{d} km</td>
                        <td className="p-2.5 text-text-secondary">{stages} stages</td>
                        <td className="p-2.5 text-right font-bold text-ink">₹ {f}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
