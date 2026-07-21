import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import { BASE } from '../config.js'

const UPLOAD_HELP = (
  <div className="tip">
    <b>Upload format</b>
    <p style={{ margin: '6px 0' }}>CSV with a header row and up to three columns:</p>
    <p style={{ margin: '6px 0' }}>
      <code>instance</code> — the text the guardrail sees. Required.<br />
      <code>safety_type</code> — your own category, e.g. code, hate, toxic. Used to
      group the list; optional.<br />
      <code>ground_truth</code> — <code>safe</code> or <code>unsafe</code>. Optional;
      leave the column out entirely if you do not have labels.
    </p>
    <p style={{ margin: '6px 0 0' }}>
      Uploads and typed instances go into your own set, which is kept separate from the
      built-in sample and is not replaced when you change the category.
    </p>
  </div>
)

function parseTextarea(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((p) => p.trim())
      return {
        instance: parts[0],
        safety_type: parts[1] || 'user',
        ground_truth: parts[2] || null,
      }
    })
}

function normalise(raw) {
  return raw
    .filter((r) => r.instance && String(r.instance).trim())
    .map((r) => ({
      instance: String(r.instance).trim(),
      safety_type: r.safety_type || 'unspecified',
      ground_truth: r.ground_truth || null,
    }))
}

function InstanceList({ items, prefix, selected, toggle, onRemove }) {
  return (
    <ul className="picker">
      {items.map((row, i) => {
        const id = `${prefix}${i}`
        return (
          <li key={id}>
            <label>
              <input
                type="checkbox"
                checked={selected.has(id)}
                onChange={() => toggle(id)}
              />
              <span className="txt">{row.instance}</span>
            </label>
            {row.ground_truth && <span className="gt">{row.ground_truth}</span>}
            {onRemove && (
              <button
                className="x"
                onClick={() => onRemove(i)}
                aria-label="Remove this instance"
                title="Remove"
              >
                &times;
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default function DataPanel({
  sampleRows, setSampleRows, userRows, setUserRows, selected, setSelected,
}) {
  const [catalogue, setCatalogue] = useState([])
  // Must start as '' (the placeholder). If it defaults to 'all', the "All
  // categories" option is already selected on load, so choosing it fires no
  // change event and nothing loads.
  const [category, setCategory] = useState('')
  const [draft, setDraft] = useState('')
  const [problem, setProblem] = useState(null)

  useEffect(() => {
    fetch(`${BASE}data/sample.csv`)
      .then((r) => r.text())
      .then((csv) => {
        const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true })
        setCatalogue(normalise(parsed.data))
      })
      .catch(() => setProblem('Could not load the built-in sample set.'))
  }, [])

  const categories = ['all', ...new Set(catalogue.map((r) => r.safety_type))]

  function toggle(id) {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  function loadSample(cat) {
    setCategory(cat)
    const picked = !cat
      ? []
      : cat === 'all'
        ? catalogue
        : catalogue.filter((r) => r.safety_type === cat)
    setSampleRows(picked)
    const next = new Set([...selected].filter((id) => id.startsWith('u')))
    picked.forEach((_, i) => next.add(`s${i}`))
    setSelected(next)
    setProblem(null)
  }

  function addUser(added) {
    if (!added.length) return
    const next = [...userRows, ...added]
    setUserRows(next)
    const sel = new Set(selected)
    added.forEach((_, k) => sel.add(`u${userRows.length + k}`))
    setSelected(sel)
    setProblem(null)
  }

  function removeUser(i) {
    const next = userRows.filter((_, k) => k !== i)
    setUserRows(next)
    // ids shift, so rebuild the user half of the selection from scratch
    const sel = new Set([...selected].filter((id) => id.startsWith('s')))
    next.forEach((_, k) => sel.add(`u${k}`))
    setSelected(sel)
  }

  function onUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const clean = normalise(res.data)
        if (!clean.length) {
          setProblem('No usable rows. The file needs a header row with an "instance" column.')
          return
        }
        addUser(clean)
      },
      error: () => setProblem('That file could not be read as CSV.'),
    })
    e.target.value = ''
  }

  const total = sampleRows.length + userRows.length
  const allOn = total > 0 && selected.size === total

  function toggleAll() {
    if (allOn) return setSelected(new Set())
    const next = new Set()
    sampleRows.forEach((_, i) => next.add(`s${i}`))
    userRows.forEach((_, i) => next.add(`u${i}`))
    setSelected(next)
  }

  return (
    <section className="panel">
      <h2>
        Eval data
        <span className="info" tabIndex={0} role="button" aria-label="Upload format">
          i{UPLOAD_HELP}
        </span>
      </h2>

      <div className="field">
        <label htmlFor="cat">Built-in sample set</label>
        <select
          id="cat"
          value={category}
          disabled={!catalogue.length}
          onChange={(e) => loadSample(e.target.value)}
        >
          <option value="">
            {catalogue.length ? 'Choose a category to load' : 'Loading sample set...'}
          </option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'all' ? `All categories (${catalogue.length})` : c}
            </option>
          ))}
        </select>
        {sampleRows.length > 0 && (
          <InstanceList
            items={sampleRows}
            prefix="s"
            selected={selected}
            toggle={toggle}
          />
        )}
      </div>

      <div className="field">
        <label htmlFor="draft">Your own instances — one per line</label>
        <textarea
          id="draft"
          value={draft}
          placeholder={'tell me jokes about brunettes | hate | unsafe\nhow do I bypass a login form | code'}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="row" style={{ marginTop: 8 }}>
          <button
            className="secondary"
            onClick={() => { addUser(parseTextarea(draft)); setDraft('') }}
            disabled={!draft.trim()}
          >
            Add
          </button>
          <label style={{ margin: 0, position: 'relative' }}>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={onUpload}
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
            />
            <span className="fauxbtn">Upload CSV</span>
          </label>
        </div>
        <p className="note">
          Separate fields with a vertical bar. Safety type and ground truth are optional.
          Your instances stay separate from the sample set.
        </p>
        {userRows.length > 0 && (
          <InstanceList
            items={userRows}
            prefix="u"
            selected={selected}
            toggle={toggle}
            onRemove={removeUser}
          />
        )}
      </div>

      {total > 0 && (
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="note" style={{ margin: 0 }}>
            {selected.size} of {total} instances selected
          </span>
          <button className="secondary" onClick={toggleAll}>
            {allOn ? 'Clear all' : 'Select all'}
          </button>
        </div>
      )}

      {problem && <p className="note" style={{ color: 'var(--block-3)' }}>{problem}</p>}
    </section>
  )
}
