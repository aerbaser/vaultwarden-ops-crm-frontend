import { render, screen } from "@testing-library/react";
import LoginPage from "@/app/login/page";
import VaultPage from "@/app/vault/page";
import AccessPage from "@/app/vault/[projectId]/[folderId]/access/page";
import SharePage from "@/app/share/[token]/page";
import OperationsPage from "@/app/operations/page";
import AuditPage from "@/app/audit/page";

describe("mvp route shells", () => {
  it("renders all MVP route shells with stable headings", () => {
    render(<LoginPage />);
    expect(
      screen.getByRole("heading", { name: "Sign In to Vault Ops CRM" })
    ).toBeInTheDocument();

    render(<VaultPage />);
    expect(
      screen.getByRole("heading", { name: "Vault Workspace" })
    ).toBeInTheDocument();

    render(
      <AccessPage
        params={{ projectId: "project-1", folderId: "folder-1" }}
      />
    );
    expect(
      screen.getByRole("heading", { name: "Access Designer" })
    ).toBeInTheDocument();

    render(<SharePage params={{ token: "share-token" }} />);
    expect(
      screen.getByRole("heading", { name: "Shared Record" })
    ).toBeInTheDocument();

    render(<OperationsPage />);
    expect(
      screen.getByRole("heading", { name: "Operations Board" })
    ).toBeInTheDocument();

    render(<AuditPage />);
    expect(
      screen.getByRole("heading", { name: "Audit Timeline" })
    ).toBeInTheDocument();
  });
});
