import { VaultRecord } from "@/lib/api/types";

export type DecryptedVaultRecord = VaultRecord & {
  content: {
    username?: string;
    secret?: string;
    [key: string]: unknown;
  };
};

export type DecryptIssue = {
  recordId: string;
  message: string;
};

export const createDecryptedCacheKey = (recordId: string, revision: number): string =>
  `${recordId}:${revision}`;

const decodePayload = (encryptedPayload: string): Record<string, unknown> => {
  const decoded = atob(encryptedPayload);
  const parsed = JSON.parse(decoded);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid payload");
  }

  return parsed as Record<string, unknown>;
};

export const decryptRecord = async (
  record: VaultRecord,
  _memoryOnlyKey: string
): Promise<DecryptedVaultRecord> => {
  try {
    const content = decodePayload(record.encryptedPayload);

    return {
      ...record,
      content
    };
  } catch {
    throw new Error("Unable to decrypt record");
  }
};

export const decryptRecords = async (
  records: VaultRecord[],
  memoryOnlyKey: string
): Promise<{ records: DecryptedVaultRecord[]; errors: DecryptIssue[] }> => {
  const decrypted: DecryptedVaultRecord[] = [];
  const errors: DecryptIssue[] = [];

  for (const record of records) {
    try {
      const next = await decryptRecord(record, memoryOnlyKey);
      decrypted.push(next);
    } catch (error: unknown) {
      errors.push({
        recordId: record.id,
        message: error instanceof Error ? error.message : "Unable to decrypt record"
      });
    }
  }

  return {
    records: decrypted,
    errors
  };
};
