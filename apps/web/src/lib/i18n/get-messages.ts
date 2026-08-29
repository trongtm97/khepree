import type { SupportedLocale } from "./config";
import { en } from "@/messages/en";
import { vi } from "@/messages/vi";
import type { Messages } from "@/messages/en";

const catalogs: Record<SupportedLocale, Messages> = { en, vi };

export function getMessages(locale: SupportedLocale): Messages {
  return catalogs[locale];
}

export type { Messages };
