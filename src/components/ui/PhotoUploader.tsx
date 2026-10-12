"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Photo = { file: File; url: string };

type Props = { max?: number; onChange?: (files: File[]) => void };

// UI only for now. The resize/WebP/EXIF-strip pipeline and signed uploads arrive with the listing form.
export function PhotoUploader({ max = 6, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const live = useRef(photos);
  useEffect(() => {
    live.current = photos;
  }, [photos]);
  // Revoke any remaining previews on unmount.
  useEffect(() => () => live.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const update = (next: Photo[]) => {
    setPhotos(next);
    onChange?.(next.map((p) => p.file));
  };

  const add = (files: FileList | null) => {
    if (!files) return;
    const added = [...files].slice(0, max - photos.length).map((file) => ({ file, url: URL.createObjectURL(file) }));
    update([...photos, ...added]);
    if (input.current) input.current.value = "";
  };

  const remove = (p: Photo) => {
    URL.revokeObjectURL(p.url);
    update(photos.filter((x) => x !== p));
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[15px] font-extrabold">
        Photos <span className="font-medium text-muted">· up to {max}</span>
      </span>
      <ul className="grid grid-cols-3 gap-2">
        {photos.map((p, i) => (
          <li key={p.url} className="relative h-[100px] rounded-[16px] border-[2.5px] border-ink">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={p.url} alt={`Photo ${i + 1}`} className="size-full rounded-[13px] object-cover" />
            <button
              type="button"
              aria-label={`Remove photo ${i + 1}`}
              onClick={() => remove(p)}
              className="absolute -top-2.5 -right-2.5 inline-flex size-7 items-center justify-center rounded-full border-2 border-ink bg-surface after:absolute after:-inset-2 hover:bg-highlight"
            >
              <X size={12} strokeWidth={3} aria-hidden="true" />
            </button>
          </li>
        ))}
        {photos.length < max && (
          <li>
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="flex h-[100px] w-full flex-col items-center justify-center gap-1 rounded-[16px] border-[2.5px] border-dashed border-ink bg-surface text-[13px] font-extrabold hover:bg-bg"
            >
              <Plus size={22} strokeWidth={2.6} aria-hidden="true" />
              Add
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
        onChange={(e) => add(e.target.files)}
      />
      <span className="text-xs leading-snug text-muted">We strip location data from photos before upload.</span>
    </div>
  );
}
