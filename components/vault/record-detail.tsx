"use client";

import { DecryptedVaultRecord } from "@/lib/vault/decrypt";

type RecordDetailProps = {
  record: DecryptedVaultRecord | null;
  onCreateShare: (recordId: string) => Promise<void>;
  generatedShareUrl: string | null;
};

export function RecordDetail({ record, onCreateShare, generatedShareUrl }: RecordDetailProps) {
  if (!record) {
    return (
      <section className="route-card" data-testid="vault-record-detail">
        <h2>Record Detail</h2>
        <p>Select a record to inspect details.</p>
      </section>
    );
  }

  return (
    <section className="route-card" data-testid="vault-record-detail">
      <h2>Record Detail</h2>
      <h3>{record.title}</h3>
      <p>Type: {record.kind}</p>
      <p>Username: {String(record.content.username ?? "-")}</p>
      <button
        type="button"
        onClick={() => {
          void onCreateShare(record.id);
        }}
        data-testid="create-share-btn"
      >
        Create Share Link
      </button>
      {generatedShareUrl ? (
        <p data-testid="share-url">{generatedShareUrl}</p>
      ) : null}
    </section>
  );
}
