import type { AuthCopy } from "@/lib/auth-ui";

export function AuthBrandPanel({ copy }: { copy: AuthCopy }) {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-khepree-ink p-10 text-khepree-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgb(45 212 191 / 0.35), transparent 45%), radial-gradient(circle at 80% 70%, rgb(99 102 241 / 0.25), transparent 40%)",
        }}
      />
      <div className="relative">
        <p className="text-sm font-medium uppercase tracking-wider text-khepree-teal/90">Khepree</p>
        <h2 className="mt-4 max-w-sm text-2xl font-semibold leading-snug">{copy.panelHeadline}</h2>
        <ul className="mt-6 space-y-3 text-sm text-khepree-white/80">
          {copy.panelBenefits.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden className="text-khepree-teal">
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="relative text-xs text-khepree-white/50">© {new Date().getFullYear()} Khepree</p>
    </div>
  );
}
