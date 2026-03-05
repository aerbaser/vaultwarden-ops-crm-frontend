"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/state/auth-store";
import { useAccessStore } from "@/lib/state/access-store";
import { AccessPermission } from "@/lib/api/endpoints/access";

type AccessDesignerProps = {
  projectId: string;
  folderId: string;
};

const permissions: AccessPermission[] = ["read", "write", "manage"];

export function AccessDesigner({ projectId, folderId }: AccessDesignerProps) {
  const csrfToken = useAuthStore((state) => state.csrfToken);
  const stagedRows = useAccessStore((state) => state.stagedRows);
  const loading = useAccessStore((state) => state.loading);
  const error = useAccessStore((state) => state.error);
  const rowWarnings = useAccessStore((state) => state.rowWarnings);
  const destructiveConfirmed = useAccessStore((state) => state.destructiveConfirmed);

  const load = useAccessStore((state) => state.load);
  const applyProfile = useAccessStore((state) => state.applyProfile);
  const updateRow = useAccessStore((state) => state.updateRow);
  const setDestructiveConfirmed = useAccessStore((state) => state.setDestructiveConfirmed);
  const apply = useAccessStore((state) => state.apply);
  const diff = useAccessStore((state) => state.getDiffPreview());

  useEffect(() => {
    void load(projectId, folderId);
  }, [folderId, load, projectId]);

  return (
    <section className="route-card" data-testid="access-designer">
      <p>
        Current vs Proposed Manage: <strong>{diff.currentManage}</strong> / <strong>{diff.proposedManage}</strong>
      </p>
      <p>
        Current vs Proposed Write: <strong>{diff.currentWrite}</strong> / <strong>{diff.proposedWrite}</strong>
      </p>

      <label htmlFor="profile-select">Permission profile</label>
      <select
        id="profile-select"
        onChange={(event) => applyProfile(event.target.value as "viewer" | "editor" | "manager")}
        data-testid="access-profile-select"
      >
        <option value="viewer">Viewer (read)</option>
        <option value="editor">Editor (write)</option>
        <option value="manager">Manager (manage)</option>
      </select>

      <table style={{ width: "100%", marginTop: "0.75rem" }}>
        <thead>
          <tr>
            <th align="left">Subject</th>
            <th align="left">Current</th>
            <th align="left">Proposed</th>
          </tr>
        </thead>
        <tbody>
          {stagedRows.map((row) => (
            <tr key={row.subjectId}>
              <td>{row.subjectName}</td>
              <td>{row.current}</td>
              <td>
                <select
                  value={row.proposed}
                  onChange={(event) =>
                    updateRow(row.subjectId, event.target.value as AccessPermission)
                  }
                  data-testid={`access-row-${row.subjectId}`}
                >
                  {permissions.map((permission) => (
                    <option key={permission} value={permission}>
                      {permission}
                    </option>
                  ))}
                </select>
                {rowWarnings[row.subjectId] ? (
                  <p style={{ color: "var(--warning)", margin: "0.25rem 0 0" }}>
                    {rowWarnings[row.subjectId]}
                  </p>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <label style={{ display: "inline-flex", gap: "0.5rem", marginTop: "0.9rem" }}>
        <input
          type="checkbox"
          checked={destructiveConfirmed}
          onChange={(event) => setDestructiveConfirmed(event.target.checked)}
          data-testid="access-confirm-destructive"
        />
        I confirm destructive permission reductions
      </label>

      {error ? (
        <p role="alert" style={{ color: "var(--danger)" }} data-testid="access-error">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => {
          void apply(projectId, folderId, csrfToken ?? undefined);
        }}
        disabled={loading}
        data-testid="access-apply-btn"
      >
        {loading ? "Applying..." : "Apply access changes"}
      </button>
    </section>
  );
}
