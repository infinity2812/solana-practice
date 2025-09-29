import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";

describe("anchor-practice", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.anchorPractice as Program;

  it("initializes and updates counter", async () => {
    const provider = anchor.getProvider();
    const user = (provider as anchor.AnchorProvider).wallet as anchor.Wallet;

    const counterKeypair = anchor.web3.Keypair.generate();

    await program.methods
      .initialize()
      .accounts({
        counter: counterKeypair.publicKey,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([counterKeypair])
      .rpc();

    // Fetch the created account
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let counter = await (program.account as any).counter.fetch(counterKeypair.publicKey);
    console.log("count after init:", counter.count.toString());

    // increment
    await program.methods
      .increment()
      .accounts({ counter: counterKeypair.publicKey, user: user.publicKey })
      .rpc();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    counter = await (program.account as any).counter.fetch(counterKeypair.publicKey);
    console.log("count after inc:", counter.count.toString());

    // reset
    await program.methods
      .reset()
      .accounts({ counter: counterKeypair.publicKey, user: user.publicKey })
      .rpc();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    counter = await (program.account as any).counter.fetch(counterKeypair.publicKey);
    console.log("count after reset:", counter.count.toString());
  });

  it("creates a user profile PDA and updates it", async () => {
    const provider = anchor.getProvider() as anchor.AnchorProvider;
    const user = provider.wallet as anchor.Wallet;

    await program.methods
      .initializeProfile("shrey")
      .accounts({
        userProfile: anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("user_profile"), user.publicKey.toBuffer()],
          program.programId
        )[0],
        authority: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .updateProfile(null, new anchor.BN(5))
      .accounts({
        userProfile: anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("user_profile"), user.publicKey.toBuffer()],
          program.programId
        )[0],
        authority: user.publicKey,
      })
      .rpc();
  });

  it("transfers SOL via system program CPI", async () => {
    const provider = anchor.getProvider() as anchor.AnchorProvider;
    const from = (provider.wallet as anchor.Wallet).publicKey;
    const toKeypair = anchor.web3.Keypair.generate();

    await program.methods
      .transferSol(new anchor.BN(1000))
      .accounts({
        from,
        to: toKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  });

  it("mints with PDA authority and uses approve/revoke", async () => {
    const provider = anchor.getProvider() as anchor.AnchorProvider;
    const wallet = provider.wallet as anchor.Wallet;

    // placeholders — replace with created mint and accounts when running for real
    const mint = anchor.web3.Keypair.generate().publicKey;
    const userAta = anchor.web3.Keypair.generate().publicKey;
    const delegate = anchor.web3.Keypair.generate().publicKey;

    const [pdaAuthority, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("mint_authority"), mint.toBuffer()],
      program.programId
    );

    await program.methods
      .setMintAuthorityToPda()
      .accounts({
        mint,
        currentAuthority: wallet.publicKey,
        pdaAuthority,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    await program.methods
      .mintToWithPda(new anchor.BN(10))
      .accounts({
        mint,
        to: userAta,
        pdaAuthority,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    await program.methods
      .approveDelegate(new anchor.BN(5))
      .accounts({
        source: userAta,
        delegate,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        authority: wallet.publicKey,
      })
      .rpc();

    await program.methods
      .revokeDelegate()
      .accounts({
        source: userAta,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        authority: wallet.publicKey,
      })
      .rpc();
  });
});
