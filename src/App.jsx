import { useEffect, useMemo, useState } from 'react'
import Header from './components/Header.jsx'
import DataPanel from './components/DataPanel.jsx'
import ModelPanel from './components/ModelPanel.jsx'
import StandardView from './components/StandardView.jsx'
import AmbiguityView from './components/AmbiguityView.jsx'
import { GUARDS, MAX_LIVE_INSTANCES } from './config.js'
import { lookup } from './lib/cache.js'
import { runInstance } from './lib/pipeline.js'

export default function App() {
  // Two independent sources. Changing the category replaces sampleRows only;
  // anything the practitioner typed or uploaded survives.
  const [sampleRows, setSampleRows] = useState([])
  const [userRows, setUserRows] = useState([])
  const [selected, setSelected] = useState(new Set())

  const [guardId, setGuardId] = useState(GUARDS[0].id)
  const [apiKey, setApiKey] = useState('')

  const [view, setView] = useState('standard')
  const [threshold, setThreshold] = useState(0.5)
  const [records, setRecords] = useState({})
  const [levels, setLevels] = useState({})
  const [acked, setAcked] = useState({})
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)

  const guard = GUARDS.find((g) => g.id === guardId)
  const sliderEnabled = Boolean(guard?.logprobs)

  const active = useMemo(() => {
    const all = [
      ...sampleRows.map((r, i) => ({ ...r, id: `s${i}`, source: 'sample' })),
      ...userRows.map((r, i) => ({ ...r, id: `u${i}`, source: 'user' })),
    ]
    return all.filter((r) => selected.has(r.id))
  }, [sampleRows, userRows, selected])

  // Instances are keyed by text, so the resolution key is the text list.
  const activeKey = active.map((r) => r.instance).join('\u0000')

  useEffect(() => {
    let cancelled = false
    if (!active.length) { setRecords({}); setStatus(null); return }
    setStatus('Loading precomputed results')
    Promise.all(active.map(async (row) => [row.id, await lookup(row.instance, guardId)]))
      .then((pairs) => {
        if (cancelled) return
        const next = {}
        for (const [id, rec] of pairs) if (rec) next[id] = rec
        setRecords(next)
        const missing = pairs.filter(([, rec]) => !rec).length
        setStatus(
          missing === 0
            ? null
            : `${missing} of ${pairs.length} selected instances are not precomputed for this guard.`,
        )
      })
    return () => { cancelled = true }
  }, [activeKey, guardId])

  const merged = active.map((row) => {
    const rec = records[row.id]
    return {
      ...row,
      record: rec || null,
      verdict: rec?.original?.verdict || null,
      p_unsafe: rec?.original?.p_unsafe ?? null,
      level: rec?.level || null,
    }
  })

  const missing = merged.filter((r) => !r.record)
  const anyFixture = merged.some((r) => r.record?.fixture)

  async function runMissing() {
    if (!apiKey) { setStatus('Enter an OpenRouter API key to run these instances.'); return }
    const todo = missing.slice(0, MAX_LIVE_INSTANCES)
    setBusy(true)
    const next = { ...records }
    try {
      for (const [i, row] of todo.entries()) {
        const rec = await runInstance({
          apiKey,
          guardId,
          text: row.instance,
          meta: { safety_type: row.safety_type, ground_truth: row.ground_truth },
          onStage: (s) => setStatus(`Instance ${i + 1} of ${todo.length}: ${s}`),
        })
        next[row.id] = rec
        setRecords({ ...next })
      }
      setStatus(null)
    } catch (err) {
      setStatus(`Run stopped: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="wrap">
      <Header />

      <div className="setup">
        <DataPanel
          sampleRows={sampleRows} setSampleRows={setSampleRows}
          userRows={userRows} setUserRows={setUserRows}
          selected={selected} setSelected={setSelected}
        />
        <ModelPanel
          guardId={guardId} setGuardId={setGuardId}
          apiKey={apiKey} setApiKey={setApiKey}
        />
      </div>

      <div className="toggle-bar">
        <div className="toggle" role="group" aria-label="Analysis view">
          <button aria-pressed={view === 'standard'} onClick={() => setView('standard')}>
            Standard
          </button>
          <button aria-pressed={view === 'ambiguity'} onClick={() => setView('ambiguity')}>
            Ambiguity
          </button>
        </div>
      </div>

      {anyFixture && (
        <div className="banner warn">
          <b>Placeholder reconstructions.</b> Some rows are shipped fixtures, not real model
          output. Run <code>scripts/run_precompute.py</code> and replace{' '}
          <code>public/precomputed/</code> before showing this to a participant.
        </div>
      )}

      {status && (
        <div className="banner">
          {status}
          {missing.length > 0 && !busy && (
            <button
              className="secondary"
              style={{ marginLeft: 10, padding: '3px 10px' }}
              onClick={runMissing}
            >
              Run {Math.min(missing.length, MAX_LIVE_INSTANCES)} now
            </button>
          )}
        </div>
      )}

      {merged.length === 0 ? (
        <div className="empty">
          Load a sample set, or add your own instances, then tick the ones you want.
        </div>
      ) : view === 'standard' ? (
        <StandardView
          rows={merged}
          threshold={threshold} setThreshold={setThreshold}
          sliderEnabled={sliderEnabled}
        />
      ) : (
        <AmbiguityView
          rows={merged}
          threshold={threshold} setThreshold={setThreshold}
          sliderEnabled={sliderEnabled}
          levels={levels} setLevels={setLevels}
          acked={acked} setAcked={setAcked}
        />
      )}
    </div>
  )
}
