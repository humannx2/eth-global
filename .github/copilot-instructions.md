# FitStake Copilot Instructions

## Project Overview
FitStake is a Web3 fitness competition platform combining AI pose verification with on-chain staking. The monorepo uses PNPM workspaces with two main packages: `blockchain` (Hardhat 3 Beta + Solidity) and `web` (Next.js 15 + TypeScript).

## Architecture
- **Blockchain**: Hardhat 3 Beta with viem integration, Solidity contracts on Sepolia/Polygon
- **Web**: Next.js 15 App Router, TurbosPack, shadcn/ui components, Wagmi v2 + viem
- **Verification Flow**: MediaPipe pose detection → device signing → AI agent verification → IPFS storage → on-chain finalization

## Development Standards

### Package Management
- **Always use `pnpm`** for all operations (install, dev, build, test)
- Root has workspace config: `pnpm-workspace.yaml` defines `blockchain` and `web` packages
- Run commands from workspace root: `pnpm -F web dev` or `pnpm -F blockchain test`

### Web Development (Next.js)
- **Use shadcn/ui components exclusively** - no custom UI components
- Components configured in `web/components.json` with "new-york" style and neutral base color
- **CSS Variables**: Use standard Tailwind CSS variables, avoid custom color definitions
- TypeScript: Strict typing with viem types, no `any` types
- Wagmi config in `src/lib/wagmi.ts` supports mainnet, sepolia, hardhat chains
- Auto-generated contract types via `@wagmi/cli` in `src/lib/wagmi-generated.ts`

### Blockchain Development (Hardhat 3 Beta)
- Uses Hardhat 3 Beta with `@nomicfoundation/hardhat-toolbox-viem` plugin
- **Testing**: Mix of Foundry-compatible Solidity tests and Node.js `node:test` with viem
- **Deployment**: Ignition modules in `ignition/modules/` for reproducible deploys
- Contract generation: `@wagmi/cli` reads from `../blockchain` to generate web types

### Data Handling
- **Avoid mock data** - integrate with real contracts and IPFS when possible
- Use viem's typed contract interactions over raw RPC calls
- Session data should follow the pose verification → agent review → IPFS CID pattern

## Key Commands

### Development
```bash
# Start web dev server with TurbosPack
pnpm -F web dev

# Deploy contracts to local/sepolia
pnpm -F blockchain hardhat ignition deploy ignition/modules/Counter.ts
pnpm -F blockchain hardhat ignition deploy ignition/modules/Counter.ts --network sepolia

# Run all tests
pnpm -F blockchain test
```

### Contract Integration
```bash
# Generate typed contract hooks after contract changes
pnpm -F web wagmi generate
```

## File Patterns

### Smart Contracts
- Contracts: `blockchain/contracts/*.sol`
- Tests: `blockchain/test/*.ts` (viem + node:test) or `blockchain/contracts/*.t.sol` (Foundry)
- Ignition modules: `blockchain/ignition/modules/*.ts`

### Web Components
- Pages: `web/src/app/**/page.tsx` (App Router)
- Components: `web/src/components/*.tsx` (use shadcn/ui)
- Web3 logic: `web/src/lib/wagmi.ts` and `web/src/lib/wagmi-generated.ts`

### Configuration
- Network config: `blockchain/hardhat.config.ts` (uses configVariable for secrets)
- Wagmi config: `web/wagmi.config.ts` (points to ../blockchain for contract ABI)
- shadcn config: `web/components.json` (new-york style, neutral colors, CSS vars)

## Integration Points
- **Contract ABI sync**: Changes to `blockchain/contracts/` auto-generate types in `web/src/lib/wagmi-generated.ts`
- **IPFS integration**: AI agent verification traces stored with CID references in contracts
- **Device signatures**: Ephemeral keys sign pose session JSON before on-chain submission
- **Multi-chain**: Support for Sepolia (testnet) and local Hardhat network simulation

## Anti-Patterns
- Don't create custom color schemes - use Tailwind's standard CSS variables
- Avoid raw web3 calls - use typed wagmi hooks and viem
- Don't mock fitness data - integrate with MediaPipe pose detection where possible
- Avoid npm/yarn commands - use pnpm exclusively