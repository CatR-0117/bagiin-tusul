"use client";

import { Check, Eye, EyeOff, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

const profileSchema = z.object({ name: z.string().trim().min(2).max(60) });
const passwordSchema = z
  .object({ password: z.string().min(8), confirmPassword: z.string().min(8) })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export function AccountSettingsForm({
  initialName,
  email,
  isDemo,
}: {
  initialName: string;
  email: string;
  isDemo: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [profilePending, setProfilePending] = useState(false);
  const [passwordPending, setPasswordPending] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileMessage(null);
    setProfileError(null);
    const parsed = profileSchema.safeParse({ name });
    if (!parsed.success) {
      setProfileError("Display name must be between 2 and 60 characters.");
      return;
    }
    setProfilePending(true);
    try {
      if (isDemo) {
        const response = await fetch("/api/auth/demo/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: parsed.data.name }),
        });
        if (!response.ok) throw new Error("Profile could not be updated.");
      } else {
        const { error } = await createClient().auth.updateUser({
          data: { full_name: parsed.data.name },
        });
        if (error) throw error;
      }
      setProfileMessage("Profile updated.");
      router.refresh();
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Profile could not be updated.");
    } finally {
      setProfilePending(false);
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);
    const form = new FormData(event.currentTarget);
    const parsed = passwordSchema.safeParse({
      password: form.get("password"),
      confirmPassword: form.get("confirmPassword"),
    });
    if (!parsed.success) {
      setPasswordError(parsed.error.issues[0]?.message ?? "Use at least 8 characters.");
      return;
    }
    if (isDemo) {
      setPasswordMessage("Demo access has no password. Connect Supabase to manage a real account password.");
      event.currentTarget.reset();
      return;
    }
    setPasswordPending(true);
    const { error } = await createClient().auth.updateUser({ password: parsed.data.password });
    setPasswordPending(false);
    if (error) setPasswordError(error.message);
    else {
      setPasswordMessage("Password updated successfully.");
      event.currentTarget.reset();
    }
  }

  return (
    <div className="settings-sections">
      <form className="settings-card" onSubmit={updateProfile}>
        <div className="settings-card-heading">
          <span>01</span>
          <div><h2>Profile</h2><p>How you appear across the SnapAR workspace.</p></div>
        </div>
        <div className="settings-fields">
          <label htmlFor="display-name">Display name</label>
          <input id="display-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={60} />
          <label htmlFor="account-email">Email address</label>
          <input id="account-email" value={email} disabled />
          <small>Your email is managed by the sign-in provider.</small>
        </div>
        {profileError && <p className="form-error" role="alert">{profileError}</p>}
        {profileMessage && <p className="settings-success" role="status"><Check size={15} /> {profileMessage}</p>}
        <button className="button button-primary" type="submit" disabled={profilePending || name.trim() === initialName}>
          {profilePending ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
          {profilePending ? "Saving…" : "Save profile"}
        </button>
      </form>

      <form className="settings-card" onSubmit={updatePassword}>
        <div className="settings-card-heading">
          <span>02</span>
          <div><h2>Password</h2><p>Keep your account secure with a strong password.</p></div>
        </div>
        <div className="settings-fields password-fields">
          <label htmlFor="new-password">New password</label>
          <div className="password-input">
            <input id="new-password" name="password" type={showPasswords ? "text" : "password"} autoComplete="new-password" placeholder="At least 8 characters" required />
            <button type="button" onClick={() => setShowPasswords((value) => !value)} aria-label={showPasswords ? "Hide passwords" : "Show passwords"}>
              {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <label htmlFor="confirm-new-password">Confirm new password</label>
          <input id="confirm-new-password" name="confirmPassword" type={showPasswords ? "text" : "password"} autoComplete="new-password" placeholder="Repeat the new password" required />
        </div>
        {passwordError && <p className="form-error" role="alert">{passwordError}</p>}
        {passwordMessage && <p className="settings-success" role="status"><Check size={15} /> {passwordMessage}</p>}
        <button className="button button-secondary" type="submit" disabled={passwordPending}>
          {passwordPending ? <Loader2 className="spin" size={16} /> : null}
          {passwordPending ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

