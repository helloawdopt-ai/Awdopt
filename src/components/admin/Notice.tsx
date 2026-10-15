/** The line after an admin action: ?done=<key> (Fresh, status) or ?error=<key> (alert). Unknown keys show nothing. */
export function Notice({ messages, done, error }: { messages: Record<string, string>; done?: string; error?: string }) {
  const key = error ?? done;
  if (!key || !(key in messages)) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-[16px] border-2 border-ink px-3.5 py-2.5 text-sm font-bold ${error ? "bg-surface" : "bg-fresh"}`}
    >
      {messages[key]}
    </p>
  );
}
