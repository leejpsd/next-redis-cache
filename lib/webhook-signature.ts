import { createHmac, timingSafeEqual } from "node:crypto";

interface SignatureInput {
  topic: string;
  timestamp: string;
  webhookId: string;
  body: string;
  secret: string;
}

export function createWebhookSignature(input: SignatureInput): string {
  const payload = `${input.timestamp}.${input.topic}.${input.webhookId}.${input.body}`;
  return createHmac("sha256", input.secret).update(payload).digest("hex");
}

export function verifyWebhookSignature(input: SignatureInput & { signature: string }): boolean {
  const expected = createWebhookSignature(input);
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(input.signature, "hex");

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function isTimestampWithinSkew(
  timestamp: string,
  maxSkewSeconds: number
): boolean {
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed) || parsed <= 0) return false;

  const skewMs = Math.abs(Date.now() - parsed);
  return skewMs <= maxSkewSeconds * 1000;
}
