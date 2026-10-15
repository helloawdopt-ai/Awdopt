import { whatsApp } from "@/lib/admin-format";

// 44px tall below 1024px (DESIGN.md §16: admin controls), inline on desktop.
const link = "inline-flex min-h-11 min-w-11 items-center font-bold lg:min-h-0 lg:min-w-0";

/** Call + WhatsApp for a phone number in E.164. */
export function ContactLinks({ phone }: { phone: string }) {
  return (
    <>
      <a href={`tel:${phone}`} className={link}>
        Call
      </a>
      <a href={whatsApp(phone)} target="_blank" rel="noopener noreferrer" className={link}>
        WhatsApp
      </a>
    </>
  );
}
