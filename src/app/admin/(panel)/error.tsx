"use client";

import { adminButton } from "@/components/ui/AdminTable";
import { ErrorState } from "@/components/ui/States";

// Inside the admin layout (its <main> and nav stay); calm, one sentence, one action.
export default function AdminError({ retry }: { retry: () => void }) {
  return (
    <ErrorState
      action={
        <button type="button" onClick={retry} className={adminButton}>
          Try again
        </button>
      }
    >
      We couldn&rsquo;t load this page. Nothing was changed.
    </ErrorState>
  );
}
