use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("EQfYTxFVJT4B1Chm4wVZ8PsjQH3ZuahvW985YgVoXJfR");

const TAX_RATE: u64 = 5; // 5% tax
const TAX_DIVISOR: u64 = 100;

#[program]
pub mod alpha_token {
    use super::*;

    /// Initialize the token with tax configuration
    pub fn initialize(ctx: Context<Initialize>, tax_wallet: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.tax_wallet = tax_wallet;
        config.authority = ctx.accounts.authority.key();
        config.is_renounced = false;
        Ok(())
    }

    /// Transfer tokens with 5% tax
    pub fn transfer_with_tax(ctx: Context<TransferWithTax>, amount: u64) -> Result<()> {
        let config = &ctx.accounts.config;
        require!(!config.is_renounced, ErrorCode::ContractRenounced);

        let tax_amount = (amount * TAX_RATE) / TAX_DIVISOR;
        let transfer_amount = amount.checked_sub(tax_amount).ok_or(ErrorCode::MathOverflow)?;

        // Transfer tax to tax wallet
        if tax_amount > 0 {
            let cpi_accounts = Transfer {
                from: ctx.accounts.from.to_account_info(),
                to: ctx.accounts.tax_wallet.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            token::transfer(cpi_ctx, tax_amount)?;
        }

        // Transfer remaining amount to recipient
        if transfer_amount > 0 {
            let cpi_accounts = Transfer {
                from: ctx.accounts.from.to_account_info(),
                to: ctx.accounts.to.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            token::transfer(cpi_ctx, transfer_amount)?;
        }

        Ok(())
    }

    /// Renounce contract ownership (disable future changes)
    pub fn renounce_ownership(ctx: Context<RenounceOwnership>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        require!(
            ctx.accounts.authority.key() == config.authority,
            ErrorCode::Unauthorized
        );
        config.is_renounced = true;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Config::LEN,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferWithTax<'info> {
    #[account(
        seeds = [b"config"],
        bump,
        has_one = tax_wallet @ ErrorCode::InvalidTaxWallet
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    #[account(mut)]
    pub tax_wallet: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RenounceOwnership<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    pub authority: Signer<'info>,
}

#[account]
pub struct Config {
    pub tax_wallet: Pubkey,
    pub authority: Pubkey,
    pub is_renounced: bool,
}

impl Config {
    pub const LEN: usize = 32 + 32 + 1; // tax_wallet + authority + is_renounced
}

#[error_code]
pub enum ErrorCode {
    #[msg("Contract has been renounced")]
    ContractRenounced,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid tax wallet")]
    InvalidTaxWallet,
    #[msg("Math overflow")]
    MathOverflow,
}

