import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram, TransactionMessage, clusterApiUrl } from '@solana/web3.js';
import * as multisig from '@sqds/multisig';
const { Permission, Permissions } = multisig.types as any;

async function airdropIfNeeded(connection: Connection, pubkey: PublicKey): Promise<void> {
  try {
    const balance = await connection.getBalance(pubkey);
    if (balance < 0.2 * LAMPORTS_PER_SOL) {
      const sig = await connection.requestAirdrop(pubkey, 1 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction({ signature: sig, ...(await connection.getLatestBlockhash()) }, 'confirmed');
    }
  } catch (e) {
    console.log('Airdrop attempt failed, continuing:', (e as any)?.message || e);
  }
}

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
  const connection = new Connection(rpcUrl, 'confirmed');

  const creator = Keypair.generate();
  const secondMember = Keypair.generate();
  await airdropIfNeeded(connection, creator.publicKey);

  console.log('RPC:', rpcUrl);
  console.log('Creator:', creator.publicKey.toBase58());

  const createKey = Keypair.generate();
  const [multisigPda] = multisig.getMultisigPda({ createKey: createKey.publicKey });

  console.log('Creating multisig at PDA:', multisigPda.toBase58());

  // Fetch Program Config to get treasury
  const programConfigPda = multisig.getProgramConfigPda({})[0];
  const programConfig = await multisig.accounts.ProgramConfig.fromAccountAddress(connection, programConfigPda);
  const configTreasury = programConfig.treasury;

  const createSig = await multisig.rpc.multisigCreateV2({
    connection,
    // One-time random key
    createKey,
    // The creator & fee payer
    creator,
    multisigPda,
    configAuthority: null,
    timeLock: 0,
    members: [
      { key: creator.publicKey, permissions: Permissions.all() },
      { key: secondMember.publicKey, permissions: Permissions.fromPermissions([Permission.Vote]) },
    ],
    threshold: 2,
    rentCollector: null,
    treasury: configTreasury,
    sendOptions: { skipPreflight: true },
  });

  console.log('multisigCreate signature:', createSig);

  const multisigInfo = await multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda);
  console.log('Multisig created. Threshold:', multisigInfo.threshold.toString());

  const [vaultPda] = multisig.getVaultPda({ multisigPda, index: 0 });
  console.log('Vault PDA[0]:', vaultPda.toBase58());

  const currentTransactionIndex = Number(multisigInfo.transactionIndex);
  const txIndex = BigInt(currentTransactionIndex + 1);

  // Prepare a transfer instruction from the vault to the creator (may fail at execution if vault unfunded)
  const instruction = SystemProgram.transfer({
    fromPubkey: vaultPda,
    toPubkey: creator.publicKey,
    lamports: 1000000, // 0.001 SOL
  });
  const transferMessage = new TransactionMessage({
    payerKey: vaultPda,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    instructions: [instruction],
  });
  const vaultTxSig = await multisig.rpc.vaultTransactionCreate({
    connection,
    feePayer: creator,
    multisigPda,
    transactionIndex: txIndex,
    creator: creator.publicKey,
    vaultIndex: 0,
    ephemeralSigners: 0,
    transactionMessage: transferMessage,
    memo: 'Transfer 0.001 SOL to creator',
  });
  console.log('vaultTransactionCreate signature:', vaultTxSig, 'index:', txIndex.toString());

  const proposalSig = await multisig.rpc.proposalCreate({
    connection,
    feePayer: creator,
    multisigPda,
    transactionIndex: txIndex,
    creator,
  });
  console.log('proposalCreate signature:', proposalSig);

  const approveSig1 = await multisig.rpc.proposalApprove({
    connection,
    feePayer: creator,
    multisigPda,
    transactionIndex: txIndex,
    member: creator,
  });
  console.log('proposalApprove (creator) signature:', approveSig1);

  const approveSig2 = await multisig.rpc.proposalApprove({
    connection,
    feePayer: creator,
    multisigPda,
    transactionIndex: txIndex,
    member: secondMember,
  });
  console.log('proposalApprove (secondMember) signature:', approveSig2);

  try {
    const execSig = await multisig.rpc.vaultTransactionExecute({
      connection,
      feePayer: creator,
      multisigPda,
      transactionIndex: txIndex,
      member: creator.publicKey,
      signers: [creator],
      sendOptions: { skipPreflight: true },
    });
    console.log('vaultTransactionExecute signature:', execSig);
  } catch (e: any) {
    console.log('vaultTransactionExecute failure (likely unfunded vault):', e?.message || e);
  }
}

main().catch((e) => {
  console.error('Squads devnet test error:', e);
  process.exit(1);
});


