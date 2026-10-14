"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { submitQuestionnaire } from "@/app/match/actions";
import type { Answers } from "@/lib/match-schema";
import { EMPTY_ANSWERS, STEPS } from "@/lib/questionnaire";

const KEY = "awdopt-match";
/** Name, phone and email kept for this tab after submit, to prefill "I'm Interested". Never sent to /r pages. */
export const CONTACT_KEY = "awdopt-contact";
/** Long enough for the 8 category ticks (120ms apart) to land before the results replace the screen. */
const MIN_MATCHING_MS = 1300;

// zod and the schema load on the first validation (first blur or "Next"), not with the page.
const resolver: Resolver<Answers> = async (...args) => {
  const [{ zodResolver }, { questionnaireSchema }] = await Promise.all([
    import("@hookform/resolvers/zod"),
    import("@/lib/match-schema"),
  ]);
  return zodResolver(questionnaireSchema)(...args);
};

/** "matching": the matching screen is up while the answers save and the results load. */
type Status = "idle" | "matching";

type Ctx = {
  form: UseFormReturn<Answers>;
  checkStep: (slug: string) => Promise<boolean>;
  status: Status;
  error?: string;
  setToken: (t: string | null) => void;
  turnstileKey: number;
  submit: () => void;
  /** Bumps once saved answers are restored, so the step's inputs re-mount showing them. */
  restored: number;
};

const QuizContext = createContext<Ctx | null>(null);
export const useQuiz = () => useContext(QuizContext)!;

/** Holds the 5-step questionnaire across /match/* navigations (this sits in the /match layout). */
export function QuizProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const form = useForm<Answers>({
    resolver,
    defaultValues: EMPTY_ANSWERS as unknown as Answers,
    mode: "onTouched",
  });
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>();
  const [token, setToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [restored, setRestored] = useState(0);
  const [, startTransition] = useTransition();
  const done = useRef(false);

  // Answers survive a refresh (sessionStorage, this tab only) until submit. Consent never does.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
      if (saved && typeof saved === "object") {
        form.reset({ ...EMPTY_ANSWERS, ...saved, consent: false } as Answers);
        // One-time sync from sessionStorage after hydration (the server can't read it); radios
        // only show restored answers once re-mounted.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRestored(1);
      }
    } catch {}
    return form.subscribe({
      formState: { values: true },
      callback: ({ values }) => {
        if (done.current) return;
        try {
          sessionStorage.setItem(KEY, JSON.stringify({ ...values, consent: false }));
        } catch {}
      },
    });
  }, [form]);

  const checkStep = (slug: string) => {
    const step = STEPS.find((s) => s.slug === slug)!;
    return form.trigger([...step.fields], { shouldFocus: true });
  };

  const submit = () =>
    form.handleSubmit(
      async (values) => {
        if (!token) {
          setError("Please complete the check above the button.");
          return;
        }
        setError(undefined);
        setStatus("matching");
        const started = Date.now();
        const res = await submitQuestionnaire(values, token).catch(() => null);
        setTurnstileKey((k) => k + 1); // tokens are single use
        if (!res?.ok) {
          setStatus("idle");
          setError(res?.error ?? "Something went wrong saving your answers. Please try again.");
          if (res?.field) {
            form.setError(res.field, { message: "Check the phone number" });
            router.push("/match/basic");
          }
          return;
        }
        done.current = true;
        try {
          sessionStorage.removeItem(KEY);
          sessionStorage.setItem(
            CONTACT_KEY,
            JSON.stringify({ name: values.name, phone: values.phone, email: values.email }),
          );
        } catch {}
        const url = `/r/${res.token}`;
        router.prefetch(url);
        // The matching screen stays up until the results have rendered (replace: Back skips it).
        const wait = Math.max(0, MIN_MATCHING_MS - (Date.now() - started));
        setTimeout(() => startTransition(() => router.replace(url)), wait);
      },
      (errors) => {
        // Jump back to the first step with a problem.
        const step = STEPS.find((s) => s.fields.some((f) => f in errors));
        if (step && step.slug !== "intent") router.push(`/match/${step.slug}`);
      },
    )();

  const value: Ctx = { form, checkStep, status, error, setToken, turnstileKey, submit, restored };
  return <QuizContext value={value}>{children}</QuizContext>;
}
