import type { Metadata } from "next";
import { signIn } from "@/app/admin/auth-actions";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/States";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

// Calm zone: no tilt, no sparkles, plain copy. Works without JavaScript.
export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-[400px] flex-col justify-center gap-6 px-4 py-10">
      <Logo size={26} />
      <h1 className="font-display text-[26px] leading-[1.1] font-extrabold tracking-[-0.035em]">Admin sign in</h1>
      {error && <ErrorState>Email or password is wrong, or this account isn&rsquo;t an admin.</ErrorState>}
      <form action={signIn} className="flex flex-col gap-4">
        <Input label="Email" id="email" name="email" type="email" autoComplete="username" required maxLength={254} />
        <Input
          label="Password"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
        />
        <Button type="submit">Sign in</Button>
      </form>
      <p className="text-sm text-muted">After your password you&rsquo;ll enter a code from your authenticator app.</p>
    </main>
  );
}
