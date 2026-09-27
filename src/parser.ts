import { z } from "zod";

export const MAX_NOTICE_LENGTH = 1000;
export const MAX_BULK_COUNT = 50;

export const ParsedNoticeSchema = z.object({
  trainNumber: z.string().min(1, "Train number is required"),
  stationCode: z.string().min(1, "Station code is required"),
  expectedTime: z.string().min(1, "Expected time is required"),
  reason: z.string().nullable().optional(),
});

export type ParsedNotice = z.infer<typeof ParsedNoticeSchema>;

export const BulkParsedNoticeSchema = z.array(ParsedNoticeSchema);
export type BulkParsedNotice = z.infer<typeof BulkParsedNoticeSchema>;

const NON_STATION_WORDS = new Set([
  "TRAIN", "TIME", "NEW", "DUES", "EXPECTED", "REASON", "NOTICE", "STATION",
  "PLATFORM", "DELAY", "DELAYED", "MINS", "HOURS", "HRS", "INFO", "BECAUSE",
  "DUE", "CAUSE", "ARRIVING", "DEPARTING", "RESCHEDULED", "EXPRESS", "MAIL", "SUPERFAST", "LOCAL"
]);

export function parseSingleNotice(rawText: string): ParsedNotice {
  if (typeof rawText !== "string" || !rawText.trim()) {
    throw new Error("Input notice text is empty or invalid");
  }

  if (rawText.length > MAX_NOTICE_LENGTH) {
    throw new Error(`Notice text exceeds maximum allowed length of ${MAX_NOTICE_LENGTH} characters`);
  }

  const cleanText = rawText.trim();

  // 1. Extract Train Number (4-5 digits)
  const trainMatch = cleanText.match(/\b(\d{4,5})\b/);
  if (!trainMatch) {
    throw new Error("Could not find a valid 4-5 digit train number in notice");
  }
  const trainNumber = trainMatch[1];

  // 2. Extract Station Code (2-5 uppercase letters)
  const words = cleanText.match(/\b[A-Z]{2,5}\b/g) || [];
  let stationCode: string | null = null;
  for (const word of words) {
    if (!NON_STATION_WORDS.has(word)) {
      stationCode = word;
      break;
    }
  }
  if (!stationCode) {
    const stationMatch = cleanText.match(/(?:at|station|from|to)\s+([A-Z]{2,5}|[a-zA-Z]+)/i);
    if (stationMatch) {
      const code = stationMatch[1].toUpperCase();
      if (!NON_STATION_WORDS.has(code)) {
        stationCode = code;
      }
    }
  }
  if (!stationCode) {
    throw new Error("Could not find a valid station code in notice");
  }

  // 3. Extract Expected Time
  let expectedTime: string | null = null;
  const timeMatch = cleanText.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?:\s*(?:AM|PM|hrs|hours))?\b/i);
  if (timeMatch) {
    expectedTime = timeMatch[0];
  } else {
    const delayMatch = cleanText.match(/delayed\s+by\s+(\d+\s*(?:mins|min|hours|hrs))/i);
    if (delayMatch) {
      expectedTime = `Delayed by ${delayMatch[1]}`;
    }
  }
  if (!expectedTime) {
    throw new Error("Could not find expected time or delay duration in notice");
  }

  // 4. Extract Reason (if present)
  let reason: string | null = null;
  const reasonMatch = cleanText.match(/(?:reason|cause|due to|कारण|कारण:)\s*:?\s*([^\n\r.]+)/i);
  if (reasonMatch) {
    reason = reasonMatch[1].trim();
  }

  const rawOutput = {
    trainNumber,
    stationCode,
    expectedTime,
    reason: reason || null,
  };

  const validation = ParsedNoticeSchema.safeParse(rawOutput);
  if (!validation.success) {
    throw new Error(`Parsed output failed schema validation: ${validation.error.message}`);
  }

  return validation.data;
}

export function parseBulkNotices(rawNotices: unknown): BulkParsedNotice {
  if (!Array.isArray(rawNotices)) {
    throw new Error("Bulk input must be an array of notice strings");
  }

  if (rawNotices.length === 0) {
    throw new Error("Bulk notices array cannot be empty");
  }

  if (rawNotices.length > MAX_BULK_COUNT) {
    throw new Error(`Bulk notices count exceeds maximum allowed of ${MAX_BULK_COUNT}`);
  }

  const parsedResults: ParsedNotice[] = [];
  for (let i = 0; i < rawNotices.length; i++) {
    const noticeStr = rawNotices[i];
    if (typeof noticeStr !== "string") {
      throw new Error(`Notice at index ${i} is not a valid text string`);
    }
    const parsed = parseSingleNotice(noticeStr);
    parsedResults.push(parsed);
  }

  const bulkValidation = BulkParsedNoticeSchema.safeParse(parsedResults);
  if (!bulkValidation.success) {
    throw new Error(`Bulk output failed schema validation: ${bulkValidation.error.message}`);
  }

  return bulkValidation.data;
}
