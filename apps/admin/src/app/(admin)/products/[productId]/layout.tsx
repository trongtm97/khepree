import type { ReactNode } from "react";

export default function ProductStudioLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-5xl">{children}</div>;
}
