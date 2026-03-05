"use client";

import { useEffect } from "react";
import { useShareStore } from "@/lib/state/share-store";

type ShareViewerProps = {
  token: string;
};

const terminalStateCopy: Record<string, string> = {
  expired: "This share link has expired.",
  revoked: "This share link has been revoked.",
  exhausted: "This share link has no views remaining.",
  unavailable: "Share details are currently unavailable."
};

const nextActionHint: Record<string, string> = {
  expired: "Request a new link from the owner.",
  revoked: "Contact the owner if access is still required.",
  exhausted: "Ask the owner to increase view limits or regenerate the share.",
  unavailable: "Retry shortly or contact support if this persists."
};

export function ShareViewer({ token }: ShareViewerProps) {
  const status = useShareStore((state) => state.status);
  const metadata = useShareStore((state) => state.metadata);
  const loading = useShareStore((state) => state.loading);
  const load = useShareStore((state) => state.load);

  useEffect(() => {
    void load(token);
  }, [load, token]);

  return (
    <section className="route-card" data-testid="share-viewer">
      {loading ? <p>Loading share data...</p> : null}
      <p data-testid="share-status">Status: {status}</p>

      {status === "active" && metadata ? (
        <>
          <p>{metadata.title}</p>
          <p>{metadata.content}</p>
          <p>TTL: {metadata.ttlSeconds ?? 0}s</p>
          <p>Remaining views: {metadata.remainingViews ?? 0}</p>
        </>
      ) : null}

      {status !== "active" && status !== "loading" ? (
        <>
          <p>{terminalStateCopy[status] ?? "Share status unavailable."}</p>
          <p>{nextActionHint[status] ?? "Retry later."}</p>
        </>
      ) : null}
    </section>
  );
}
