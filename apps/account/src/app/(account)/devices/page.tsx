import type { Metadata } from "next";
import { AccountEmptyPage } from "@/lib/empty-page";

export const metadata: Metadata = { title: "Devices" };

export default function DevicesPage() {
  return (
    <AccountEmptyPage
      title="Devices"
      description="No devices registered"
    />
  );
}
