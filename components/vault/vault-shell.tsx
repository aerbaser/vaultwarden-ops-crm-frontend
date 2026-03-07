"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createShareToken } from "@/lib/api/endpoints/share";
import { useAuthStore } from "@/lib/state/auth-store";
import { useVaultStore } from "@/lib/state/vault-store";
import { createDecryptedCacheKey } from "@/lib/vault/decrypt";
import { ProjectTree } from "@/components/vault/project-tree";
import { RecordList } from "@/components/vault/record-list";
import { RecordDetail } from "@/components/vault/record-detail";

function typeLabel(t: number): string {
  return t === 1 ? "Login" : t === 2 ? "Note" : t === 3 ? "Card" : t === 4 ? "Identity" : "Item";
}

export function VaultShell() {
  const csrfToken = useAuthStore((state) => state.csrfToken);
  const vaultCiphers = useAuthStore((state) => state.ciphers);
  const projects = useVaultStore((state) => state.projects);
  const folders = useVaultStore((state) => state.folders);
  const records = useVaultStore((state) => state.records);
  const decryptedCache = useVaultStore((state) => state.decryptedCache);
  const decryptErrors = useVaultStore((state) => state.decryptErrors);
  const selectedProjectId = useVaultStore((state) => state.selectedProjectId);
  const selectedFolderId = useVaultStore((state) => state.selectedFolderId);
  const selectedRecordId = useVaultStore((state) => state.selectedRecordId);
  const loading = useVaultStore((state) => state.loading);
  const error = useVaultStore((state) => state.error);

  const hydrateSummary = useVaultStore((state) => state.hydrateSummary);
  const createProjectAction = useVaultStore((state) => state.createProjectAction);
  const createFolderAction = useVaultStore((state) => state.createFolderAction);
  const selectProject = useVaultStore((state) => state.selectProject);
  const selectFolder = useVaultStore((state) => state.selectFolder);
  const selectRecord = useVaultStore((state) => state.selectRecord);
  const syncFolder = useVaultStore((state) => state.syncFolder);
  const createMinimalRecord = useVaultStore((state) => state.createMinimalRecord);
  const buildSharePayload = useVaultStore((state) => state.buildSharePayload);

  const [recordTitle, setRecordTitle] = useState("");
  const [recordKind, setRecordKind] = useState<"login" | "card">("login");
  const [username, setUsername] = useState("");
  const [secret, setSecret] = useState("");
  const [generatedShareUrl, setGeneratedShareUrl] = useState<string | null>(null);

  useEffect(() => {
    void hydrateSummary();
  }, [hydrateSummary]);

  const decryptedRecords = useMemo(() => {
    return records
      .map((record) => decryptedCache[createDecryptedCacheKey(record.id, record.revision)])
      .filter(Boolean);
  }, [decryptedCache, records]);

  const selectedRecord = useMemo(() => {
    return decryptedRecords.find((record) => record.id === selectedRecordId) ?? null;
  }, [decryptedRecords, selectedRecordId]);

  const submitRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFolderId || !recordTitle.trim()) {
      return;
    }

    await createMinimalRecord(
      {
        folderId: selectedFolderId,
        kind: recordKind,
        title: recordTitle.trim(),
        username: username.trim(),
        secret: secret.trim()
      },
      csrfToken ?? undefined
    );

    setRecordTitle("");
    setUsername("");
    setSecret("");
  };

  const runSync = async () => {
    if (!selectedFolderId) {
      return;
    }
    await syncFolder(selectedFolderId, "memory-only-key");
  };

  const createShare = async (recordId: string) => {
    const payload = buildSharePayload(recordId);

    if (process.env.NEXT_PUBLIC_E2E_MODE === "true") {
      setGeneratedShareUrl(`/share/test-share-token`);
      return;
    }

    const response = await createShareToken(payload, csrfToken ?? undefined);
    setGeneratedShareUrl(response.url);
  };

  return (
    <section data-testid="vault-shell">
      <div style={{ marginBottom: "0.9rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="button" onClick={() => void runSync()} data-testid="sync-folder-btn">
          Sync Selected Folder
        </button>
        {loading ? <span data-testid="vault-loading">Syncing...</span> : null}
        {error ? (
          <span style={{ color: "var(--danger)" }} data-testid="vault-error">
            {error}
          </span>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          gap: "0.9rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))"
        }}
      >
        <ProjectTree
          projects={projects}
          folders={folders}
          selectedProjectId={selectedProjectId}
          selectedFolderId={selectedFolderId}
          onSelectProject={selectProject}
          onSelectFolder={selectFolder}
          onCreateProject={(name) => createProjectAction(name, csrfToken ?? undefined)}
          onCreateFolder={(projectId, name) =>
            createFolderAction(projectId, name, csrfToken ?? undefined)
          }
        />

        <section className="route-card">
          <h2>Create Record</h2>
          <form onSubmit={submitRecord} style={{ display: "grid", gap: "0.5rem" }}>
            <input
              aria-label="Record title"
              value={recordTitle}
              onChange={(event) => setRecordTitle(event.target.value)}
              placeholder="Record title"
              data-testid="record-title-input"
            />
            <select
              aria-label="Record type"
              value={recordKind}
              onChange={(event) => setRecordKind(event.target.value as "login" | "card")}
              data-testid="record-kind-select"
            >
              <option value="login">Login</option>
              <option value="card">Card</option>
            </select>
            <input
              aria-label="Record username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Username"
              data-testid="record-username-input"
            />
            <input
              aria-label="Record secret"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="Password or card number"
              data-testid="record-secret-input"
            />
            <button type="submit" disabled={!selectedFolderId} data-testid="create-record-btn">
              Create Record
            </button>
          </form>
        </section>

        <RecordList
          records={decryptedRecords}
          selectedRecordId={selectedRecordId}
          decryptErrors={decryptErrors}
          onSelectRecord={selectRecord}
        />

        <RecordDetail
          record={selectedRecord}
          onCreateShare={createShare}
          generatedShareUrl={generatedShareUrl}
        />
      </div>

      {vaultCiphers.length > 0 && (
        <section className="route-card" style={{ marginTop: "1.5rem" }} data-testid="vault-ciphers">
          <h2>Vault Items ({vaultCiphers.length})</h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
            Decrypted from Vaultwarden
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.5rem" }}>
            {vaultCiphers.map((cipher) => (
              <li
                key={cipher.id}
                style={{
                  padding: "0.6rem 0.9rem",
                  background: "var(--surface-2, #f5f5f5)",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem"
                }}
              >
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    background: "var(--accent, #2563eb)",
                    color: "#fff",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    minWidth: "42px",
                    textAlign: "center"
                  }}
                >
                  {typeLabel(cipher.type)}
                </span>
                <span style={{ fontWeight: 500 }}>{cipher.name || "(no name)"}</span>
                {cipher.username ? (
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {cipher.username}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
