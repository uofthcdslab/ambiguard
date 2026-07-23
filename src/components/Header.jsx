export default function Header() {
  return (
    <header className="site-head">
      <h1>
        <span className="brand">AmbiGuard</span>: Reflective Evaluation of AI Safety Guardrails
      </h1>
      <p>
        Guardrail models are evaluated as if safety labels are determinate. Many are
        contested judgments that rely on unstated assumptions. This sandbox, <b>AmbiGuard</b>, reconstructs a
        guardrail's verdict as a defeasible argument, surfaces an assumption that would
        make the opposite verdict reasonable, and re-runs the guard to show how it behaves.{' '}
        <span className="repo-line">
          <a href="https://github.com/uofthcdslab/ambiguard" target="_blank" rel="noopener noreferrer">
            See our project repository
          </a>{' '}
          for the prompts, method, and study design.
        </span>
      </p>
    </header>
  )
}
// import { BASE } from '../config.js'

// export default function Header() {
//   return (
//     <header className="site-head">
//       <div className="head-text">
//         <h1>Reflective Evaluation of AI Safety Guardrails</h1>
//         <p>
//           Guardrail models are evaluated as if safety labels are determinate. Many are
//           contested judgments that rely on unstated assumptions. This sandbox reconstructs a
//           guardrail's verdict as a defeasible argument, surfaces the assumption that would
//           make the opposite verdict reasonable, and re-runs the guard to show how it behaves.
//         </p>
//       </div>
//       <img className="head-logo" src={`${BASE}logo.png`} alt="" />
//     </header>
//   )
// }