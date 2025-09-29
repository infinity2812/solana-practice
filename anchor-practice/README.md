# anchor-practice

Practice workspace covering common Anchor scenarios.

- Counter: `initialize`, `increment`, `decrement`, `reset` in `programs/anchor-practice/src/lib.rs`.
- PDA state + events: `initialize_profile`, `update_profile`, `close_profile` for `UserProfile` PDA.
- SOL transfer CPI: `transfer_sol` via system program.
- SPL basics: `create_ata`, `mint_to`, `transfer_tokens`, `burn_tokens`.
- SPL advanced: `set_mint_authority_to_pda`, `mint_to_with_pda`, `approve_delegate`, `revoke_delegate`.

See `tests/anchor-practice.ts` for invocation skeletons you can wire to real accounts/mints.

Note: To actually run, start local validator and replace placeholder keys for mint/ATAs.
