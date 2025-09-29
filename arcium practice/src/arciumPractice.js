// Illustrative Arcium-style checks separated from execution
export function buildPolicyEvaluator() {
  function evaluate({ owner, recipient, amount }) {
    const checks = [];
    checks.push(Boolean(owner));
    checks.push(Boolean(recipient));
    checks.push(Number(amount) > 0);
    const approved = checks.every(Boolean);
    return { approved, checks };
  }
  return { evaluate };
}


