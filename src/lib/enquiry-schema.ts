import * as z from "zod/mini";
import { emailField, nameField, phoneField } from "@/lib/contact-schema";

// "I'm Interested" (scope #11): name, phone/WhatsApp, email, optional message, unticked consent.
// One schema for the browser and the server action; limits match the DB CHECKs on public.enquiries.
export const enquirySchema = z.object({
  name: nameField,
  phone: phoneField,
  email: emailField,
  message: z.string().check(z.trim(), z.maxLength(1000, "Use 1,000 characters or fewer")),
  consent: z.literal(true, "Please confirm so the team can contact you"),
});

export type Enquiry = z.input<typeof enquirySchema>;
