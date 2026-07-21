export default function Header() {
  return (
    <header className="site-head">
      <h1>Ambiguity in Guardrails</h1>
      <p>
        Guardrail models are evaluated as if safety labels were measurements. Many are
        contested judgments. This sandbox reconstructs a guardrail's verdict as a
        defeasible argument, surfaces the assumption that would make the opposite verdict
        reasonable, and re-runs the guard to show how it behaves when the label is open.
      </p>
    </header>
  )
}
