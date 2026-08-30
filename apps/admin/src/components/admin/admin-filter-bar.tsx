import { Button, Input, Select } from "@khepree/ui";
import { adminUi } from "@/lib/labels";

export function AdminFilterBar({
  q,
  extra,
}: {
  q?: string;
  extra?: Array<{
    name: string;
    label: string;
    defaultValue?: string;
    type?: "text" | "select";
    options?: Array<{ value: string; label: string }>;
  }>;
}) {
  return (
    <form className="flex flex-wrap items-end gap-3" method="get">
      <div className="min-w-56 flex-1">
        <Input name="q" label={adminUi.search} defaultValue={q ?? ""} />
      </div>
      {extra?.map((field) =>
        field.type === "select" && field.options ? (
          <div key={field.name} className="w-40">
            <Select name={field.name} label={field.label} defaultValue={field.defaultValue} options={field.options} />
          </div>
        ) : (
          <div key={field.name} className="w-40">
            <Input name={field.name} label={field.label} defaultValue={field.defaultValue} />
          </div>
        ),
      )}
      <Button type="submit" variant="secondary">
        {adminUi.filter}
      </Button>
    </form>
  );
}

export function AdminPagination({
  page,
  hasMore,
  params,
  q,
}: {
  page: number;
  hasMore: boolean;
  params?: Record<string, string | undefined>;
  /** @deprecated pass via params */
  q?: string;
}) {
  const merged = { ...(params ?? {}), q: params?.q ?? q };
  const qs = (next: number) => {
    const copy = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) copy.set(key, value);
    }
    copy.set("page", String(next));
    const s = copy.toString();
    return s ? `?${s}` : `?page=${next}`;
  };
  if (page <= 1 && !hasMore) return null;
  return (
    <nav aria-label="Phân trang" className="flex gap-3 text-sm">
      {page > 1 ? (
        <a className="text-khepree-teal underline" href={qs(page - 1)}>
          {adminUi.previous}
        </a>
      ) : null}
      {hasMore ? (
        <a className="text-khepree-teal underline" href={qs(page + 1)}>
          {adminUi.next}
        </a>
      ) : null}
    </nav>
  );
}
