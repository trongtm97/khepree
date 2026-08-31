"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@khepree/ui";

type SePayQrCheckoutPanelProps = {
  orderPublicId: string;
  initialStatus: string;
  qrUrl: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  transferContent: string;
  amountLabel: string;
  copy: {
    qrTitle: string;
    qrHint: string;
    bank: string;
    account: string;
    holder: string;
    amount: string;
    content: string;
    copy: string;
    copied: string;
    copyAll: string;
    copiedAll: string;
    checkPayment: string;
    checking: string;
    waiting: string;
    paid: string;
    expired: string;
  };
};

function CopyRow({
  label,
  value,
  copied,
  onCopy,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  copyLabel: string;
  copiedLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-khepree-slate/15 bg-white/60 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-khepree-slate/60">{label}</p>
        <p className="mt-0.5 break-all text-sm font-semibold text-khepree-slate">{value}</p>
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={onCopy}>
        {copied ? copiedLabel : copyLabel}
      </Button>
    </div>
  );
}

export function SePayQrCheckoutPanel({
  orderPublicId,
  initialStatus,
  qrUrl,
  bankCode,
  accountNumber,
  accountName,
  transferContent,
  amountLabel,
  copy,
}: SePayQrCheckoutPanelProps) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const terminal = status === "paid" || status === "cancelled" || status === "voided";

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/checkout/${orderPublicId}/status`, { cache: "no-store" });
      const payload = (await response.json()) as { data?: { status?: string } };
      if (payload.data?.status) setStatus(payload.data.status);
    } finally {
      setLoading(false);
    }
  }, [orderPublicId]);

  useEffect(() => {
    if (terminal) return;
    const timer = window.setInterval(() => {
      void refreshStatus();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [refreshStatus, terminal]);

  useEffect(() => {
    if (status === "paid") {
      window.location.href = "/billing?checkout=success";
    }
  }, [status]);

  const copyText = useCallback(async (key: string, value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1800);
    } catch {
      setCopiedKey(null);
    }
  }, []);

  const copyAll = useCallback(async () => {
    const block = [
      `${copy.bank}: ${bankCode}`,
      `${copy.account}: ${accountNumber}`,
      `${copy.holder}: ${accountName}`,
      `${copy.amount}: ${amountLabel}`,
      `${copy.content}: ${transferContent}`,
    ].join("\n");
    await copyText("all", block);
  }, [accountName, accountNumber, amountLabel, bankCode, copy, copyText, transferContent]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-[14rem_minmax(0,1fr)] md:items-start">
        <div className="rounded-xl border border-khepree-slate/15 bg-white/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-khepree-teal">{copy.qrTitle}</p>
          <p className="mt-1 text-sm text-khepree-slate/70">{copy.qrHint}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Mã QR thanh toán SePay"
            className="mx-auto mt-4 aspect-square w-full max-w-[14rem] rounded-xl border border-khepree-slate/15 bg-white p-3"
            src={qrUrl}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-khepree-slate/15 bg-khepree-teal/5 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-khepree-slate/60">{copy.amount}</p>
            <p className="mt-1 text-2xl font-bold text-khepree-slate">{amountLabel}</p>
            <p className="mt-2 text-sm text-khepree-slate/70">
              {status === "paid"
                ? copy.paid
                : status === "cancelled"
                  ? copy.expired
                  : copy.waiting}
            </p>
          </div>

          <div className="grid gap-2">
            <CopyRow
              label={copy.bank}
              value={bankCode}
              copied={copiedKey === "bank"}
              onCopy={() => void copyText("bank", bankCode)}
              copyLabel={copy.copy}
              copiedLabel={copy.copied}
            />
            <CopyRow
              label={copy.account}
              value={accountNumber}
              copied={copiedKey === "account"}
              onCopy={() => void copyText("account", accountNumber)}
              copyLabel={copy.copy}
              copiedLabel={copy.copied}
            />
            <CopyRow
              label={copy.holder}
              value={accountName}
              copied={copiedKey === "holder"}
              onCopy={() => void copyText("holder", accountName)}
              copyLabel={copy.copy}
              copiedLabel={copy.copied}
            />
            <CopyRow
              label={copy.content}
              value={transferContent}
              copied={copiedKey === "content"}
              onCopy={() => void copyText("content", transferContent)}
              copyLabel={copy.copy}
              copiedLabel={copy.copied}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" disabled={loading || terminal} onClick={() => void refreshStatus()}>
              {loading ? copy.checking : copy.checkPayment}
            </Button>
            <Button type="button" variant="secondary" onClick={() => void copyAll()}>
              {copiedKey === "all" ? copy.copiedAll : copy.copyAll}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
