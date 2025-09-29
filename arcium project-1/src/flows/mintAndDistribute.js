import { createMint, getOrCreateAssociatedTokenAccount, mintTo, transfer } from '@solana/spl-token';

export async function mintAndDistribute({ connection, payer, recipients, decimals = 9, perRecipientAmount = 1_000_000 }) {
  const mint = await createMint(connection, payer, payer.publicKey, null, decimals);
  const ownerAta = await getOrCreateAssociatedTokenAccount(connection, payer, mint, payer.publicKey);
  await mintTo(connection, payer, mint, ownerAta.address, payer, perRecipientAmount * recipients.length);

  const transfers = [];
  for (const recipient of recipients) {
    const ata = await getOrCreateAssociatedTokenAccount(connection, payer, mint, recipient);
    const sig = await transfer(connection, payer, ownerAta.address, ata.address, payer, perRecipientAmount);
    transfers.push({ recipient, signature: sig });
  }

  return { mint, ownerAta: ownerAta.address, transfers };
}


