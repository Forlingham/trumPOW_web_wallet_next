
# TRMP Wallet - A Secure, Non-Custodial Web Wallet for TrumPOW

TRMP Wallet is a secure, client-side, non-custodial web wallet for the TrumPOW (TRMP) cryptocurrency. It allows users to have full control over their private keys while interacting with the TrumPOW blockchain. All critical operations, including address generation and transaction signing, are performed locally in your browser. Your private keys are never transmitted over the network.


![trmp wallet](https://r2.hysanalde.com/trmp-image.png)


## Features

  * **Non-Custodial**: You have exclusive control over your funds. Private keys are generated and stored directly on your device.
  * **Client-Side Operations**: All cryptographic operations are performed client-side, ensuring your private information is never sent to a server.
  * **Secure Encrypted Storage**: Private keys are AES-256 encrypted in your browser's local storage, protected by a password you set.
  * **Full User Privacy**: No registration or personal information is required to use the wallet.
  * **Backend Independent**: The wallet interacts with a backend indexer for blockchain data but performs all key-related tasks locally.

## Security Overview

Security is the highest priority for TRMP Wallet. Here’s how we protect your assets:

#### 1\. Non-Custodial Key Management

The core principle of this wallet is that only you can access your funds. The mnemonic phrase (seed) and the derived private keys are generated and managed exclusively within your browser. We never have access to your keys.

#### 2\. Client-Side Cryptography

All sensitive cryptographic functions are handled by trusted, open-source JavaScript libraries (`bip39`, `bip32`, `bitcoinjs-lib`) running directly in your browser. This includes:

  * Generating mnemonic phrases.
  * Deriving private keys and addresses.
  * Signing transactions.

Your private key never leaves your device. Only the signed, public transaction is broadcast to the network.

#### 3\. Encrypted Local Storage

When you create or import a wallet, your encrypted mnemonic phrase is stored in the browser's `localStorage`.

  * **Encryption**: The mnemonic is encrypted using the **AES-256** standard, a robust and widely-trusted encryption algorithm.
  * **Password Protection**: The encryption key is derived from a password you set. This password is required to unlock your wallet and decrypt your keys for signing transactions. Without the password, the stored data is indecipherable.

#### 4\. No Server-Side Key Storage

The backend for this wallet serves as a blockchain indexer, providing transaction history and UTXO information. It has no knowledge of or access to user private keys, making it impossible for a server compromise to lead to a loss of user funds.

-----

## How to Run the Project

This project is a Next.js application built with TypeScript and Tailwind CSS.

### Prerequisites

  * [Node.js](https://nodejs.org/) (v18.x or later recommended)
  * [yarn](https://yarnpkg.com/) (as specified in `yarn.lock`)
  * A running TrumPOW (TRMP) full node with RPC enabled.
  * A running instance of the [TRMP Indexer Backend](https://www.google.com/search?q=https://github.com/link-to-your-backend-repo).

### 1\. Clone the Repository

```bash
git clone https://github.com/Forlingham/trumpow_web_wallet_next.git
cd trumpow_web_wallet_next
```

### 2\. Install Dependencies

This project uses `yarn` for package management.

```bash
yarn install
```


### 3\. Run the Development Server

Once the dependencies are installed and the environment is configured, you can start the development server.

```bash
npm run dev
```

The application will be available at `http://localhost:3050` (or another port if 3050 is in use).

### 4\. Build for Production

To create a production-ready build, run:

```bash
npm run build
```

This will generate an optimized version of the application in the `.next` directory. You can then start the production server with:

```bash
npm run start
```