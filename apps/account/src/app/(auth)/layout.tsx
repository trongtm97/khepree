import { AuthLayout } from "@/components/auth-layout";
import type { ReactNode } from "react";

export default function PublicAuthLayout({ children }: { children: ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}
