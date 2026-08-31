"use client";

type LinkDialogState = {
  url: string;
  label: string;
  newTab: boolean;
  nofollow: boolean;
};

type Props = {
  linkDialog: LinkDialogState;
  onCancel: () => void;
  onChange: (next: LinkDialogState) => void;
  onConfirm: () => void;
};

export function TiptapLinkDialog({ linkDialog, onCancel, onChange, onConfirm }: Props) {
  return (
    <div className="rounded-lg border border-khepree-mist bg-white p-4">
      <p className="mb-3 text-sm font-medium text-khepree-slate">Chèn link</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs text-khepree-slate/70">URL</span>
          <input
            className="w-full rounded-md border border-khepree-mist px-3 py-2 text-sm"
            onChange={(event) => onChange({ ...linkDialog, url: event.target.value })}
            placeholder="https:// hoặc /duong-dan-noi-bo"
            value={linkDialog.url}
          />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs text-khepree-slate/70">Nhãn hiển thị</span>
          <input
            className="w-full rounded-md border border-khepree-mist px-3 py-2 text-sm"
            onChange={(event) => onChange({ ...linkDialog, label: event.target.value })}
            value={linkDialog.label}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-khepree-slate">
          <input
            checked={linkDialog.newTab}
            onChange={(event) => onChange({ ...linkDialog, newTab: event.target.checked })}
            type="checkbox"
          />
          Mở tab mới
        </label>
        <label className="flex items-center gap-2 text-sm text-khepree-slate">
          <input
            checked={linkDialog.nofollow}
            onChange={(event) => onChange({ ...linkDialog, nofollow: event.target.checked })}
            type="checkbox"
          />
          nofollow
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          className="rounded-md bg-khepree-teal px-3 py-1.5 text-sm font-semibold text-white"
          onClick={onConfirm}
          type="button"
        >
          Chèn
        </button>
        <button
          className="rounded-md border border-khepree-mist px-3 py-1.5 text-sm text-khepree-slate"
          onClick={onCancel}
          type="button"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}

export type { LinkDialogState };
