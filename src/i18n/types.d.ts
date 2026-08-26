import type messages from "../../messages/sk.json";
import type { LOCALES } from "./config";

/**
 * Types the message keys, so a key that exists in Slovak but was forgotten in
 * English is a compile error rather than a string that silently renders as its
 * own key. Slovak is the reference: it is the language the app is written in.
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof LOCALES)[number];
    Messages: typeof messages;
  }
}
