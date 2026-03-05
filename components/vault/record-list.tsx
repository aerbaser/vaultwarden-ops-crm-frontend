"use client";

import { DecryptedVaultRecord } from "@/lib/vault/decrypt";

type RecordListProps = {
  records: DecryptedVaultRecord[];
  selectedRecordId: string | null;
  decryptErrors: Record<string, string>;
  onSelectRecord: (recordId: string) => void;
};

export function RecordList({
  records,
  selectedRecordId,
  decryptErrors,
  onSelectRecord
}: RecordListProps) {
  return (
    <section className="route-card" data-testid="vault-record-list">
      <h2>Records</h2>
      {records.length === 0 ? <p>No records yet.</p> : null}
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {records.map((record) => (
          <li key={`${record.id}-${record.revision}`}>
            <button
              type="button"
              onClick={() => onSelectRecord(record.id)}
              style={{ fontWeight: selectedRecordId === record.id ? 700 : 500 }}
              data-testid={`record-row-${record.id}`}
            >
              {record.title}
            </button>
            {decryptErrors[record.id] ? (
              <p style={{ color: "var(--warning)" }}>{decryptErrors[record.id]}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
