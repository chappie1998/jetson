# USDS-SWAP Program Deployment Instructions

This document provides instructions for building and deploying the updated USDS-SWAP Solana program.

## Changes Made

We've fixed the program to handle uninitialized PDAs by switching from `AccountInfo` to `UncheckedAccount` in the account validation structures:

1. In `Initialize` struct:
   - Changed `treasury_authority` and `mint_authority` to use `UncheckedAccount`

2. In `SwapUsdcToUsds` and `SwapUsdsToUsdc` structs:
   - Changed `treasury_authority` and `mint_authority` to use `UncheckedAccount`

This ensures that the program doesn't require the PDA accounts to be initialized, which was causing the "AccountNotInitialized" error.

## Building the Program

To build the program, run the following commands:

```bash
# Navigate to the project directory
cd /path/to/usds-swap

# Build the program using Anchor
anchor build
```

This will compile the Rust program and generate the necessary artifacts in the `target` directory.

## Updating the IDL

After building, you need to update the IDL:

```bash
# Fetch the IDL from the build directory
cp target/idl/usds_swap.json ./idl.json
```

## Deploying the Program

To deploy the updated program to the Solana devnet:

```bash
# Deploy using Anchor
anchor deploy --provider.cluster devnet
```

If you're using a custom program ID (as specified in the `declare_id!` macro), make sure to use the same program ID during deployment:

```bash
anchor deploy --provider.cluster devnet --program-id AqFGP1Fs3nJ3Ue2Nc7RVZ1AUAad5AsEr4VBRJB2mEnk3
```

## Testing After Deployment

After deploying, you can use the existing client scripts to test the functionality:

1. First, check the balances:
```bash
npx ts-node app/swap-fixed.ts balances
```

2. Swap USDC to USDS:
```bash
npx ts-node app/swap-fixed.ts swap-usdc-to-usds 1000000
```

3. Swap USDS to USDC:
```bash
npx ts-node app/swap-fixed.ts swap-usds-to-usdc 1000000
```

## Key Concepts

1. The program uses two PDAs:
   - `treasury_authority` - Controls the treasury token account
   - `mint_authority` - Has authority to mint USDs

2. Token accounts are now managed using Associated Token Accounts:
   - The treasury token account is an associated token account with the treasury PDA as authority

3. Swap operations:
   - `swap_usdc_to_usds` - Transfers USDC from user to treasury and mints USDs to user
   - `swap_usds_to_usdc` - Burns USDs from user and transfers USDC from treasury to user

## Common Issues

1. If you see an "AccountNotInitialized" error, ensure that:
   - The program is using `UncheckedAccount` for PDAs (which is now fixed)
   - You're passing the correct accounts in the correct order in client calls

2. If you see a "ConstraintSeeds" error, ensure that:
   - You're passing the correct PDA address calculated with the same seeds and program ID
   - The client is using the same treasury PDA as the program expects

Good luck with the deployment! 