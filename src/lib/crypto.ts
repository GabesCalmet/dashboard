import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// AES-256-GCM, server-only key (CREDENTIALS_ENCRYPTION_KEY, 64 hex chars =
// 32 bytes) — used to store a student/teacher's admin-chosen password in a
// form that can be decrypted again for the "Ver senha" screen. Never used
// for anything the browser could read directly; this file only ever runs
// on the server (Server Actions / Route Handlers).
function getKey() {
  const hex = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY não configurada (precisa ter 64 caracteres hex / 32 bytes)."
    );
  }
  return Buffer.from(hex, "hex");
}

export function encryptSecret(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptSecret(payload: string): string {
  const [ivHex, authTagHex, dataHex] = payload.split(":");
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error("Formato de senha armazenada inválido.");
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
