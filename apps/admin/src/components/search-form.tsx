import { Button, Input } from "@khepree/ui";

export function SearchForm({
  q,
  extra,
}: {
  q: string;
  extra?: Array<{ name: string; label: string; defaultValue?: string }>;
}) {
  return (
    <form className="flex flex-wrap items-end gap-3" method="get">
      <div className="min-w-56 flex-1">
        <Input name="q" label="Search" defaultValue={q} />
      </div>
      {extra?.map((field) => (
        <div key={field.name} className="w-40">
          <Input name={field.name} label={field.label} defaultValue={field.defaultValue} />
        </div>
      ))}
      <Button type="submit" variant="secondary">
        Filter
      </Button>
    </form>
  );
}

export function Pagination({ page, hasMore, q }: { page: number; hasMore: boolean; q?: string }) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  const qs = (next: number) => {
    const copy = new URLSearchParams(params);
    copy.set("page", String(next));
    return `?${copy.toString()}`;
  };
  if (page <= 1 && !hasMore) return null;
  return (
    <nav aria-label="Pagination" className="flex gap-3 text-sm">
      {page > 1 ? (
        <a className="text-khepree-teal underline" href={qs(page - 1)}>
          Previous
        </a>
      ) : null}
      {hasMore ? (
        <a className="text-khepree-teal underline" href={qs(page + 1)}>
          Next
        </a>
      ) : null}
    </nav>
  );
}
