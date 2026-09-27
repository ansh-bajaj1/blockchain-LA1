import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

dotenv.config();

// Configuration from environment variables (Check 4 - secrets read from env)
const API_URL = process.env.API_URL || "http://localhost:3000";
const BUYER_PRIVATE_KEY = (process.env.BUYER_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001") as `0x${string}`;
const NETWORK = process.env.NETWORK || "eip155:84532";

export async function runBuyer() {
  console.log("--- Meera's Railway Delay API Buyer Client ---");

  // 1. Setup Viem EVM account from private key
  const account = privateKeyToAccount(BUYER_PRIVATE_KEY);
  console.log(`Buyer Wallet Address: ${account.address}`);
  console.log(`Target Network: ${NETWORK}`);

  // 2. Setup x402 Client with ExactEvmScheme
  const client = new x402Client();
  client.register(NETWORK, new ExactEvmScheme(account));

  // 3. Wrap standard fetch with x402 payment handling (Check 3)
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  // Read sample valid notice file
  const samplePath = path.join(__dirname, "../samples/sample1_valid.txt");
  let noticeContent = "Train 12127 at PUNE delayed. Expected time 14:30. Reason: तांत्रिक बिघाड";
  if (fs.existsSync(samplePath)) {
    noticeContent = fs.readFileSync(samplePath, "utf8");
  }

  console.log("\nCalling Paid Endpoint: POST /api/parse");
  console.log("Notice Input:\n", noticeContent);

  try {
    const response = await fetchWithPayment(`${API_URL}/api/parse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notice: noticeContent }),
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);
    const data = await response.json();
    console.log("Parsed JSON Result:\n", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Payment or request error:", err.message || err);
  }
}

if (require.main === module) {
  runBuyer();
}
