# Tipio - Privacy-First Tipping Platform on Internet Computer

<div align="center">

  **A decentralized, privacy-preserving tipping platform built on the Internet Computer Protocol (ICP)**

  [Live App](https://tipio.io) • [Documentation](#local-development)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [ICP Features Used](#icp-features-used)
- [Local Development](#local-development)
- [Build & Deployment](#build--deployment)
- [Mainnet Canisters](#mainnet-canisters)
- [Code Structure](#code-structure)
- [Security Considerations](#security-considerations)
- [Future Roadmap](#future-roadmap)

---

## 🎯 Overview

**Tipio** is a revolutionary tipping platform that prioritizes user privacy while enabling seamless cryptocurrency transactions. Built entirely on the Internet Computer blockchain, Tipio allows content creators, service providers, and individuals to receive tips without compromising their identity or transaction history.

### The Problem
Traditional tipping platforms and payment processors:
- Require extensive KYC/identity verification
- Expose transaction histories publicly
- Charge high processing fees (3-5%)
- Create data honeypots vulnerable to breaches
- Don't support cryptocurrency natively

### Our Solution
Tipio leverages Internet Computer's unique features to provide:
- **True Privacy**: No KYC required, anonymous tipping via Internet Identity
- **Multi-Token Support**: Accept tips in ICP, ckBTC, ckETH, and other ICRC-1 tokens
- **Zero-Knowledge Transactions**: Optional privacy-preserving transaction metadata
- **Low Fees**: Minimal transaction costs powered by ICP's efficient architecture
- **Chain Fusion**: Seamless integration with Bitcoin and Ethereum ecosystems

---

## ✨ Key Features

### 1. **Privacy-First Design**
- **Anonymous Tipping**: Send and receive tips without revealing identity
- **Internet Identity Integration**: Secure authentication without passwords
- **Wallet Integration**: Support for OISY Wallet and Plug Wallet via ICRC-21 consent messages
- **Private Transaction History**: Optional encrypted transaction metadata
- **No Data Collection**: Zero user data stored beyond what's necessary for functionality

### 2. **Multi-Token Support**
- **Native ICP**: Fast and low-cost transactions
- **ckBTC**: Bitcoin-backed tokens via Chain Fusion
- **ckETH**: Ethereum-backed tokens via Chain Fusion
- **ICRC-1 Tokens**: Support for any ICRC-1 compliant token
- **Token Logo Display**: Visual token identification with custom logos
- **Extensible Token System**: Easy addition of new ICRC-1 tokens

### 3. **User Tier System**
- **Free Tier**: 3 withdrawals per day to get started
- **Premium Tier**: Unlimited withdrawals for power users
- **Daily Reset**: Withdrawal limits reset automatically every 24 hours
- **Upgrade Path**: Easy upgrade from Free to Premium tier

### 4. **Flexible Fee System**
- **Creator-Defined Fees**: Set custom fee percentages (0-100%)
- **Platform Fee**: Sustainable 2% platform fee for maintenance
- **Transparent Fee Display**: Clear breakdown before transaction confirmation
- **Fee Analytics**: Track total fees collected and paid

### 5. **User-Friendly Experience**
- **QR Code Integration**: Easy mobile tipping via QR codes
- **Shareable Tip Links**: One-click tip pages with custom URLs
- **Customizable Profiles**: Personalize with emoji avatars and background colors
- **Activity Tracking**: Real-time activity feed for all transactions
- **Link Management**: Create and manage multiple tip links
- **Multi-Wallet Support**: Seamless integration with OISY and Plug wallets

### 6. **Dashboard & Analytics**
- **Earnings Overview**: Track total earnings by token with visual charts
- **Transaction History**: Detailed transaction logs with filtering and search
- **Analytics Dashboard**: Comprehensive analytics with graphs and insights
- **Withdrawal Management**: Easy withdrawal to external wallets with history tracking
- **Activity Feed**: Real-time updates on tips received and sent
- **Dark/Light Mode**: Customizable UI theme for comfort

### 7. **Advanced Features**
- **Subaccount System**: Isolated balances for each user for better security
- **Settings Panel**: Customize profile, fees, and preferences
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **ICRC-21 Standard**: Wallet consent messages for enhanced security

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Homepage   │  │   Dashboard  │  │   Tip Page   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Internet Identity (Auth)                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Canister (Motoko)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ User Manager │  │Token Manager │  │Fee Calculator│       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Tip Logic  │  │  Withdrawal  │  │   Storage    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              ICRC-1 Token Ledgers (ICP, ckBTC, etc.)        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Chain Fusion (Bitcoin, Ethereum)               │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Authentication**: Internet Identity provides secure, anonymous authentication
2. **Profile Creation**: Users create profiles stored in the backend canister
3. **Token Selection**: Dynamic token list fetched from ICRC-1 ledgers
4. **Tip Transaction**:
   - Frontend validates input
   - Backend calculates fees (creator fee + platform fee)
   - ICRC-1 transfer initiated
   - Transaction recorded in user history
5. **Withdrawal**: Users can withdraw accumulated tips to external wallets

### Canister Structure

```
src/
├── backend/
│   └── main.mo                 # Main canister (all logic in single file)
│       ├── Type definitions (User, Tip, Token, etc.)
│       ├── User management & authentication
│       ├── Tip creation & processing
│       ├── ICRC-1 token operations
│       ├── Fee calculation system
│       ├── Withdrawal logic with tier limits
│       └── ICRC-21 consent messages
└── frontend/
    ├── src/
    │   ├── components/         # Reusable React components
    │   │   ├── TokenLogo.jsx   # Token logo display
    │   │   ├── TokenSelector.jsx
    │   │   ├── Sidebar.jsx
    │   │   ├── ThemeToggle.jsx
    │   │   └── WalletSelectionModal.jsx
    │   ├── pages/              # Page components
    │   │   ├── Home.jsx        # Landing page
    │   │   ├── Register.jsx    # User registration
    │   │   ├── Dashboard.jsx   # Main dashboard
    │   │   ├── Analytics.jsx   # Analytics & charts
    │   │   ├── Activity.jsx    # Activity feed
    │   │   ├── TipPage.jsx     # Public tip page
    │   │   ├── Links.jsx       # Link management
    │   │   └── Settings.jsx    # User settings
    │   ├── contexts/           # React contexts
    │   │   └── AuthContext.jsx # Authentication state
    │   ├── lib/                # Utilities & hooks
    │   └── declarations/       # Auto-generated canister declarations
    └── public/                 # Static assets
        └── ecosystem/          # Partner logos (ICP, OISY, Plug, Chain Fusion)
```

---

## 🚀 ICP Features Used

### 1. **Internet Identity**
- Decentralized authentication without passwords
- Privacy-preserving user identification
- Seamless cross-device authentication
- No centralized identity provider

**Implementation**:
```javascript
// Frontend integration
import { AuthClient } from "@dfinity/auth-client";

const authClient = await AuthClient.create();
await authClient.login({
  identityProvider: "https://id.ai",
  onSuccess: () => {
    // User authenticated
  }
});
```

### 2. **ICRC-1 Token Standard**
- Standardized token interface for multi-token support
- Interoperability across ICP ecosystem
- Efficient token transfers with low fees

**Implementation**:
```motoko
// Backend ICRC-1 integration
let ledger = actor (ledgerCanisterId) : ICRC1.Actor;
let result = await ledger.icrc1_transfer({
  to = recipient;
  amount = amount;
  fee = ?tokenFee;
  memo = ?memo;
  from_subaccount = null;
  created_at_time = null;
});
```

### 3. **Chain Fusion**
- Support for ckBTC (Bitcoin-backed tokens)
- Support for ckETH (Ethereum-backed tokens)
- Cross-chain interoperability
- Threshold ECDSA signatures for Bitcoin integration

**Benefits**:
- Users can tip with Bitcoin without leaving ICP
- Lower fees compared to native Bitcoin transactions
- Faster confirmation times
- Unified multi-chain experience

### 4. **Stable Memory**
- Persistent data storage across canister upgrades
- Efficient memory management for user data
- Transaction history preservation

**Implementation**:
```motoko
stable var users : [(Principal, User)] = [];
stable var transactions : [(Text, Transaction)] = [];

system func preupgrade() {
  // Preserve state before upgrade
};

system func postupgrade() {
  // Restore state after upgrade
};
```

### 5. **ICRC-1 Metadata Queries**
- Fetch token metadata from ICRC-1 ledgers
- Retrieve token symbols, names, and decimals
- Dynamic token logo URLs via metadata standards

**Implementation**:
```javascript
// Frontend fetches metadata from ICRC-1 ledger canister
const ledger = Actor.createActor(icrc1IDL, {
  agent,
  canisterId: tokenLedgerId,
});

const metadata = await ledger.icrc1_metadata();
const symbol = await ledger.icrc1_symbol();
const decimals = await ledger.icrc1_decimals();
```

### 6. **Composite Queries**
- Fast, efficient data retrieval
- Reduced latency for dashboard queries
- Improved user experience

---

## 💻 Local Development

### Prerequisites

- **Node.js** (v16 or higher)
- **DFX** (Internet Computer SDK) v0.16.0+
- **npm** or **yarn**

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/fxjrin/tipio.git
cd tipio
```

2. **Install dependencies**
```bash
npm install
```

3. **Start local Internet Computer replica**
```bash
dfx start --background --clean
```

4. **Deploy canisters locally**
```bash
dfx deploy
```

This will deploy:
- Backend canister (Motoko)
- Frontend canister (Asset canister)
- Internet Identity (for local authentication)

5. **Start the development server**
```bash
npm start
```

The application will be available at `http://localhost:8080`

### Development Commands

```bash
# Generate Candid interface
npm run generate

# Deploy backend only
dfx deploy backend

# Deploy frontend only
dfx deploy frontend

# Check canister IDs
dfx canister id backend
dfx canister id frontend

# View canister logs
dfx canister logs backend

# Stop local replica
dfx stop
```

### Environment Variables

Create a `.env` file in the root directory:

```env
DFX_NETWORK=local
CANISTER_ID_BACKEND=<your-backend-canister-id>
CANISTER_ID_FRONTEND=<your-frontend-canister-id>
```

For local development, these are auto-generated in `canister_ids.json`

---

## 🔨 Build & Deployment

### Building for Production

```bash
# Build optimized frontend
npm run build

# Build and deploy to mainnet
dfx deploy --network ic
```

### Deploying to Internet Computer Mainnet

1. **Create a cycles wallet** (if you don't have one)
```bash
dfx identity get-wallet --network ic
```

2. **Add cycles to your wallet**
   - Purchase ICP tokens
   - Convert to cycles via NNS dapp

3. **Deploy canisters**
```bash
# Deploy with specified cycles
dfx deploy --network ic --with-cycles 1000000000000

# Or deploy individual canisters
dfx deploy backend --network ic
dfx deploy frontend --network ic
```

4. **Verify deployment**
```bash
dfx canister --network ic id backend
dfx canister --network ic id frontend
```

### Post-Deployment Configuration

1. **Initialize token list**
```bash
dfx canister --network ic call backend initializeDefaultTokens
```

2. **Set platform fee (if needed)**
```bash
dfx canister --network ic call backend setPlatformFee '(50)' # 0.5%
```

3. **Verify canister status**
```bash
dfx canister --network ic status backend
```

---

## 🌐 Mainnet Canisters

### Production Canisters

| Canister | Canister ID | URL |
|----------|-------------|-----|
| Backend  | `vtsa7-6qaaa-aaaah-arlkq-cai` | [Candid UI](https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=vtsa7-6qaaa-aaaah-arlkq-cai) |
| Frontend | `v2rld-iyaaa-aaaah-arlla-cai` | [https://v2rld-iyaaa-aaaah-arlla-cai.icp0.io](https://v2rld-iyaaa-aaaah-arlla-cai.icp0.io) |

### Live Application

🔗 **[https://tipio.io](https://tipio.io)** - Custom domain pointing to frontend canister

### Canister Information

**Backend Canister**
- **Canister ID**: `vtsa7-6qaaa-aaaah-arlkq-cai`
- **Language**: Motoko
- **Memory**: Stable memory for persistent storage
- **Network**: Internet Computer Mainnet

**Frontend Canister**
- **Canister ID**: `v2rld-iyaaa-aaaah-arlla-cai`
- **Type**: Asset canister
- **Framework**: React + Vite
- **CDN**: Served via ICP's CDN
- **Domains**:
  - https://v2rld-iyaaa-aaaah-arlla-cai.icp0.io
  - https://tipio.io (custom domain)

### Upgrade Process

```bash
# Build new version
dfx build --network ic

# Upgrade backend (preserves stable memory)
dfx canister --network ic install backend --mode upgrade

# Upgrade frontend
dfx canister --network ic install frontend --mode upgrade
```

---

---

## 📚 Code Structure

### Backend (Motoko)

```
src/backend/
└── main.mo                    # Main canister (single file)
    ├── Type definitions (User, Transaction, Token, etc.)
    ├── Stable variables for data persistence
    ├── User management functions
    ├── Tip processing logic
    ├── Token operations (ICRC-1 integration)
    ├── Fee calculation system
    ├── Transaction history tracking
    └── Query/update methods
```

**Key Backend Functions**:

```motoko
// User Management
public shared(msg) func registerUser(username: Text, displayName: Text) : async Result.Result<User, Text>
public query func getUser(principal: Principal) : async ?User
public query func getUserByUsername(username: Text) : async ?User

// Tipping
public shared(msg) func sendTip(
  recipientUsername: Text,
  tokenLedgerId: Text,
  amount: Nat,
  message: ?Text
) : async Result.Result<(), Text>

// Token Management
public shared(msg) func addToken(
  ledgerId: Text,
  symbol: Text,
  name: Text,
  decimals: Nat8,
  fee: Nat,
  logoUrl: Text
) : async Result.Result<(), Text>
public query func getSupportedTokens() : async [Token]

// Transactions & Withdrawals
public query(msg) func getMyTransactions() : async [Transaction]
public shared(msg) func withdrawTips(
  tokenLedgerId: Text,
  amount: Nat
) : async Result.Result<Nat, Text>

// Fee Management
public shared(msg) func updateCreatorFee(feePercentage: Nat) : async Result.Result<(), Text>
public query func getCreatorFee(username: Text) : async Nat
```

### Frontend (React)

```
src/frontend/src/
├── components/
│   ├── Navbar.jsx             # Navigation bar
│   ├── Footer.jsx             # Footer component
│   ├── TokenSelector.jsx      # Token selection dropdown
│   └── TransactionList.jsx    # Transaction history table
├── pages/
│   ├── Home.jsx               # Landing page
│   ├── Dashboard.jsx          # User dashboard
│   ├── TipPage.jsx            # Individual tip page
│   └── Profile.jsx            # User profile settings
├── lib/
│   ├── auth.js                # Authentication helpers
│   ├── backend.js             # Backend canister calls
│   └── utils.js               # Utility functions
└── App.jsx                    # Main app component
```

**Key Frontend Components**:

- **Navbar**: Authentication, theme toggle, navigation
- **Dashboard**: Earnings overview, transaction history, withdrawal
- **TipPage**: Accept tips with token selection and amount input
- **TokenSelector**: Dynamic token list with logos and balances

### Code Quality

- ✅ **Javascript/Motoko Type Safety**: Fully typed codebase
- ✅ **Error Handling**: Comprehensive error handling and user feedback
- ✅ **Code Comments**: Well-documented functions and logic
- ✅ **Modular Design**: Reusable components and functions
- ✅ **Best Practices**: Following ICP and React best practices
- ✅ **Linting**: ESLint for code consistency

---

## 🔒 Security Considerations

### Authentication
- **Internet Identity**: No password storage, no password leaks
- **Principal-Based Auth**: Cryptographically secure user identification
- **Session Management**: Secure session handling via auth client

### Transaction Security
- **Amount Validation**: Client and server-side validation
- **Fee Transparency**: Clear fee breakdown before confirmation
- **Transaction Limits**: Configurable limits to prevent abuse
- **Replay Protection**: Unique transaction IDs and timestamps

### Data Privacy
- **Minimal Data Storage**: Only essential data stored on-chain
- **Encrypted Metadata**: Optional encrypted transaction messages
- **No PII Collection**: No personal identifiable information required
- **GDPR Compliant**: User data can be deleted on request

### Smart Contract Security
- **Stable Memory**: Data persists across upgrades
- **Access Control**: Principal-based function access
- **Upgrade Safety**: Controlled upgrade process
- **Audit Ready**: Clean, auditable code structure

---

## 🎯 Future Roadmap

### Phase 1 (Current)
- ✅ Multi-token support (ICP, ckBTC, ckETH)
- ✅ Internet Identity integration
- ✅ Basic dashboard and analytics
- ✅ QR code generation

### Phase 2
- 🔄 Recurring tips/subscriptions
- 🔄 Social features (leaderboards, badges)
- 🔄 Advanced analytics (charts, insights)
- 🔄 Mobile app (iOS, Android)

### Phase 3
- 📋 NFT rewards for top supporters
- 📋 Integration with major platforms (Twitter, YouTube)
- 📋 Fiat on/off ramps
- 📋 Multi-language support

### Phase 4
- 📋 DAO governance for platform decisions
- 📋 Token staking rewards
- 📋 Advanced privacy features (zero-knowledge proofs)
- 📋 Cross-chain bridge expansion

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](docs/CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **DFINITY Foundation** for the Internet Computer Protocol
- **ICP Community** for support and feedback

---

## 📞 Contact

For questions, feedback, or support, please contact:
- **Email**: fxjrin@gmail.com

---

<div align="center">

  **Built with ❤️ on the Internet Computer**

  [Internet Computer](https://internetcomputer.org/) • [DFINITY](https://dfinity.org/) • [ICP Dev Forum](https://forum.dfinity.org/)

</div>
