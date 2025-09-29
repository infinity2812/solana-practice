export function basicPolicy({ owner, recipient, amount }) {
  const minAmount = 1;
  const ownerOk = Boolean(owner);
  const recipientOk = Boolean(recipient);
  const amountOk = Number(amount) >= minAmount;
  const approved = ownerOk && recipientOk && amountOk;
  return { approved, reasons: { ownerOk, recipientOk, amountOk } };
}


