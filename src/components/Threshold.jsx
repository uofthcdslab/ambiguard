export default function Threshold({ value, setValue, enabled }) {
  return (
    <div className={`slider-box${enabled ? '' : ' disabled'}`}>
      <div className="head">
        <span>Block threshold</span>
        <span>{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        disabled={!enabled}
        onChange={(e) => setValue(Number(e.target.value))}
        aria-label="Block threshold"
      />
      {!enabled && (
        <p className="note" style={{ marginTop: 8 }}>
          This guard returns a label, not a score, so there is nothing to threshold. The
          control is shown because it is the standard one, and disabled because it would
          have no effect.
        </p>
      )}
    </div>
  )
}
