# Local Development Setup

## Prerequisites
- Node.js >= 16.0.0
- npm >= 7.0.0
- dfx (DFINITY SDK)

## Setup for Local Development with Remote Services

This setup runs your backend on local replica while using **production Internet Identity** and **production wallets** (OISY/Plug).

### 1. Start Local Replica

```bash
dfx start --clean --background
```

### 2. Deploy Backend to Local

```bash
# Create canister
dfx canister create backend

# Generate declarations
dfx generate backend

# Deploy backend
dfx deploy backend
```

This will:
- Create a local canister (short ID like `bkyz2-fmaaa-aaaaa-qaaaq-cai`)
- Generate TypeScript/JavaScript declarations in `src/declarations/`
- Write canister IDs to `.env` file

### 3. Install Frontend Dependencies

```bash
cd src/frontend
npm install
```

### 4. Start Frontend Development Server

```bash
npm start
```

Frontend will run on http://localhost:3000

## How It Works

### Automatic Environment Detection

The code **automatically detects** whether backend is local or mainnet by checking canister ID pattern:

```javascript
// Local canister IDs are short (< 20 chars) or contain 'aaaaa-aa'
const isLocalBackend = BACKEND_CANISTER_ID.includes('aaaaa-aa') ||
                       BACKEND_CANISTER_ID.length < 20;

// Automatically use correct host
const host = isLocalBackend ? 'http://localhost:4943' : 'https://icp0.io';
```

### What Runs Where

| Component | Location | URL |
|-----------|----------|-----|
| Backend Canister | Local Replica | http://localhost:4943 |
| Frontend Dev Server | Local | http://localhost:3000 |
| Internet Identity | Production | https://id.ai |
| OISY Wallet | Production | https://oisy.com |
| Plug Wallet | Production | https://plugwallet.ooo |
| Token Ledgers (ICP, ckBTC, etc) | Mainnet | https://icp0.io |

### Key Features

✅ **No environment variables needed** - Detection is automatic
✅ **Uses production II** - Login with your real Internet Identity
✅ **Uses production wallets** - Connect real OISY or Plug wallet
✅ **Local backend only** - Your business logic runs locally for fast iteration
✅ **fetchRootKey() auto-called** - Only for local backend, never for mainnet

## Development Workflow

1. **Edit Motoko code** in `src/backend/main.mo`
2. **Redeploy** with `dfx deploy backend`
3. **Frontend hot-reloads** automatically
4. **Test with real wallets** and Internet Identity

## Common Commands

```bash
# Check canister status
dfx canister status backend

# View canister ID
dfx canister id backend

# Check logs
dfx canister logs backend

# Stop replica
dfx stop

# Clean restart
dfx start --clean --background
```

## Troubleshooting

### "Agent not initialized" or "Host not reachable"

Make sure dfx is running:
```bash
dfx start --background
```

### "fetchRootKey error"

This is expected for mainnet services. The code only calls `fetchRootKey()` for local backend.

### Internet Identity login fails

Make sure you're using production II (https://id.ai). If you need local II:
1. Deploy local II: `dfx deploy internet_identity`
2. Set env var: `export USE_LOCAL_II=true`

### Wallet connection fails

OISY and Plug always connect to mainnet ledgers. Make sure you have:
- Real tokens in your wallet
- Network connection to mainnet

## Production Deployment

When deploying to mainnet, **no code changes needed**! The same code automatically detects mainnet canister IDs and uses production hosts.

```bash
# Deploy to mainnet
dfx deploy --network ic backend
dfx deploy --network ic frontend
```

Canister IDs on mainnet are longer (27 chars) like `vtsa7-6qaaa-aaaah-arlkq-cai`, so detection automatically switches to `https://icp0.io`.
