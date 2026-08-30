import { Button } from "@khepree/ui";
import type { SupportedLocale } from "@khepree/config";
import { setAccountLocaleAction } from "@/app/(account)/locale-actions";

export function LocaleSwitch({ locale }: { locale: SupportedLocale }) {
  return (
    <form action={setAccountLocaleAction} className="flex items-center gap-1 text-xs">
      <Button
        type="submit"
        name="locale"
        value="vi"
        variant="ghost"
        size="sm"
        aria-pressed={locale === "vi"}
        className={locale === "vi" ? "font-semibold" : undefined}
      >
        VI
      </Button>
      <Button
        type="submit"
        name="locale"
        value="en"
        variant="ghost"
        size="sm"
        aria-pressed={locale === "en"}
        className={locale === "en" ? "font-semibold" : undefined}
      >
        EN
      </Button>
    </form>
  );
}
