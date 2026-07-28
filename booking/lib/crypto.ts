/**
 * refresh token 암호화 — `calendar_token.refresh_token` 에 넣는 bytea 를 만든다.
 *
 * 텀블벅 안에 있었으면 기존 암호화 유틸을 썼겠지만 독립 서비스라 직접 붙인다.
 * node:crypto 가 AES-GCM 을 하므로 여기서 하는 일은 형식을 정하는 것뿐이다 —
 * iv(12) ‖ tag(16) ‖ 암호문. 키가 바뀌면 복호가 실패하고, 그 담당자는 재연동한다.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { env } from "./env";

const IV_BYTES = 12;
const TAG_BYTES = 16;

function key(): Buffer {
  const raw = Buffer.from(env("TOKEN_ENC_KEY"), "base64");
  if (raw.length !== 32) {
    throw new Error(`TOKEN_ENC_KEY 는 base64 로 인코딩한 32바이트여야 한다: ${raw.length}바이트`);
  }
  return raw;
}

export function seal(plain: string): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]);
}

export function unseal(sealed: Uint8Array): string {
  const buf = Buffer.from(sealed);
  const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, IV_BYTES));
  decipher.setAuthTag(buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  const body = buf.subarray(IV_BYTES + TAG_BYTES);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}
