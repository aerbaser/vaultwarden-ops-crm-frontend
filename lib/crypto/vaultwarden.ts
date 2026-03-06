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

const assertSupportedPrelogin = (prelogin: VaultPrelogin): void => {
  if (prelogin.kdf !== "pbkdf2") {
    throw new UnsupportedKdfVariantError(prelogin.kdf);
  }
  if (!Number.isInteger(prelogin.iterations) || prelogin.iterations <= 0) {
    throw new InvalidKdfIterationsError(prelogin.iterations);
  }
};

/**
 * Derives the Vaultwarden master password hash using the correct PBKDF2 flow:
 *
 * 1. masterKey  = PBKDF2-SHA256(password, email, iterations, 256-bit)
 * 2. masterHash = PBKDF2-SHA256(masterKey, password, 1, 256-bit)
 * 3. return base64(masterHash)
 *
 * This matches the Bitwarden/Vaultwarden web client derivation.
 */
export const deriveVaultPasswordHash = async (
  password: string,
  prelogin: VaultPrelogin
): Promise<string> => {
  assertSupportedPrelogin(prelogin);

  const enc = new TextEncoder();
  const passwordBytes = enc.encode(password);
  const saltBytes = enc.encode(prelogin.salt); // salt = email (lowercased by caller)

  // Import raw password bytes as PBKDF2 key material
  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  // Step 1: master key = PBKDF2(password, email, iterations, 256 bits)
  const masterKeyBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBytes,
      iterations: prelogin.iterations,
    },
    baseKey,
    256
  );
  const masterKeyBytes = new Uint8Array(masterKeyBits);

  // Step 2: master hash = PBKDF2(masterKey, password, 1 iteration, 256 bits)
  const masterKeyMaterial = await crypto.subtle.importKey(
    "raw",
    masterKeyBytes,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const masterHashBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: passwordBytes,
      iterations: 1,
    },
    masterKeyMaterial,
    256
  );

  // Step 3: base64-encode the result
  const masterHashBytes = new Uint8Array(masterHashBits);
  return btoa(String.fromCharCode(...masterHashBytes));
};
