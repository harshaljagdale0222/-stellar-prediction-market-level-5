# 🚀 Stellar Predict - Level 5

Welcome to **Stellar Predict**, a fully decentralized prediction market platform built on the **Stellar Soroban** blockchain. This project represents the pinnacle of decentralized application development, featuring a robust multi-wallet ecosystem, advanced smart contract architecture, and a premium user experience.

---

## 🌟 Key Features

### 1. Multi-Wallet Integration
Experience seamless connectivity with the most popular Stellar wallets:
*   **Freighter**: The standard browser extension for the Stellar ecosystem.
*   **Albedo**: A web-based wallet provider that works across all devices, including mobile.
*   **xBULL**: A powerful and flexible wallet for advanced users.

### 2. Advanced Smart Contracts (Soroban)
Our core logic is built with Rust on the Soroban smart contract platform:
*   **Factory Pattern**: Deploy new prediction markets on-the-fly.
*   **Automated Market Making**: Fair price discovery based on supply and demand.
*   **Collateral Management**: Secure handling of assets for placing bets.

### 3. Premium User Experience (UX)
*   **Real-time Sentiment**: Integrated sentiment tracking (Yes vs No) for every market.
*   **Interactive Visuals**: Confetti celebrations for successful trades.
*   **Optimistic UI**: Smooth and responsive transitions for a modern feel.
*   **Fully Responsive**: Built with Tailwind CSS, ensuring a great experience on any screen size.

---

## 🛠️ Tech Stack

*   **Frontend**: [Next.js 14](https://nextjs.org/) (App Router), [Tailwind CSS](https://tailwindcss.com/)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Blockchain**: [Stellar](https://www.stellar.org/) / [Soroban](https://soroban.stellar.org/)
*   **Smart Contracts**: [Rust](https://www.rust-lang.org/)
*   **Styling**: Modern, Dark-themed UI with Glassmorphism effects.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   Stellar Wallet Extension (Freighter/xBULL) or an Albedo account.

### Installation
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/[YOUR_USERNAME]/stellar-prediction-market-level-5.git
    cd stellar-prediction-market-level-5
    ```

2.  **Install Dependencies**:
    ```bash
    cd app
    npm install
    ```

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```

4.  **Visit the App**: Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 Project Structure

*   `/app`: The Next.js frontend application.
    *   `/app/context`: Global state management for wallet connections.
    *   `/app/lib`: Core logic for interacting with the Stellar network.
    *   `/app/components`: Reusable UI components.
*   `/contracts`: Rust-based Soroban smart contracts.
    *   `/contracts/market`: The main prediction market logic.

---

## 📄 License

This project is licensed under the MIT License.

---

*Developed for the Stellar Level 5 Milestone.*
