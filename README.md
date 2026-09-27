# The Operator's Booth: Meera's Railway Delay API 🚂

An HTTP API built for Meera, a retired Indian Railways clerk in Pune. Everyday commuters hit her delay notice parser for clean JSON data. Using the **x402 Payment Protocol** on the **Base Sepolia testnet (`eip155:84532`)**, every successful parser call costs a fraction of a cent in test USDC — and per Meera's firm rule: **nobody pays for a notice she couldn't read**. If parsing fails, the request returns a 4xx error and the caller keeps their coin!

---

## 🌟 Key Features

1. **x402 Payment Protocol Middleware (`@x402/express`)**:
   - Gated endpoints require micro-payments in test USDC on Base Sepolia (`eip155:84532`).
   - Payment requirements (price, payee address, chain ID) are returned via `402 Payment Required` headers.
2. **Verify-Then-Settle & Zero Cost on Failure**:
   - If a raw notice is malformed or unparseable, the handler responds with HTTP 400 Bad Request *before* settlement occurs. The buyer is never charged for failed parses.
3. **Server-Enforced Controls**:
   - **Fixed Server-Side Pricing**: Prices (`1000` units / 0.001 USDC for single parse, `5000` units / 0.005 USDC for bulk parse) are fixed server-side constants.
   - **Server-Side Payee Address**: The recipient wallet address (`PAYEE_ADDRESS`) is strictly controlled by environment configuration.
   - **Input Capping**: Request bodies are capped at `10kb` and single notice lengths are capped at 1,000 characters to prevent abuse.
4. **Schema Validation (Zod)**:
   - All parsed output is validated against an explicit schema (`ParsedNoticeSchema`) before returning JSON.
5. **Sample Notices Directory**:
   - Includes real-world railway delay notices (English, Marathi, Hindi) alongside deliberately broken examples.
6. **x402 Buyer Client**:
   - Includes a standalone TypeScript buyer script (`src/buyer.ts`) using `@x402/fetch` and `@x402/evm` to sign and pay for API calls automatically.

---

## 📁 Repository Structure

```
.
├── src/
│   ├── parser.ts            # Notice parser logic & Zod schema definitions
│   ├── server.ts            # Express server with x402 payment middleware
│   ├── buyer.ts             # Buyer client script with x402 payment signing
│   ├── index.ts             # Server entry point
│   └── types.d.ts           # TypeScript module declarations
├── samples/
│   ├── sample1_valid.txt    # Valid notice with Marathi reason (Single)
│   ├── sample2_valid.txt    # Valid notice with English reason (Single)
│   ├── sample3_valid.txt    # Valid notice with Hindi reason (Single)
│   ├── sample4_bulk.json    # Array of valid notices (Bulk)
│   ├── sample5_broken.txt   # Broken notice (Missing train/time)
│   └── sample6_broken.txt   # Malformed notice (Garbage text)
├── tests/
│   ├── parser.test.ts       # Unit tests for parser and malformed notice assertions
│   └── api.test.ts          # API tests for x402 payment gating & 4xx status codes
├── .env.example             # Environment variable placeholders (no real secrets!)
├── .gitignore               # Ignored files (.env, node_modules, dist)
├── package.json             # NPM scripts & dependencies
├── tsconfig.json            # TypeScript configuration
└── README.md                # Project documentation
```

---

## 🛠️ Setup & Installation

### Prerequisites

- **Node.js**: v20.12+ (v22 / v24 recommended)
- **NPM**: v10+

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

The default values target the **Base Sepolia Testnet**:
- `NETWORK`: `eip155:84532`
- `PORT`: `3000`
- `SINGLE_PARSE_PRICE`: `1000` (0.001 USDC / fraction of a cent)
- `BULK_PARSE_PRICE`: `5000` (0.005 USDC)
- `PAYEE_ADDRESS`: `0x0000000000000000000000000000000000000000` (Replace with your wallet address on Base Sepolia)
- `BUYER_PRIVATE_KEY`: `0x0000000000000000000000000000000000000000000000000000000000000001` (Replace with buyer testnet private key)

---

## 🚀 Running the API & Buyer Client

### 1. Start the Server

```bash
npm start
```

Output:
```
Meera's Railway Delay API running on http://localhost:3000
Free route: GET http://localhost:3000/api/health
Paid route (Single): POST http://localhost:3000/api/parse (0.001 USDC)
Paid route (Bulk): POST http://localhost:3000/api/parse-bulk (0.005 USDC)
```

### 2. Run the Buyer Script

In a new terminal window, execute the x402 buyer script:

```bash
npm run buyer
```

The buyer script reads `samples/sample1_valid.txt`, constructs an x402 payment signature via `@x402/fetch`, submits the request to `POST /api/parse`, and outputs the structured JSON result:

```json
{
  "trainNumber": "12127",
  "stationCode": "PUNE",
  "expectedTime": "14:30",
  "reason": "तांत्रिक बिघाड"
}
```

---

## 🧪 Running Automated Tests

Run the full Jest test suite (18 unit & integration tests):

```bash
npm test
```

Test coverage includes:
- **Parser Unit Tests**: Parsing valid notices with Marathi/Hindi reasons, schema validation.
- **Malformed Notice Tests**: Asserting errors when train number, station, or time is missing.
- **x402 Gating Tests**: Verifying HTTP 402 returns when payment header is missing.
- **Testnet Configuration**: Verifying network is strictly set to Base Sepolia testnet (`eip155:84532`).
- **Server Caps**: Verifying request body size limit enforcement.

---

## 📊 Endpoints Summary

| Endpoint | Method | Access | Price | Description |
|---|---|---|---|---|
| `/api/health` | GET | Free | $0.00 | Health check & service status |
| `/api/schema` | GET | Free | $0.00 | Output JSON schema & limits |
| `/api/parse` | POST | Paid (x402) | 0.001 USDC | Parses a single raw delay notice |
| `/api/parse-bulk` | POST | Paid (x402) | 0.005 USDC | Parses an array of delay notices |

---

## 🔒 Security & Privacy

- **No Tracked Credentials**: Secrets and private keys are read strictly from environment variables (`process.env`).
- **Git Safety**: `.env` is ignored by `.gitignore`, and `.env.example` contains dummy zero-address placeholders.
- **Server Authority**: The caller cannot control or override prices, payee addresses, or payment networks.

---

## 📜 License

ISC License. Built for Road to Devcon VI - The Operator's Booth.
