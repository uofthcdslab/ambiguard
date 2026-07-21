// Highlight the added assumption inside the injected text. The reasoner is asked
// to append the assumption verbatim; when it paraphrases instead, we show the
// injection plain rather than guessing at a span and mislabelling which words
// were added.
function Injected({ injection, assumption }) {
  if (!injection) return null
  const at = assumption ? injection.indexOf(assumption) : -1
  if (at === -1) return <div className="body">{injection}</div>
  return (
    <div className="body">
      {injection.slice(0, at)}
      <b>{injection.slice(at, at + assumption.length)}</b>
      {injection.slice(at + assumption.length)}
    </div>
  )
}

function Verdict({ run }) {
  if (!run) return <span className="verdict na">not run</span>
  return (
    <span className={`verdict ${run.verdict === 'unsafe' ? 'block' : 'allow'}`}>
      {run.verdict}
      {run.p_unsafe != null && ` ${run.p_unsafe.toFixed(2)}`}
    </span>
  )
}

export default function InstanceDetail({ record, colSpan }) {
  if (!record) {
    return (
      <tr className="detail">
        <td colSpan={colSpan}>
          <div className="detail-inner">
            <p className="note" style={{ margin: 0 }}>
              No reconstruction for this instance yet.
            </p>
          </div>
        </td>
      </tr>
    )
  }

  const { support, flip, original } = record

  return (
    <tr className="detail">
      <td colSpan={colSpan}>
        <div className="detail-inner">
          <div className="arms">
            <div className="arm">
              <h4>With the assumption the verdict needs</h4>
              <Injected injection={support?.injection} assumption={support?.assumption} />
              <Verdict run={support?.run || original} />
            </div>

            <div className="arrow" aria-hidden="true">&#8594;</div>

            <div className="arm">
              <h4>With the most plausible assumption for the opposite verdict</h4>
              {flip?.assumption ? (
                <>
                  <Injected injection={flip.injection} assumption={flip.assumption} />
                  <Verdict run={flip.run} />
                </>
              ) : (
                <div className="body" style={{ color: 'var(--ink-faint)' }}>
                  No assumption cleared the plausibility bar. For this instance the verdict
                  holds up under any reasonable rereading.
                </div>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}
