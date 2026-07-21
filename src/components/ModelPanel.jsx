import { GUARDS, REASONER } from '../config.js'

export default function ModelPanel({ guardId, setGuardId, apiKey, setApiKey }) {
  return (
    <section className="panel">
      <h2>Guardrail model</h2>

      <div className="field">
        <label htmlFor="guard">Guard (G)</label>
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
          Held in memory for this tab only. Never saved to the browser, never sent anywhere
          except OpenRouter, and cleared when you reload the page.
        </p>
      </div>

      <p className="note">
        Reconstructions use {REASONER.label} as the reasoning model (A).
      </p>
    </section>
  )
}
