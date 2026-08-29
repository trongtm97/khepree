import { createContentService } from "@khepree/catalog";
import { Button, Card, CardDescription, CardTitle, Container, Input } from "@khepree/ui";
import {
  archiveDraftFormAction,
  createDraftAction,
  publishDraftFormAction,
} from "@/lib/content-actions";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  let drafts: Awaited<ReturnType<ReturnType<typeof createContentService>["listDrafts"]>> = [];
  let loadError: string | null = null;

  try {
    drafts = await createContentService().listDrafts();
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Could not load drafts";
  }

  return (
    <Container className="py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Content (dev)</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">
          Minimal workflow to test draft → publish → revalidate. Requires DATABASE_URL.
        </p>
      </header>

      {loadError ? <p className="mb-4 text-sm text-red-600">{loadError}</p> : null}

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">Create draft</h2>
        <form action={createDraftAction} className="grid max-w-lg gap-3">
          <Input name="slug" label="Slug" required placeholder="hello-world" />
          <Input name="title" label="Title" required placeholder="Hello world" />
          <Input name="locale" label="Locale" defaultValue="en" />
          <Input name="excerpt" label="Excerpt" />
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Body (markdown)</span>
            <textarea
              name="body"
              rows={6}
              className="w-full rounded-[var(--radius-control)] border border-khepree-mist px-3 py-2 text-sm"
              placeholder="# Draft content stored in private R2 bucket"
            />
          </label>
          <Button type="submit">Save draft</Button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Drafts</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-khepree-slate/70">No drafts yet.</p>
        ) : (
          <ul className="space-y-3">
            {drafts.map((draft) => (
              <li key={draft.id}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base">{draft.title}</CardTitle>
                    <CardDescription>
                      {draft.contentType} · {draft.locale} · {draft.slug} · v{draft.versionNumber}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <form action={publishDraftFormAction}>
                      <input type="hidden" name="versionId" value={draft.id} />
                      <Button type="submit" size="sm">
                        Publish
                      </Button>
                    </form>
                    <form action={archiveDraftFormAction}>
                      <input type="hidden" name="versionId" value={draft.id} />
                      <Button type="submit" variant="secondary" size="sm">
                        Archive
                      </Button>
                    </form>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
