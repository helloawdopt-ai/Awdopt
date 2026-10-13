import "server-only";
import { parsePhoneNumberFromString } from "libphonenumber-js/min";

/** E.164 (+919820012345) or null. Numbers without a country code are read as Indian. */
export function toE164(input: string) {
  const phone = parsePhoneNumberFromString(input, "IN");
  return phone?.isValid() ? phone.number : null;
}
