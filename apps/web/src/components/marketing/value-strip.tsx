import { Container } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";

const KEYS = ["saveTime", "workSmarter", "createMore", "unlockOpportunities"] as const;

export function ValueStrip({ messages }: { messages: Messages }) {
  return (
    <section aria-label="Value highlights" className="border-b border-khepree-mist bg-khepree-white">
      <Container className="grid grid-cols-2 gap-4 py-8 sm:grid-cols-4 sm:gap-6">
        {KEYS.map((key) => (
          <p key={key} className="text-center text-sm font-semibold text-khepree-ink sm:text-base">
            {messages.valueStrip[key]}
          </p>
        ))}
      </Container>
    </section>
  );
}
