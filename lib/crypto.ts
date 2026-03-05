export async function deriveLoginKey(email: string, password: string, kdfIterations: number): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const masterKeyBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(email.toLowerCase()), iterations: kdfIterations, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const masterKey = new Uint8Array(masterKeyBits);
  const hmacKey = await crypto.subtle.importKey('raw', masterKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const hashBuf = await crypto.subtle.sign('HMAC', hmacKey, enc.encode(`${email}${password}`));
  return btoa(Array.from(new Uint8Array(hashBuf), b => String.fromCharCode(b)).join(''));
}
