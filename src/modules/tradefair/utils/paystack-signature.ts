import crypto from "crypto";

export function buildPaystackSignature(payload: string, secret: string) {
  return crypto.createHmac("sha512", secret).update(payload).digest("hex");
}

export function isValidPaystackSignature(params: {
  rawBody: string;
  signature?: string;
  secret: string;
}) {
  if (!params.signature) return false;
  const expected = buildPaystackSignature(params.rawBody, params.secret);
  return expected === params.signature;
}
