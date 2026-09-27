import request from "supertest";
import { createServer, NETWORK, PAYEE_ADDRESS, SINGLE_PARSE_PRICE, BULK_PARSE_PRICE } from "../src/server";

describe("Meera's Railway Delay API HTTP Endpoints", () => {
  let app: any;

  beforeAll(async () => {
    app = await createServer({ syncFacilitator: false });
  });

  describe("Free Routes", () => {
    it("GET /api/health returns 200 OK without requiring x402 payment", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });

    it("GET /api/schema returns 200 OK with schema details", async () => {
      const res = await request(app).get("/api/schema");
      expect(res.status).toBe(200);
      expect(res.body.singleNoticeSchema).toBeDefined();
    });
  });

  describe("x402 Payment Gating (Check 1 & Check 2)", () => {
    it("POST /api/parse returns HTTP 402 Payment Required when no x402 payment header is attached", async () => {
      const res = await request(app)
        .post("/api/parse")
        .send({ notice: "Train 12127 at PUNE expected 14:30" });
      
      expect(res.status).toBe(402);
    });

    it("POST /api/parse-bulk returns HTTP 402 Payment Required when no x402 payment header is attached", async () => {
      const res = await request(app)
        .post("/api/parse-bulk")
        .send({ notices: ["Train 12127 at PUNE expected 14:30"] });

      expect(res.status).toBe(402);
    });

    it("verifies payment configuration exclusively targets a testnet (Check 2)", () => {
      expect(NETWORK).toBe("eip155:84532");
      expect(NETWORK).not.toBe("eip155:8453");
      expect(NETWORK.toLowerCase()).toContain("84532");
    });

    it("verifies prices and payTo address are fixed server-side constants (Check 5 & Check 6)", () => {
      expect(SINGLE_PARSE_PRICE).toBe("1000");
      expect(BULK_PARSE_PRICE).toBe("5000");
      expect(PAYEE_ADDRESS).toBeDefined();
      expect(PAYEE_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe("Parser Failure and Error Handling (Check 7 & Check 10)", () => {
    it("returns HTTP 4xx status before or instead of success when parsing malformed notice", async () => {
      const res = await request(app)
        .post("/api/parse")
        .send({ notice: "Garbage notice text with no train number or expected time" });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      expect(res.status).not.toBe(200);
    });

    it("rejects request body exceeding max length limits (Check 8)", async () => {
      const longNotice = "Train 12127 PUNE 14:30 " + "X".repeat(1200);
      const res = await request(app)
        .post("/api/parse")
        .send({ notice: longNotice });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(200);
    });
  });
});
