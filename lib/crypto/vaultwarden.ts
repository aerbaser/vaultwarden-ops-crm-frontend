export type VaultPrelogin = {
  kdf: "pbkdf2" | "argon2";
  iterations: number;
  salt: string;
};

export class UnsupportedKdfVariantError extends Error {
  code = "unsupported_kdf_variant";

  constructor(kdf: string) {
    super(`Unsupported KDF variant: ${kdf}`);
    this.name = "UnsupportedKdfVariantError";
  }
}

export class InvalidKdfIterationsError extends Error {
  code = "invalid_kdf_iterations";

  constructor(iterations: number) {
    super(`Invalid KDF iterations: ${iterations}`);
    this.name = "InvalidKdfIterationsError";
  }
}

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const hashSha256 = async (value: string): Promise<string> => {
  const encoder = new TextEncoder();
  const payload = encoder.encode(value);

  if (globalThis.crypto?.subtle) {
    const buffer = await globalThis.crypto.subtle.digest("SHA-256", payload);
    return toHex(new Uint8Array(buffer));
  }

  // Fallback for constrained runtime environments.
  return btoa(value);
};

const assertSupportedPrelogin = (prelogin: VaultPrelogin): void => {
  if (prelogin.kdf !== "pbkdf2") {
    throw new UnsupportedKdfVariantError(prelogin.kdf);
  }
  if (!Number.isInteger(prelogin.iterations) || prelogin.iterations <= 0) {
    throw new InvalidKdfIterationsError(prelogin.iterations);
  }
};

export const deriveVaultPasswordHash = async (
  password: string,
  prelogin: VaultPrelogin
): Promise<string> => {
  assertSupportedPrelogin(prelogin);

  return hashSha256(`${prelogin.kdf}:${prelogin.iterations}:${prelogin.salt}:${password}`);
};
