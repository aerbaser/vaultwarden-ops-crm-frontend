import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as shareApi from "@/lib/api/endpoints/share";
import { ShareViewer } from "@/components/share/share-viewer";
import { useShareStore } from "@/lib/state/share-store";

describe("share viewer", () => {
  beforeEach(() => {
    useShareStore.getState().resetForTest();
    vi.restoreAllMocks();
  });

  it("renders active share metadata with ttl and views", async () => {
    vi.spyOn(shareApi, "fetchShareToken").mockResolvedValue({
      token: "token-1",
      status: "active",
      title: "CRM Login",
      content: "alice@example.com",
      ttlSeconds: 1800,
      remainingViews: 3
    });

    render(<ShareViewer token="token-1" />);

    await waitFor(() => {
      expect(screen.getByText("Status: active")).toBeInTheDocument();
      expect(screen.getByText("TTL: 1800s")).toBeInTheDocument();
      expect(screen.getByText("Remaining views: 3")).toBeInTheDocument();
    });
  });

  it.each([
    ["expired", "This share link has expired."],
    ["revoked", "This share link has been revoked."],
    ["exhausted", "This share link has no views remaining."],
    ["unavailable", "Share details are currently unavailable."]
  ] as const)("renders %s terminal message", async (status, message) => {
    vi.spyOn(shareApi, "fetchShareToken").mockResolvedValue({
      token: "token-2",
      status,
      title: "CRM Login"
    });

    render(<ShareViewer token="token-2" />);

    await waitFor(() => {
      expect(screen.getByText(`Status: ${status}`)).toBeInTheDocument();
      expect(screen.getByText(message)).toBeInTheDocument();
    });
  });
});
