/**
 * Bitwarden/Vaultwarden client-side crypto
 *
 * Key derivation flow:
 * 1. masterKey  = PBKDF2(password, email, iterations, SHA-256, 256-bit)
 * 2. loginHash  = PBKDF2(masterKey, password, 1, SHA-256) → base64  ← sent to server
 * 3. stretchKey = HKDF-Expand(masterKey, "enc", 32) || HKDF-Expand(masterKey, "mac", 32)  ← 64 bytes
 * 4. userKey    = AES-CBC-Decrypt(Profile.Key, stretchKey.enc)  ← 64 bytes
 * 5. cipherPt   = AES-CBC-Decrypt(cipher.Field, userKey.enc)
 *
 * HKDF-Expand is the RFC 5869 Expand step ONLY (no Extract).
 * The masterKey is treated directly as PRK.
 */

const enc = new TextEncoder();

/** Parse "2.iv_b64|ct_b64|mac_b64" → {iv, ct} */
function parseCipherString(cs: string): { iv: Uint8Array; ct: Uint8Array } | null {
  if (!cs || typeof cs !== 'string') return null;
  const dot = cs.indexOf('.');
  const rest = dot >= 0 ? cs.slice(dot + 1) : cs;
  const parts = rest.split('|');
  if (parts.length < 2) return null;
  try {
    const b = (s: string) => {
      const bin = atob(s);
      const a = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
      return a;
    };
    return { iv: b(parts[0]), ct: b(parts[1]) };
  } catch { return null; }
}

/** HKDF-Expand only (RFC 5869 §2.3) — prk treated as pseudorandom key directly */
async function hkdfExpand(prk: Uint8Array, info: string, outputLen: number): Promise<Uint8Array> {
  const hashLen = 32; // SHA-256
  const n = Math.ceil(outputLen / hashLen);
  const okm = new Uint8Array(n * hashLen);
  let prevT = new Uint8Array(0);
  const infoArr = enc.encode(info);
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

  for (let i = 0; i < n; i++) {
    const t = new Uint8Array(prevT.length + infoArr.length + 1);
    t.set(prevT, 0);
    t.set(infoArr, prevT.length);
    t[prevT.length + infoArr.length] = i + 1;
    const mac = await crypto.subtle.sign('HMAC', prkKey, t);
    prevT = new Uint8Array(mac);
    okm.set(prevT, i * hashLen);
  }
  return okm.slice(0, outputLen);
}

/** Derive 32-byte master key via PBKDF2(password, email, iterations, SHA-256) */
export async function deriveMasterKey(email: string, password: string, kdfIterations: number): Promise<Uint8Array> {
  const km = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(email.toLowerCase()), iterations: kdfIterations, hash: 'SHA-256' },
    km, 256
  );
  return new Uint8Array(bits);
}

/** Derive login hash = PBKDF2(masterKey, password, 1, SHA-256) → base64. Sent to Vaultwarden. */
export async function deriveLoginKey(email: string, password: string, kdfIterations: number): Promise<string> {
  const masterKey = await deriveMasterKey(email, password, kdfIterations);
  const mk = await crypto.subtle.importKey('raw', masterKey, 'PBKDF2', false, ['deriveBits']);
  const hashBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(password), iterations: 1, hash: 'SHA-256' },
    mk, 256
  );
  const bytes = new Uint8Array(hashBits);
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
}

/** Stretch 32-byte master key → 64-byte key using HKDF-Expand */
async function stretchMasterKey(masterKey: Uint8Array): Promise<Uint8Array> {
  const encKeyBytes = await hkdfExpand(masterKey, 'enc', 32);
  const macKeyBytes = await hkdfExpand(masterKey, 'mac', 32);
  const out = new Uint8Array(64);
  out.set(encKeyBytes, 0);
  out.set(macKeyBytes, 32);
  return out;
}

/** AES-256-CBC decrypt using first 32 bytes of symKey */
async function aesDecrypt(symKey: Uint8Array, cipherStr: string): Promise<ArrayBuffer> {
  const parsed = parseCipherString(cipherStr);
  if (!parsed) throw new Error('Invalid cipher string');
  const aesKey = await crypto.subtle.importKey('raw', symKey.slice(0, 32), 'AES-CBC', false, ['decrypt']);
  return crypto.subtle.decrypt({ name: 'AES-CBC', iv: parsed.iv }, aesKey, parsed.ct);
}

/**
 * Decrypt Profile.Key (encrypted user symmetric key) using master key.
 * Returns 64-byte user symmetric key.
 */
export async function decryptProfileKey(profileKeyStr: string, masterKey: Uint8Array): Promise<Uint8Array> {
  const stretched = await stretchMasterKey(masterKey);
  const pt = await aesDecrypt(stretched, profileKeyStr);
  return new Uint8Array(pt);
}

/**
 * Decrypt a vault cipher field using the 64-byte user symmetric key.
 * Returns plaintext string, or '' on failure.
 */
export async function decryptField(cipherStr: string, symKey: Uint8Array): Promise<string> {
  if (!cipherStr || !symKey?.length) return '';
  try {
    const pt = await aesDecrypt(symKey, cipherStr);
    return new TextDecoder().decode(pt);
  } catch { return ''; }
}
