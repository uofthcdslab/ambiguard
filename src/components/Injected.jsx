// Highlight whatever the reasoner added, by diffing the injection against the
// original instance rather than searching for the assumption verbatim. Prompt 1
// usually appends the assumption unchanged, but Prompt 2 often rewords it while
// injecting, so an exact-match search silently fails and nothing gets marked.
function diff(original, injection) {
    const o = original || ''
    const n = injection
  
    let start = 0
    while (start < o.length && start < n.length && o[start] === n[start]) start++
  
    let endO = o.length
    let endN = n.length
    while (endO > start && endN > start && o[endO - 1] === n[endN - 1]) { endO--; endN-- }
  
    // Snap outward to whitespace so a shared prefix ending mid-word does not
    // produce a highlight that starts halfway through one.
    while (start > 0 && !/\s/.test(n[start - 1])) start--
    while (endN < n.length && !/\s/.test(n[endN])) endN++
  
    return { before: n.slice(0, start), added: n.slice(start, endN), after: n.slice(endN) }
  }
  
  export default function Injected({ original, injection }) {
    if (!injection) return null
  
    const { before, added, after } = diff(original, injection)
  
    // Nothing shared, or nothing added: show it plain rather than highlighting the
    // whole thing, which would say nothing.
    if (!added || added.length >= injection.length * 0.9) {
      return <div className="body">{injection}</div>
    }
  
    return (
      <div className="body">
        {before}
        <b>{added}</b>
        {after}
      </div>
    )
  }