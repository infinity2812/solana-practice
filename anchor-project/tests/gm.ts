import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";

describe("anchor-project gm", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  it("greets with gm", async () => {
    // types come from generated IDL after build; keeping generic Program type here
    const program = anchor.workspace.gm as Program;
    await program.methods.greet("Shreyansh").rpc();
  });
});


