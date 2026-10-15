import * as z from "zod/mini";

// Contact fields shared by the listing, questionnaire and enquiry forms. Limits match the DB CHECKs;
// the server turns phones into E.164 (src/lib/server/phone.ts).
export const phoneField = z
  .string()
  .check(z.trim(), z.regex(/^\+?[\d\s()-]{8,20}$/, "Enter a phone number, for example 98200 12345"));
export const emailField = z.string().check(
  z.trim(),
  z.maxLength(254, "Use 254 characters or fewer"),
  z.refine((v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "Enter an email like name@example.com"),
);
export const nameField = z
  .string()
  .check(z.trim(), z.minLength(1, "Enter your name"), z.maxLength(80, "Use 80 characters or fewer"));
