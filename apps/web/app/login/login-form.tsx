"use client";

import { useState, useTransition } from "react";
import { LogIn, UserPlus } from "lucide-react";

import { establishSupabaseSessionAction } from "../account-actions";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type LoginMode = "sign-in" | "sign-up";

export function LoginForm({ configured }: { configured: boolean }) {
  const [mode, setMode] = useState<LoginMode>("sign-in");
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function submit() {
    setMessage("");
    if (!configured) {
      setMessage("Supabase is not configured for this environment.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const result =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    const accessToken = result.data.session?.access_token;
    if (!accessToken) {
      setMessage("Check your email to confirm the account, then sign in.");
      return;
    }

    startTransition(() => {
      void establishSupabaseSessionAction(accessToken);
    });
  }

  return (
    <div className="auth-form">
      <div className="tab-row" role="tablist" aria-label="Authentication mode">
        <button
          className="tab-button"
          type="button"
          aria-selected={mode === "sign-in"}
          onClick={() => setMode("sign-in")}
        >
          <LogIn size={18} aria-hidden="true" />
          Sign in
        </button>
        <button
          className="tab-button"
          type="button"
          aria-selected={mode === "sign-up"}
          onClick={() => setMode("sign-up")}
        >
          <UserPlus size={18} aria-hidden="true" />
          Create account
        </button>
      </div>

      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={email}
        autoComplete="email"
        onChange={(event) => setEmail(event.target.value)}
      />
      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        value={password}
        autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
        onChange={(event) => setPassword(event.target.value)}
      />
      <button className="command-button" type="button" disabled={isPending} onClick={submit}>
        <LogIn size={18} aria-hidden="true" />
        {mode === "sign-in" ? "Continue" : "Create account"}
      </button>
      {message ? <p className="form-note">{message}</p> : null}
    </div>
  );
}
