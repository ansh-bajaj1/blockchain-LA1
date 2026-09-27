import { parseSingleNotice, parseBulkNotices, ParsedNoticeSchema, BulkParsedNoticeSchema } from "../src/parser";

describe("Meera's Railway Delay Notice Parser", () => {
  describe("parseSingleNotice - Valid Notices", () => {
    it("parses valid notice with Marathi reason", () => {
      const input = "Train 12127 at PUNE delayed by signal failure. Expected time 14:30. Reason: तांत्रिक बिघाड";
      const result = parseSingleNotice(input);
      expect(result).toEqual({
        trainNumber: "12127",
        stationCode: "PUNE",
        expectedTime: "14:30",
        reason: "तांत्रिक बिघाड",
      });
      expect(ParsedNoticeSchema.safeParse(result).success).toBe(true);
    });

    it("parses valid English notice with AM time format", () => {
      const input = "11007 DECCAN EXPRESS arriving at CSMT expected 09:15 AM due to signal clearance delay";
      const result = parseSingleNotice(input);
      expect(result).toEqual({
        trainNumber: "11007",
        stationCode: "CSMT",
        expectedTime: "09:15 AM",
        reason: "signal clearance delay",
      });
      expect(ParsedNoticeSchema.safeParse(result).success).toBe(true);
    });

    it("parses valid notice with Hindi reason", () => {
      const input = "Train 12138 at SUR rescheduled expected time 22:45. Reason: मौसम खराब";
      const result = parseSingleNotice(input);
      expect(result).toEqual({
        trainNumber: "12138",
        stationCode: "SUR",
        expectedTime: "22:45",
        reason: "मौसम खराब",
      });
      expect(ParsedNoticeSchema.safeParse(result).success).toBe(true);
    });
  });

  describe("parseSingleNotice - Malformed Notices (Check 10)", () => {
    it("fails when notice contains garbage text without train or time", () => {
      const malformedInput = "Good morning platform 2 passengers! Fresh tea and hot snacks ready.";
      expect(() => parseSingleNotice(malformedInput)).toThrow();
    });

    it("fails when numeric train number is missing", () => {
      const malformedInput = "Train ABC is running late somewhere at PUNE expected time 15:00";
      expect(() => parseSingleNotice(malformedInput)).toThrow("Could not find a valid 4-5 digit train number in notice");
    });

    it("fails when expected time is missing", () => {
      const malformedInput = "12127 DECCAN QUEEN at PUNE station is delayed";
      expect(() => parseSingleNotice(malformedInput)).toThrow("Could not find expected time or delay duration in notice");
    });

    it("fails when input is an empty string", () => {
      expect(() => parseSingleNotice("")).toThrow("Input notice text is empty or invalid");
    });

    it("fails when notice text exceeds maximum allowed length", () => {
      const longInput = "12127 PUNE 14:30 " + "a".repeat(1050);
      expect(() => parseSingleNotice(longInput)).toThrow(/exceeds maximum allowed length/);
    });
  });

  describe("parseBulkNotices", () => {
    it("parses an array of valid notices", () => {
      const inputs = [
        "Train 12127 at PUNE delayed. Expected time 14:30. Reason: तांत्रिक बिघाड",
        "11007 DECCAN EXPRESS arriving at CSMT expected 09:15 AM due to signal clearance delay"
      ];
      const result = parseBulkNotices(inputs);
      expect(result).toHaveLength(2);
      expect(BulkParsedNoticeSchema.safeParse(result).success).toBe(true);
    });

    it("fails when bulk array contains a malformed notice", () => {
      const inputs = [
        "Train 12127 at PUNE delayed. Expected time 14:30",
        "Garbage text notice with no train number"
      ];
      expect(() => parseBulkNotices(inputs)).toThrow();
    });
  });
});
