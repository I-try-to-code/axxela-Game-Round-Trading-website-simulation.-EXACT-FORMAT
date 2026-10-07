# 📈 Digit-Sum Trading Game Simulator

An authentic, full-stack multiplayer trading game simulator engineered for practicing quantitative trading recruitment games (specifically the currency note serial digit-sum market-making game).

Built with **Node.js**, **Express**, **Socket.IO**, and **React (Vite)**.

---

## 🎯 About The Game

In quantitative trading recruitment interviews and trading floor assessment centers, candidates play a rapid market-making game centered around an unknown 6-digit currency serial number. 

Traders quote **Bids** (Buy) and **Asks** (Sell) on the final sum of the 6 digits while digits are revealed one-by-one round after round. Success requires fast mental math, dynamic expected-value updating, disciplined risk management under strict position limits, and opportunistic trading against mispriced counterparty orders.

---

## 🕹️ Game Rules & Mechanics

### 1. Progressive Information & Fair Value
- **Underlying Asset**: The sum of a 6-digit currency note serial number (minimum possible sum = `0`, maximum possible sum = `54`).
- **6 Trading Rounds**:
  - **Round 1**: 0 digits revealed (Pure Expected Value = $6 \times 4.5 = 27$).
  - **Round 2**: 1st digit revealed.
  - **Round 3**: 2nd digit revealed.
  - **Round 4**: 3rd digit revealed.
  - **Round 5**: 4th digit revealed.
  - **Round 6**: 5th digit revealed (1 secret digit remains).
  - **Settlement**: 6th digit revealed. All open positions are cash-settled against the final sum.
- **Fair Value Formula**:
  $$\text{Expected Value} = \text{Sum of Revealed Digits} + (\text{Remaining Unrevealed Digits} \times 4.5)$$

### 2. Strict Risk & Position Limits
- Every participant has a hard position constraint of **$[-2, +2]$ contracts**.
- A player holding $+2$ (long) cannot buy further; a player holding $-2$ (short) cannot sell further.
- Realized P&L is locked in dynamically using standard FIFO/average accounting whenever opposite trades close out open contracts.

### 3. Broadcast Working Orders
- At any time, a player can have at most **2 active working orders** quoted on the table.
- Orders are broadcasted live to the entire table:
  - 🟢 **Green Pill (`Buy @ X`)**: Maker wants to buy from counterparties at price $X$.
  - 🔴 **Red Pill (`Sell @ X`)**: Maker wants to sell to counterparties at price $X$.

### 4. 1-Click Order Execution
- Click any player's order pill around the table:
  - The price automatically fills into your order ticket.
  - The matching counter-side is automatically selected (clicking a `Buy @ 25` selects `Sell`; clicking a `Sell @ 30` selects `Buy`).
  - Click **Place Order ➔** to instantly execute the trade.

---

## 🚀 Key Features

- **Multiplayer & Configurable Tables**: Support for 2 to 10 players per room with dynamic oval seating.
- **Auto-Filling AI Bots**: Unfilled seats are automatically populated with intelligent market-making bots that quote tight spreads around EV and capitalize on mispriced table orders.
- **Zero-Friction Universal Sharing**: Built-in room invite links (`/?join=ROOMCODE`) allow friends to join directly without requiring account creation or authentication.
- **Practice Assistant Mode**: Optional toggle during room creation that displays a real-time Expected Value HUD with minimum/maximum bounds.
- **Screenshot-Accurate Table UI**: Designed to replicate the look, feel, audio cues, and layout of trading recruitment games.
- **Authoritative Server Engine**: Secret digits remain strictly on the server and are never leaked to client browsers ahead of schedule.

---

## 🛠️ Architecture & Tech Stack

```
axxela-website/
├── client/                  # Frontend (React 18, Vite, Lucide Icons, Web Audio)
│   ├── src/
│   │   ├── components/      # Table view, player badges, order ticket, modals
│   │   ├── audio/           # Synthesized sound effects (Web Audio API)
│   │   └── socket.js        # Socket.IO client interface
│   └── package.json
├── server/                  # Backend (Node.js, Express, Socket.IO)
│   ├── src/
│   │   ├── engines/         # Modular math, risk, digit, and matching engines
│   │   └── socket/          # Authoritative WebSocket handlers
│   └── package.json
└── package.json             # Root orchestration scripts
```

---

## 💻 Quickstart & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- `npm` (bundled with Node.js)

### 1. Installation
Clone the repository and install all dependencies for root, client, and server:
```bash
git clone https://github.com/your-username/digit-sum-trading-game.git
cd digit-sum-trading-game

# Install root, client, and server dependencies
npm run install:all
```

### 2. Running in Development Mode
Run both frontend and backend concurrently with hot reloading:
```bash
npm run dev
```
- Frontend dev server: `http://localhost:3000` (or `http://localhost:5173`)
- Backend server: `http://localhost:5000`

### 3. Running in Production Mode
Build the optimized client bundle and serve it directly from the Express backend:
```bash
# Build frontend
npm run build

# Start production server
npm start
```
Open **`http://localhost:5000`** in your browser.

---

## 🌐 Playing Online With Friends (Tunneling & Hosting)

You can share your local running game with friends over the internet without setting up port forwarding on your router:

### Option A: Cloudflare Quick Tunnel (Free, No Account Needed)
1. Download [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/).
2. Start the production server:
   ```bash
   npm start
   ```
3. In a separate terminal, launch a quick tunnel:
   ```bash
   cloudflared tunnel --url http://localhost:5000
   ```
4. Copy the generated `https://<random-subdomain>.trycloudflare.com` URL and send it to your friends.

### Option B: Deploying to Cloud (Render / Railway / VPS)
- Set the build command: `npm run install:all && npm run build`
- Set the start command: `npm start`
- Expose port `5000` (or allow `process.env.PORT`).

---

## 🧪 Testing

Run backend engine unit tests (covering position limits, fair value math, and trade execution):
```bash
npm run test:server
```

---

## 📄 License & Disclaimer

This project is an **independent educational simulation** created strictly for private practice, learning quantitative trading fundamentals, and interview preparation. It is not affiliated with, sponsored by, or endorsed by any proprietary trading firm or company.
