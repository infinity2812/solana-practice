use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111"); // replace with actual id when keys are generated

#[program]
pub mod gm {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn greet(_ctx: Context<Greet>, name: String) -> Result<()> {
        require!(name.len() <= 32, CustomError::NameTooLong);
        msg!("gm, {}", name);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct Greet {}

#[error_code]
pub enum CustomError {
    #[msg("Provided name is too long")] 
    NameTooLong,
}


