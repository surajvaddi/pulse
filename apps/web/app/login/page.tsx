import Link from "next/link";
import { LogIn, ShieldCheck } from "lucide-react";

import { startDemoSessionAction } from "../account-actions";
import { demoUsers } from "@/lib/api";
import { isSupabaseConfigured, supabaseConfig } from "@/lib/supabase";

export default function LoginPage() {
  const configured = isSupabaseConfigured();

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-copy">
          <p className="eyebrow">PulseShift Accounts</p>
          <h1>Sign in to your workforce workspace.</h1>
          <p>
            Use Supabase Auth for production accounts. Demo mode stays available locally while
            account creation, invites, and role-gated sessions are wired into the app.
          </p>
          <div className="risk-strip">
            {configured
              ? `Supabase configured for ${supabaseConfig.url}`
              : "Supabase environment values are not set in this local session."}
          </div>
        </div>

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
            <LogIn size={18} aria-hidden="true" />
            Continue
          </button>
          <Link className="command-button" href="/onboarding/organization">
            <ShieldCheck size={18} aria-hidden="true" />
            Admin onboarding
          </Link>
        </form>
      </section>
    </main>
  );
}
