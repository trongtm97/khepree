import type { SupportedLocale } from "./config";
import type { Messages } from "@/messages/contract";
import { en } from "@/messages/en";
import { vi } from "@/messages/vi";

const catalogs: Record<SupportedLocale, Messages> = { en, vi };

export function getMessages(locale: SupportedLocale): Messages {
  return catalogs[locale];
}

export type { Messages };
