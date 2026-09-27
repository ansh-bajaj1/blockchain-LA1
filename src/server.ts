import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import {
  parseSingleNotice,
  parseBulkNotices,
  MAX_NOTICE_LENGTH,
  ParsedNoticeSchema,
  BulkParsedNoticeSchema,
} from "./parser";

dotenv.config();

// Server-side payment configuration (testnet only, constant/env-driven)
export const NETWORK = process.env.NETWORK || "eip155:84532";
export const PAYEE_ADDRESS = process.env.PAYEE_ADDRESS || "0x0000000000000000000000000000000000000000";
export const SINGLE_PARSE_PRICE = process.env.SINGLE_PARSE_PRICE || "1000"; // 0.001 USDC
export const BULK_PARSE_PRICE = process.env.BULK_PARSE_PRICE || "5000";   // 0.005 USDC
export const FACILITATOR_URL = process.env.FACILITATOR_URL || "https://x402.org/facilitator";

export function createServerApp(resourceServer: any, options: { syncFacilitator?: boolean } = {}) {
  const app = express();

  // Enforce body size limits server-side (Check 8)
  app.use(express.json({ limit: "10kb" }));
  app.use(express.text({ limit: "10kb" }));

  // Configure paid routes with fixed server-side prices and payee address (Check 1, 2, 5, 6)
  const routesConfig = {
    "POST /api/parse": {
      accepts: {
        scheme: "exact",
        price: SINGLE_PARSE_PRICE,
        network: NETWORK,
        payTo: PAYEE_ADDRESS,
      },
      description: "Meera's Railway Delay Notice Parser - Single Notice",
    },
    "POST /api/parse-bulk": {
      accepts: {
        scheme: "exact",
        price: BULK_PARSE_PRICE,
        network: NETWORK,
        payTo: PAYEE_ADDRESS,
      },
      description: "Meera's Railway Delay Notice Parser - Bulk Notices",
    },
  };

  const syncFacilitatorOnStart = options.syncFacilitator ?? false;
  app.use(paymentMiddleware(routesConfig, resourceServer, undefined, undefined, syncFacilitatorOnStart));

  // --- FREE ROUTES ---
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "Meera's Railway Delay API", version: "1.0.0" });
  });

  app.get("/api/schema", (_req: Request, res: Response) => {
    res.json({
      singleNoticeSchema: {
        trainNumber: "string",
        stationCode: "string",
        expectedTime: "string",
        reason: "string (optional)",
      },
      maxNoticeLength: MAX_NOTICE_LENGTH,
    });
  });

  // --- PAID ROUTE 1: Single Notice Parsing ---
  app.post("/api/parse", (req: Request, res: Response) => {
    try {
      const noticeText = typeof req.body === "string" ? req.body : req.body?.notice;

      if (typeof noticeText !== "string" || !noticeText.trim()) {
        return res.status(400).json({ error: "Missing or invalid notice text in request body" });
      }

      if (noticeText.length > MAX_NOTICE_LENGTH) {
        return res.status(400).json({ error: `Notice text exceeds maximum allowed length of ${MAX_NOTICE_LENGTH} characters` });
      }

      // Parse notice text
      const parsedNotice = parseSingleNotice(noticeText);

      // Validate output against explicit schema (Check 9)
      const schemaCheck = ParsedNoticeSchema.safeParse(parsedNotice);
      if (!schemaCheck.success) {
        return res.status(400).json({ error: "Parsed output failed schema validation", details: schemaCheck.error.issues });
      }

      return res.status(200).json(schemaCheck.data);
    } catch (err: any) {
      // Unparseable notices return HTTP 400 status before/instead of success body (Check 7)
      return res.status(400).json({ error: err.message || "Failed to parse delay notice" });
    }
  });

  // --- PAID ROUTE 2: Bulk Notice Parsing ---
  app.post("/api/parse-bulk", (req: Request, res: Response) => {
    try {
      const notices = Array.isArray(req.body) ? req.body : req.body?.notices;

      if (!Array.isArray(notices) || notices.length === 0) {
        return res.status(400).json({ error: "Request body must contain a non-empty array of notice strings" });
      }

      // Parse bulk notices
      const parsedNotices = parseBulkNotices(notices);

      // Validate output against explicit bulk schema (Check 9)
      const schemaCheck = BulkParsedNoticeSchema.safeParse(parsedNotices);
      if (!schemaCheck.success) {
        return res.status(400).json({ error: "Bulk output failed schema validation", details: schemaCheck.error.issues });
      }

      return res.status(200).json(schemaCheck.data);
    } catch (err: any) {
      // Unparseable bulk notices return HTTP 400 status (Check 7)
      return res.status(400).json({ error: err.message || "Failed to parse bulk delay notices" });
    }
  });

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 400;
    res.status(status).json({ error: err.message || "Bad Request" });
  });

  return app;
}

export async function createServer(options: { syncFacilitator?: boolean } = {}) {
  const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
  const resourceServer = new x402ResourceServer(facilitatorClient);
  resourceServer.register(NETWORK, new ExactEvmScheme());

  try {
    await resourceServer.initialize();
  } catch (err) {
    // Fallback for offline / isolated environments
  }

  return createServerApp(resourceServer, options);
}
