"use client";

import { useActionState, useState, useTransition } from "react";
import { enrollTotp, verifyTotp, type MfaState } from "@/app/admin/auth-actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/States";

/** Enrol (first time: QR + secret) or verify a TOTP code. The QR stays on screen across wrong codes. */
export function MfaForm({ factorId }: { factorId?: string }) {
  const [enrolled, setEnrolled] = useState<MfaState>({ factorId });
  const [state, verify, verifying] = useActionState(verifyTotp, enrolled);
  const [starting, start] = useTransition();
  const current = { ...enrolled, ...state, factorId: enrolled.factorId };

  if (!current.factorId) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-base">
          Set up an authenticator app (Google Authenticator, 1Password, Authy…). You&rsquo;ll need it every time you
          sign in.
        </p>
        {current.error && <ErrorState>{current.error}</ErrorState>}
        <Button disabled={starting} onClick={() => start(async () => setEnrolled(await enrollTotp()))}>
          {starting ? "Starting…" : "Set up authenticator app"}
        </Button>
      </div>
    );
  }

  return (
    <form action={verify} className="flex flex-col gap-4">
      {current.qr && (
        <div className="flex flex-col gap-3">
          <p className="text-base">Scan this code with your authenticator app, then enter the 6-digit code it shows.</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- data: SVG from Supabase Auth */}
          <img
            src={current.qr}
            alt="QR code for your authenticator app"
            width={200}
            height={200}
            className="rounded-[16px] border-2 border-ink bg-surface p-2"
          />
          <p className="text-sm text-muted">
            Can&rsquo;t scan? Enter this key:{" "}
            <code className="font-bold break-all text-ink" data-testid="totp-secret">
              {current.secret}
            </code>
          </p>
        </div>
      )}
      <input type="hidden" name="factorId" value={current.factorId} />
      {current.error && <ErrorState>{current.error}</ErrorState>}
      <Input
        label="6-digit code"
        id="code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]{6,7}"
        maxLength={7}
        required
      />
      <Button type="submit" disabled={verifying}>
        {verifying ? "Checking…" : "Verify"}
      </Button>
    </form>
  );
}
