import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { startDemoSessionAction } from "../account-actions";
import { demoAuthEnabled, demoUsers } from "@/lib/api";
import { isSupabaseConfigured, supabaseConfig } from "@/lib/supabase";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const configured = isSupabaseConfigured();

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-copy">
          <p className="eyebrow">PulseShift Accounts</p>
          <h1>Sign in to your workforce workspace.</h1>
          <p>Use Supabase Auth for production accounts, invitations, and role-gated sessions.</p>
          <div className="risk-strip">
            {configured
              ? `Supabase configured for ${supabaseConfig.url}`
              : "Supabase environment values are not set in this local session."}
          </div>
        </div>

        <LoginForm configured={configured} />

        {demoAuthEnabled ? (
          <form action={startDemoSessionAction} className="auth-form">
            <label htmlFor="userId">Demo identity</label>
            <select id="userId" name="userId" defaultValue="user_priya">
              {demoUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.label} - {user.role}
                </option>
              ))}
            </select>
            <button className="command-button" type="submit">
              Continue as demo user
            </button>
            <Link className="command-button" href="/onboarding/organization">
              <ShieldCheck size={18} aria-hidden="true" />
              Admin onboarding
            </Link>
          </form>
        ) : null}
      </section>
    </main>
  );
}
