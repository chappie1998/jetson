use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

declare_id!("AqFGP1Fs3nJ3Ue2Nc7RVZ1AUAad5AsEr4VBRJB2mEnk3");

#[program]
pub mod usds_swap {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.treasury_bump = ctx.bumps.treasury;
        config.mint_authority_bump = ctx.bumps.mint_authority;
        config.usds_mint = ctx.accounts.usds_mint.key();
        
        // Store the treasury token account address in the config
        config.treasury_token_account = ctx.accounts.treasury_token_account.key();

        Ok(())
    }

    pub fn swap_usdc_to_usds(ctx: Context<SwapUsdcToUsds>, amount: u64) -> Result<()> {
        // Transfer USDC from user to treasury token account
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.user_usdc.to_account_info(),
                    to: ctx.accounts.treasury_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Mint USDs to user
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.usds_mint.to_account_info(),
                    to: ctx.accounts.user_usds.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                &[&[b"mint-authority", &[ctx.accounts.config.mint_authority_bump]]],
            ),
            amount,
        )?;

        emit!(SwapEvent {
            user: ctx.accounts.user.key(),
            amount,
            swap_direction: SwapDirection::UsdcToUsds,
        });

        Ok(())
    }

    pub fn swap_usds_to_usdc(ctx: Context<SwapUsdsToUsdc>, amount: u64) -> Result<()> {
        // Burn USDs from user
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Burn {
                    mint: ctx.accounts.usds_mint.to_account_info(),
                    from: ctx.accounts.user_usds.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Transfer USDC from treasury to user
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.treasury_token_account.to_account_info(),
                    to: ctx.accounts.user_usdc.to_account_info(),
                    authority: ctx.accounts.treasury.to_account_info(),
                },
                &[&[b"treasury", &[ctx.accounts.config.treasury_bump]]],
            ),
            amount,
        )?;

        emit!(SwapEvent {
            user: ctx.accounts.user.key(),
            amount,
            swap_direction: SwapDirection::UsdsToUsdc,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + Config::LEN
    )]
    pub config: Account<'info, Config>,

    #[account(
        seeds = [b"treasury"],
        bump,
    )]
    /// CHECK: This is a PDA that will be the authority for the treasury token account
    pub treasury: UncheckedAccount<'info>,

    /// The token account that will hold USDC, owned by the treasury PDA
    pub treasury_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"mint-authority"],
        bump,
    )]
    /// CHECK: This is a PDA that will have authority to mint USDs
    pub mint_authority: UncheckedAccount<'info>,

    pub usds_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SwapUsdcToUsds<'info> {
    pub user: Signer<'info>,

    pub config: Account<'info, Config>,

    #[account(
        mut,
        constraint = user_usdc.owner == user.key()
    )]
    pub user_usdc: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_usds.owner == user.key()
    )]
    pub user_usds: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"treasury"],
        bump = config.treasury_bump,
    )]
    /// CHECK: This is the PDA that serves as the treasury authority
    pub treasury: UncheckedAccount<'info>,

    #[account(
        mut,
        // Require this to be the same token account stored during initialization
        address = config.treasury_token_account
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"mint-authority"],
        bump = config.mint_authority_bump,
    )]
    /// CHECK: This is a PDA that has authority to mint USDs
    pub mint_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        address = config.usds_mint
    )]
    pub usds_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SwapUsdsToUsdc<'info> {
    pub user: Signer<'info>,

    pub config: Account<'info, Config>,

    #[account(
        mut,
        constraint = user_usdc.owner == user.key()
    )]
    pub user_usdc: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_usds.owner == user.key()
    )]
    pub user_usds: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"treasury"],
        bump = config.treasury_bump,
    )]
    /// CHECK: This is the PDA that serves as the treasury authority
    pub treasury: UncheckedAccount<'info>,

    #[account(
        mut,
        // Require this to be the same token account stored during initialization
        address = config.treasury_token_account
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        address = config.usds_mint
    )]
    pub usds_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Config {
    pub treasury_bump: u8,
    pub mint_authority_bump: u8,
    pub usds_mint: Pubkey,
    pub treasury_token_account: Pubkey,  // Added field to store the treasury token account
}

impl Config {
    pub const LEN: usize = 1 + 1 + 32 + 32;  // Added 32 bytes for the treasury_token_account
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum SwapDirection {
    UsdcToUsds,
    UsdsToUsdc,
}

#[event]
pub struct SwapEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub swap_direction: SwapDirection,
}