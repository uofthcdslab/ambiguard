import { GUARDS } from '../config.js'

export default function ModelPanel({ guardId, setGuardId, apiKey, setApiKey }) {
  return (
    <section className="panel">
      <h2>Guardrail model</h2>

      <div className="field">
        <label htmlFor="guard">Guard</label>
        <select id="guard" value={guardId} onChange={(e) => setGuardId(e.target.value)}>
          {GUARDS.map((g) => (
            <option key={g.id} value={g.id}>{g.label}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="key">
          OpenRouter API key — only needed for instances that are not precomputed
        </label>
        <input
          id="key"
          type="password"
          value={apiKey}
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-or-..."
          onChange={(e) => setApiKey(e.target.value)}
        />
        <p className="note">
          Only needed for instances that are not already precomputed. The key is kept in
          this tab's memory, is never saved to the browser, and is cleared on reload — but
          it is <b>still present</b> in the page while you are using it, so anything with access
          to this browser can read it.
        </p>
      </div>
    </section>
  )
}