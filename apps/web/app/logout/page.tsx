import { LogOut } from "lucide-react";

import { logoutAction } from "../account-actions";

export default function LogoutPage() {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-copy">
          <p className="eyebrow">Account</p>
          <h1>End this session.</h1>
          <p>Signing out clears the current app session and returns you to account selection.</p>
        </div>
        <form action={logoutAction} className="auth-form">
          <button className="command-button" type="submit">
            <LogOut size={18} aria-hidden="true" />
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
