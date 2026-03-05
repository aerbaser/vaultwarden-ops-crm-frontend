import assert from "node:assert/strict";
import test from "node:test";

import { deriveVaultPasswordHash } from "../../../lib/crypto/vaultwarden.ts";

test("deriveVaultPasswordHash rejects non-positive KDF iterations", async () => {
  await assert.rejects(
    deriveVaultPasswordHash("secret-password", {
      kdf: "pbkdf2",
      iterations: 0,
      salt: "salt-value"
    }),
    {
      name: "InvalidKdfIterationsError",
      code: "invalid_kdf_iterations"
    }
  );
});
