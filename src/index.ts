import { createServer } from "./server";
import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || 3000;

async function start() {
  const app = await createServer({ syncFacilitator: false });

  app.listen(port, () => {
    console.log(`Meera's Railway Delay API running on http://localhost:${port}`);
    console.log(`Free route: GET http://localhost:${port}/api/health`);
    console.log(`Paid route (Single): POST http://localhost:${port}/api/parse (0.001 USDC)`);
    console.log(`Paid route (Bulk): POST http://localhost:${port}/api/parse-bulk (0.005 USDC)`);
  });
}

start().catch(console.error);
