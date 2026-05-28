"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";

import { acceptInvitationAction } from "../../account-actions";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function AcceptInviteForm({ token }: { token: string }) {
  const [accessToken, setAccessToken] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getSession().then(({ data }) => {
      setAccessToken(data.session?.access_token ?? "");
      setEmail(data.session?.user.email ?? "");
    });
  }, []);

  return (
    <form action={acceptInvitationAction} className="auth-form">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="accessToken" value={accessToken} />
      <p className="form-note">
        {email ? `Signed in as ${email}` : "Sign in on the login page before accepting."}
      </p>
      <button className="command-button" type="submit" disabled={!accessToken}>
        <UserPlus size={18} aria-hidden="true" />
        Accept invite
      </button>
    </form>
  );
}
