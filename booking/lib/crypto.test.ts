import { beforeEach, describe, expect, it } from "vitest";
import { seal, unseal } from "./crypto";

const KEY = Buffer.alloc(32, 7).toString("base64");
const OTHER_KEY = Buffer.alloc(32, 9).toString("base64");

beforeEach(() => {
  process.env.TOKEN_ENC_KEY = KEY;
});

describe("seal/unseal", () => {
  it("봉했다 열면 원문이다", () => {
    const token = "1//0eXaMpLe-refresh-token_값";
    expect(unseal(seal(token))).toBe(token);
  });

  it("같은 값을 두 번 봉해도 바이트가 다르다 — iv 가 매번 새로 나온다", () => {
    expect(seal("같은 값").equals(seal("같은 값"))).toBe(false);
  });

  it("한 바이트만 바뀌어도 열리지 않는다", () => {
    const sealed = seal("건드리면 안 되는 값");
    sealed[sealed.length - 1] ^= 1;
    expect(() => unseal(sealed)).toThrow();
  });

  it("키가 다르면 열리지 않는다", () => {
    const sealed = seal("다른 키로 봉한 값");
    process.env.TOKEN_ENC_KEY = OTHER_KEY;
    expect(() => unseal(sealed)).toThrow();
  });

  it("키 길이가 32바이트가 아니면 바이트 수를 알려주고 멈춘다", () => {
    process.env.TOKEN_ENC_KEY = Buffer.alloc(16).toString("base64");
    expect(() => seal("x")).toThrow(/32바이트/);
  });

  it("키가 없으면 변수 이름을 알려주고 멈춘다", () => {
    delete process.env.TOKEN_ENC_KEY;
    expect(() => seal("x")).toThrow(/TOKEN_ENC_KEY/);
  });
});
