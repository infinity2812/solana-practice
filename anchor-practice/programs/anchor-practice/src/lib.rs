use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token::{self, spl_token::instruction::AuthorityType, Burn as _, Mint, Token, TokenAccount},
};

declare_id!("4fWUWLGQh5fR1gX2pr7NBBndtzRZZchGP7XGsWHvcXVL");

#[program]
pub mod anchor_practice {
    use super::*;

    // Initialize a new Counter account with count = 0
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let counter: &mut Account<Counter> = &mut ctx.accounts.counter;
        counter.count = 0;
        Ok(())
    }

    // Increments the counter by 1
    pub fn increment(ctx: Context<UpdateCounter>) -> Result<()> {
        let counter: &mut Account<Counter> = &mut ctx.accounts.counter;
        counter.count = counter.count.saturating_add(1);
        Ok(())
    }

    // Decrements the counter by 1 (floors at 0)
    pub fn decrement(ctx: Context<UpdateCounter>) -> Result<()> {
        let counter: &mut Account<Counter> = &mut ctx.accounts.counter;
        counter.count = counter.count.saturating_sub(1);
        Ok(())
    }

    // Resets the counter to 0
    pub fn reset(ctx: Context<UpdateCounter>) -> Result<()> {
        let counter: &mut Account<Counter> = &mut ctx.accounts.counter;
        counter.count = 0;
        Ok(())
    }

    // -----------------------------
    // SPL Token Helpers
    // -----------------------------

    // Create an Associated Token Account (ATA) for `owner` and `mint`
    pub fn create_ata(ctx: Context<CreateAta>) -> Result<()> {
        let cpi_accounts = associated_token::Create {
            payer: ctx.accounts.payer.to_account_info(),
            associated_token: ctx.accounts.ata.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            associated_token_program: ctx
                .accounts
                .associated_token_program
                .to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts
                .associated_token_program
                .to_account_info(),
            cpi_accounts,
        );
        associated_token::create(cpi_ctx)
    }

    // Mint `amount` tokens to `to` account, with `authority` as the mint authority
    pub fn mint_to(ctx: Context<MintToCtx>, amount: u64) -> Result<()> {
        let cpi_accounts = token::MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::mint_to(cpi_ctx, amount)
    }

    // Transfer `amount` tokens from `from` to `to`, signed by `authority`
    pub fn transfer_tokens(ctx: Context<TransferTokensCtx>, amount: u64) -> Result<()> {
        let cpi_accounts = token::Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)
    }

    // Burn `amount` tokens from `from` account, signed by `authority`
    pub fn burn_tokens(ctx: Context<BurnTokensCtx>, amount: u64) -> Result<()> {
        let cpi_accounts = token::Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.from.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::burn(cpi_ctx, amount)
    }

    // -----------------------------
    // SOL Transfer via System Program CPI
    // -----------------------------
    pub fn transfer_sol(ctx: Context<TransferSol>, lamports: u64) -> Result<()> {
        let cpi_accounts = system_program::Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.system_program.to_account_info(), cpi_accounts);
        system_program::transfer(cpi_ctx, lamports)
    }

    // -----------------------------
    // PDA-backed State with Events
    // -----------------------------
    pub fn initialize_profile(ctx: Context<InitializeProfile>, nickname: String) -> Result<()> {
        require!(nickname.as_bytes().len() <= 32, PracticeError::NameTooLong);
        let profile = &mut ctx.accounts.user_profile;
        profile.authority = ctx.accounts.authority.key();
        profile.nickname = nickname.clone();
        profile.score = 0;
        emit!(ProfileUpdated {
            authority: profile.authority,
            nickname,
            score: profile.score,
        });
        Ok(())
    }

    pub fn update_profile(
        ctx: Context<UpdateProfile>,
        nickname: Option<String>,
        delta_score: i64,
    ) -> Result<()> {
        let profile = &mut ctx.accounts.user_profile;
        require_keys_eq!(profile.authority, ctx.accounts.authority.key(), PracticeError::Unauthorized);

        if let Some(name) = nickname {
            require!(name.as_bytes().len() <= 32, PracticeError::NameTooLong);
            profile.nickname = name;
        }

        if delta_score >= 0 {
            profile.score = profile
                .score
                .saturating_add(delta_score as u64);
        } else {
            let abs = (-delta_score) as u64;
            profile.score = profile.score.saturating_sub(abs);
        }

        emit!(ProfileUpdated {
            authority: profile.authority,
            nickname: profile.nickname.clone(),
            score: profile.score,
        });
        Ok(())
    }

    pub fn close_profile(_ctx: Context<CloseProfile>) -> Result<()> {
        // Account is closed by attribute; no-op body
        Ok(())
    }

    // -----------------------------
    // PDA signer for Mint Authority flows
    // -----------------------------
    // Set a Mint's mint authority to a PDA
    pub fn set_mint_authority_to_pda(ctx: Context<SetMintAuthToPda>) -> Result<()> {
        let cpi_accounts = token::SetAuthority {
            current_authority: ctx.accounts.current_authority.to_account_info(),
            account_or_mint: ctx.accounts.mint.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::set_authority(
            cpi_ctx,
            AuthorityType::MintTokens,
            Some(ctx.accounts.pda_authority.key()),
        )
    }

    // Mint using PDA as signer
    pub fn mint_to_with_pda(ctx: Context<MintToWithPda>, amount: u64) -> Result<()> {
        let seeds: &[&[u8]] = &[b"mint_authority", ctx.accounts.mint.key().as_ref(), &[ctx.bumps.pda_authority]];
        let signer = &[seeds];
        let cpi_accounts = token::MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.pda_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer,
        );
        token::mint_to(cpi_ctx, amount)
    }

    // Approve a delegate to spend from a token account
    pub fn approve_delegate(ctx: Context<ApproveDelegate>, amount: u64) -> Result<()> {
        let cpi_accounts = token::Approve {
            to: ctx.accounts.source.to_account_info(),
            delegate: ctx.accounts.delegate.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::approve(cpi_ctx, amount)
    }

    // Revoke any delegate on a token account
    pub fn revoke_delegate(ctx: Context<RevokeDelegate>) -> Result<()> {
        let cpi_accounts = token::Revoke {
            source: ctx.accounts.source.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::revoke(cpi_ctx)
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 8)]
    pub counter: Account<'info, Counter>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateCounter<'info> {
    #[account(mut)]
    pub counter: Account<'info, Counter>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[account]
pub struct Counter {
    pub count: u64,
}

// -----------------------------
// SOL Transfer
// -----------------------------
#[derive(Accounts)]
pub struct TransferSol<'info> {
    #[account(mut)]
    pub from: Signer<'info>,
    /// CHECK: any system account
    #[account(mut)]
    pub to: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

// -----------------------------
// PDA-backed User Profile
// -----------------------------
#[account]
pub struct UserProfile {
    pub authority: Pubkey,
    pub nickname: String, // max 32 bytes
    pub score: u64,
}

#[derive(Accounts)]
pub struct InitializeProfile<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 4 + 32 + 8, // discriminator + pubkey + string(4+32) + u64
        seeds = [b"user_profile", authority.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateProfile<'info> {
    #[account(
        mut,
        seeds = [b"user_profile", authority.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseProfile<'info> {
    #[account(
        mut,
        close = authority,
        seeds = [b"user_profile", authority.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

// Event emitted on profile updates
#[event]
pub struct ProfileUpdated {
    pub authority: Pubkey,
    pub nickname: String,
    pub score: u64,
}

// -----------------------------
// PDA signer for mint authority flows
// -----------------------------
#[derive(Accounts)]
pub struct SetMintAuthToPda<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub current_authority: Signer<'info>,
    /// CHECK: PDA derived as seeds ["mint_authority", mint]
    #[account(seeds = [b"mint_authority", mint.key().as_ref()], bump)]
    pub pda_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct MintToWithPda<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    /// CHECK: PDA derived as seeds ["mint_authority", mint]
    #[account(seeds = [b"mint_authority", mint.key().as_ref()], bump)]
    pub pda_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

// Approve/Revoke
#[derive(Accounts)]
pub struct ApproveDelegate<'info> {
    #[account(mut)]
    pub source: Account<'info, TokenAccount>,
    /// CHECK: delegate can be any account
    pub delegate: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct RevokeDelegate<'info> {
    #[account(mut)]
    pub source: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub authority: Signer<'info>,
}

// -----------------------------
// Errors
// -----------------------------
#[error_code]
pub enum PracticeError {
    #[msg("Provided name is too long")] 
    NameTooLong,
    #[msg("Unauthorized")] 
    Unauthorized,
}

// -----------------------------
// SPL Token Accounts
// -----------------------------

#[derive(Accounts)]
pub struct CreateAta<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: created via the associated token program
    #[account(mut)]
    pub ata: UncheckedAccount<'info>,
    /// CHECK: owner can be any address
    pub owner: UncheckedAccount<'info>,
    pub mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct MintToCtx<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct TransferTokensCtx<'info> {
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct BurnTokensCtx<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub authority: Signer<'info>,
}
