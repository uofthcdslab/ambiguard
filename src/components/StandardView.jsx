import { metrics, action } from '../lib/metrics.js'
import Threshold from './Threshold.jsx'

function Prediction({ row }) {
  if (!row.verdict) return <span className="muted">pending</span>
  if (row.p_unsafe != null) {
    return <span className="num">{row.p_unsafe.toFixed(2)}</span>
  }
  return <span className="plain">{row.verdict}</span>
}

function Action({ row, threshold }) {
  if (!row.verdict) return <span className="verdict na">pending</span>
  const a = action(row, threshold)
  return <span className={`verdict ${a === 'blocked' ? 'block' : 'allow'}`}>{a}</span>
}

export default function StandardView({ rows, threshold, setThreshold, sliderEnabled }) {
  const m = metrics(rows, threshold)

  return (
    <div className="exp standard">
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th className="c-instance">Instance</th>
              <th className="c-truth">Ground truth</th>
              <th className="c-pred">Guard prediction</th>
              <th className="c-pred">Guard action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="c-instance">{row.instance}</td>
                <td className="c-truth">{row.ground_truth || '\u2014'}</td>
                <td className="c-pred"><Prediction row={row} /></td>
                <td className="c-pred"><Action row={row} threshold={threshold} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <aside className="side">
        <div className="panel">
          <Threshold value={threshold} setValue={setThreshold} enabled={sliderEnabled} />
          <div className="stat-block">
            <div className="stat"><span className="name">F1</span><span className="val">{m.f1s}</span></div>
            <div className="stat"><span className="name">FPR</span><span className="val">{m.fprs}</span></div>
            <div className="stat"><span className="name">Recall</span><span className="val">{m.recalls}</span></div>
          </div>
          {m.unlabelled > 0 && (
            <p className="note">
              {m.unlabelled} of {m.n} instances have no ground truth and are excluded from
              these three numbers.
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}
