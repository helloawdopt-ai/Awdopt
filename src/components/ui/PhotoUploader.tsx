"use client";

import { LoaderCircle, Plus, X } from "lucide-react";
import { useRef } from "react";
import { FieldError } from "./Field";

type Props = {
  /** Object URLs of the processed (EXIF-free) previews. */
  previews: string[];
  max?: number;
  onAdd?: (files: File[]) => void;
  onRemove?: (index: number) => void;
  busy?: boolean;
  error?: string;
};

/** DESIGN.md §7: 3-column grid of 100px slots, × to remove, dashed "+ Add" slot. */
export function PhotoUploader({ previews, max = 6, onAdd, onRemove, busy, error }: Props) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <span id="photos-label" className="text-[15px] font-extrabold">
        Photos <span className="font-medium text-muted">· 1 to {max}</span>
      </span>
      <ul aria-labelledby="photos-label" className="grid grid-cols-3 gap-2">
        {previews.map((url, i) => (
          <li key={url} className="relative h-[100px] rounded-[16px] border-[2.5px] border-ink">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={url} alt={`Photo ${i + 1}`} className="size-full rounded-[13px] object-cover" />
            <button
              type="button"
              aria-label={`Remove photo ${i + 1}`}
              onClick={() => onRemove?.(i)}
              className="absolute -top-2.5 -right-2.5 inline-flex size-7 items-center justify-center rounded-full border-2 border-ink bg-surface after:absolute after:-inset-2 hover:bg-highlight"
            >
              <X size={12} strokeWidth={3} aria-hidden="true" />
            </button>
          </li>
        ))}
        {previews.length < max && (
          <li>
            <button
              type="button"
              disabled={busy}
              aria-describedby={error ? "photos-error" : undefined}
              onClick={() => input.current?.click()}
              className="flex h-[100px] w-full flex-col items-center justify-center gap-1 rounded-[16px] border-[2.5px] border-dashed border-ink bg-surface text-[13px] font-extrabold hover:bg-bg disabled:cursor-wait"
            >
              {busy ? (
                <LoaderCircle size={22} strokeWidth={2.6} aria-hidden="true" className="animate-spin" />
              ) : (
                <Plus size={22} strokeWidth={2.6} aria-hidden="true" />
              )}
              {busy ? "Preparing…" : "Add"}
            </button>
          </li>
        )}
      </ul>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => {
          onAdd?.([...(e.target.files ?? [])].slice(0, max - previews.length));
          e.target.value = "";
        }}
      />
      <FieldError id="photos-error" error={error} />
      <span className="text-xs leading-snug text-muted">
        We strip location data from photos before upload, so your home stays private.
      </span>
    </div>
  );
}
