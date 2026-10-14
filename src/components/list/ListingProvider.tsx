"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { submitListing } from "@/app/list/actions";
import type { ProcessedPhoto } from "@/lib/images";
import { EMPTY_LISTING, MAX_PHOTOS, STEPS, type ListingValues } from "@/lib/listing";

const KEY = "awdopt-listing";

// zod and the schema load on the first validation (first blur or "Next"), not with the page.
const resolver: Resolver<ListingValues> = async (...args) => {
  const [{ zodResolver }, { listingSchema }] = await Promise.all([
    import("@hookform/resolvers/zod"),
    import("@/lib/listing-schema"),
  ]);
  return zodResolver(listingSchema)(...args);
};
type Upload = { url: string; blob: Blob };
type Status = "idle" | "sending" | "uploading";

type Ctx = {
  form: UseFormReturn<ListingValues>;
  photos: ProcessedPhoto[];
  photoError?: string;
  photosBusy: boolean;
  addPhotos: (files: File[]) => void;
  removePhoto: (i: number) => void;
  /** Validates one step; for "dog" also requires at least one photo. */
  checkStep: (slug: string) => Promise<boolean>;
  status: Status;
  error?: string;
  progress: string;
  failedUploads: number;
  setToken: (t: string | null) => void;
  token: string | null;
  turnstileKey: number;
  submit: () => void;
  retryUploads: () => void;
  submitted: { name: string; preview?: string } | null;
};

const ListingContext = createContext<Ctx | null>(null);
export const useListing = () => useContext(ListingContext)!;

/** Holds the 5-step listing across /list/* navigations (this sits in the /list layout). */
export function ListingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const form = useForm<ListingValues>({
    resolver,
    defaultValues: EMPTY_LISTING as unknown as ListingValues,
    mode: "onTouched",
  });
  const [photos, setPhotos] = useState<ProcessedPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string>();
  const [photosBusy, setPhotosBusy] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [submitted, setSubmitted] = useState<Ctx["submitted"]>(null);
  const [failed, setFailed] = useState<Upload[]>([]);

  // Text answers survive a refresh (sessionStorage, this tab only). Photos can't; consent never does.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
      if (saved && typeof saved === "object")
        form.reset({ ...EMPTY_LISTING, ...saved, consent: false } as ListingValues);
    } catch {}
    return form.subscribe({
      formState: { values: true },
      callback: ({ values }) => {
        try {
          sessionStorage.setItem(KEY, JSON.stringify({ ...values, consent: false }));
        } catch {}
      },
    });
  }, [form]);

  // Photos live in memory only: warn before a reload or close would lose them.
  useEffect(() => {
    if (!photos.length) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [photos.length]);

  const addPhotos = useCallback(async (files: File[]) => {
    setPhotosBusy(true);
    setPhotoError(undefined);
    // Loaded on first use: only step 2 needs the resize pipeline.
    const { processPhoto } = await import("@/lib/images");
    for (const file of files) {
      try {
        const p = await processPhoto(file);
        setPhotos((list) => (list.length < MAX_PHOTOS ? [...list, p] : list));
      } catch (e) {
        setPhotoError(e instanceof Error ? e.message : "We couldn't use that photo.");
      }
    }
    setPhotosBusy(false);
  }, []);

  const removePhoto = useCallback((i: number) => {
    setPhotos((list) => {
      URL.revokeObjectURL(list[i]!.preview);
      return list.filter((_, j) => j !== i);
    });
  }, []);

  const checkStep = async (slug: string) => {
    const step = STEPS.find((s) => s.slug === slug)!;
    const ok = await form.trigger([...step.fields], { shouldFocus: true });
    if (slug === "dog" && photos.length === 0) {
      setPhotoError("Add at least one photo of the dog.");
      return false;
    }
    return ok;
  };

  const upload = async (items: Upload[]) => {
    setStatus("uploading");
    const failures: Upload[] = [];
    let done = 0;
    setProgress(`Uploading photos 0 of ${items.length}`);
    // A few at a time: fast on good connections, kind to slow ones.
    for (let i = 0; i < items.length; i += 3) {
      await Promise.all(
        items.slice(i, i + 3).map(async (item) => {
          const res = await fetch(item.url, {
            method: "PUT",
            headers: { "Content-Type": item.blob.type, "Cache-Control": "max-age=31536000" },
            body: item.blob,
          }).catch(() => null);
          if (!res?.ok) failures.push(item);
          setProgress(`Uploading photos ${++done} of ${items.length}`);
        }),
      );
    }
    setFailed(failures);
    if (failures.length) {
      setStatus("idle");
      setError("Some photos didn't upload. Check your connection and try again.");
      return;
    }
    const name = form.getValues("name");
    setSubmitted({ name, preview: photos[0]?.preview });
    try {
      sessionStorage.removeItem(KEY);
    } catch {}
    setPhotos([]);
    form.reset(EMPTY_LISTING as unknown as ListingValues);
    setStatus("idle");
    router.push("/list/submitted");
  };

  const submit = () =>
    form.handleSubmit(
      async (values) => {
        if (!photos.length) {
          setPhotoError("Add at least one photo of the dog.");
          router.push("/list/dog");
          return;
        }
        if (!token) {
          setError("Please complete the check above the button.");
          return;
        }
        setError(undefined);
        setStatus("sending");
        const res = await submitListing(
          values,
          photos.map(({ width, height, ext }) => ({ width, height, ext })),
          token,
        ).catch(() => null);
        setTurnstileKey((k) => k + 1); // tokens are single use
        if (!res?.ok) {
          setStatus("idle");
          setError(res?.error ?? "Something went wrong sending the listing. Please try again.");
          if (res?.field) {
            form.setError(res.field, { message: "Check the phone number" });
            router.push("/list/you");
          }
          return;
        }
        await upload(res.uploads.flatMap((sizes, i) => sizes.map((url, j) => ({ url, blob: photos[i]!.blobs[j]! }))));
      },
      (errors) => {
        // Jump back to the first step with a problem.
        const step = STEPS.find((s) => s.fields.some((f) => f in errors));
        if (step && step.slug !== "details") router.push(`/list/${step.slug}`);
      },
    )();

  const value: Ctx = {
    form,
    photos,
    photoError,
    photosBusy,
    addPhotos,
    removePhoto,
    checkStep,
    status,
    error,
    progress,
    failedUploads: failed.length,
    setToken,
    token,
    turnstileKey,
    submit,
    retryUploads: () => upload(failed),
    submitted,
  };
  return <ListingContext value={value}>{children}</ListingContext>;
}
