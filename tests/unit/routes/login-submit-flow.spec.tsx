import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/auth/login-form";
import { useAuthStore } from "@/lib/state/auth-store";

describe("login form submit flow", () => {
  beforeEach(() => {
    useAuthStore.getState().resetForTest();
  });

  it("submits credentials via auth store", async () => {
    const loginSpy = vi.fn().mockResolvedValue(true);
    useAuthStore.setState({ login: loginSpy, phase: "idle", error: null });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" }
    });
    fireEvent.change(screen.getByLabelText("Master Password"), {
      target: { value: "password123" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith("user@example.com", "password123");
    });
  });

  it("disables submit while authentication is in progress", () => {
    useAuthStore.setState({ phase: "derivingKey" });

    render(<LoginForm />);

    expect(screen.getByRole("button", { name: "Signing in..." })).toBeDisabled();
  });
});
