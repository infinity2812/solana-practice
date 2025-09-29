import * as anchor from "@coral-xyz/anchor";

export async function getProgram(connection: anchor.web3.Connection) {
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(anchor.web3.Keypair.generate()),
    { preflightCommitment: "confirmed" }
  );
  anchor.setProvider(provider);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const program = (anchor.workspace as any).gm as anchor.Program;
  return { program, provider };
}

export async function greet(connection: anchor.web3.Connection, name: string) {
  const { program } = await getProgram(connection);
  await program.methods.greet(name).rpc();
}


