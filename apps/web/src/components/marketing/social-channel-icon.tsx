import type { ReactNode } from "react";
import type { OfficialContactChannel } from "@khepree/config";
import { cn } from "@khepree/ui";

const ICONS: Record<OfficialContactChannel, ReactNode> = {
  facebook: (
    <path
      d="M14 8h2.5V5h-2.9c-2.8 0-4.1 1.7-4.1 4.1V11H7v3h2.5v7H13v-7h2.4l.4-3H13V8.6c0-.9.2-1.3 1.3-1.3z"
      fill="currentColor"
    />
  ),
  youtube: (
    <path
      d="M10 15.5v-7l6 3.5-6 3.5zm8.9-8.4a2 2 0 0 0-1.4-1.4C15.7 5 12 5 12 5s-3.7 0-5.5.1A2 2 0 0 0 5.1 6.5 21 21 0 0 0 5 12a21 21 0 0 0 .1 5.5 2 2 0 0 0 1.4 1.4c1.8.2 5.5.2 5.5.2s3.7 0 5.5-.2a2 2 0 0 0 1.4-1.4A21 21 0 0 0 19 12a21 21 0 0 0-.1-5.5z"
      fill="currentColor"
    />
  ),
  tiktok: (
    <path
      d="M14.5 5.2c.8 1 2 1.6 3.3 1.7V9.8c-1.2 0-2.3-.4-3.3-1v5.4a4.3 4.3 0 1 1-4.3-4.3c.2 0 .5 0 .7.1v2.4a1.9 1.9 0 1 0 1.3 1.8V5.2h2.3z"
      fill="currentColor"
    />
  ),
  telegram: (
    <path
      d="M19.7 5.2 4.8 11.1c-1 .4-1 .9-.2 1.2l3.8 1.2 1.5 4.6c.2.5.4.7.8.7.4 0 .6-.2.8-.5l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.9l2.7-12.5c.3-1.2-.5-1.7-1.3-1.3zM9.2 13.2l9.8-6.1c.4-.3.8-.1.5.2l-8 7.3-.3 3.2-1.2-3.7 8-7.3c.4-.3.8-.1.5.2l-8 7.3-.3 3.2-1.2-3.7z"
      fill="currentColor"
    />
  ),
  zalo: (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8.5 9.5h2.2c1.6 0 2.8 1 2.8 2.4S12.3 14.3 10.7 14.3H9.8v2.2H8.5V9.5zm1.3 3.6h.9c.9 0 1.5-.4 1.5-1.1s-.6-1.1-1.5-1.1h-.9v2.2zm4.2-3.6h2.4c1.5 0 2.5.9 2.5 2.3v3.9H15.3v-.9c-.5.7-1.3 1-2.2 1-1.4 0-2.3-.9-2.3-2.1 0-1.3 1-2.1 2.6-2.1.6 0 1.1.1 1.5.3v-.4h-1.2v-1zm1.3 4.5c.6 0 1.1-.3 1.1-.8v-1.4c-.3-.2-.7-.3-1.1-.3-.8 0-1.3.4-1.3.9s.5 1 1.3 1z"
        fill="currentColor"
      />
    </>
  ),
};

const HOVER_CLASS: Record<OfficialContactChannel, string> = {
  facebook: "group-hover:text-[#1877F2]",
  youtube: "group-hover:text-[#FF0000]",
  tiktok: "group-hover:text-foreground",
  telegram: "group-hover:text-[#26A5E4]",
  zalo: "group-hover:text-[#0068FF]",
};

export function SocialChannelIcon({
  channel,
  className,
  size = "md",
}: {
  channel: OfficialContactChannel;
  className?: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-[18px] w-[18px]" : "h-5 w-5";
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={cn(dim, "shrink-0 text-muted transition-colors", HOVER_CLASS[channel], className)}
    >
      {ICONS[channel]}
    </svg>
  );
}
