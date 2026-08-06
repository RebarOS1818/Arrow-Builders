import { FileText } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { DocumentLink } from "@/components/documents/document-link";
import { ClickableRow } from "@/components/phases/clickable-row";
import { EditDocumentForm } from "@/components/phases/edit-forms";
import { UploadDocument } from "@/components/documents/upload-document";
import { ClearFilters } from "@/components/ui/clear-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterSelect } from "@/components/ui/filter-select";
import { getDocuments, getProjects } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatSize(kb: number) {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; category?: string }>;
}) {
  const params = await searchParams;
  const [documents, projects] = await Promise.all([getDocuments(), getProjects()]);

  const categories = [...new Set(documents.map((d) => d.category))].sort();
  const projectFilter = params.project && params.project !== "all" ? params.project : null;
  const categoryFilter = params.category && params.category !== "all" ? params.category : null;

  const visible = documents.filter(
    (d) =>
      (!projectFilter || d.project_id === projectFilter) &&
      (!categoryFilter || d.category === categoryFilter),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {visible.length} of {documents.length} files across {projects.length} projects
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Suspense>
            <FilterSelect
              ariaLabel="Project filter"
              param="project"
              className="w-48"
              options={[
                { value: "all", label: "All Projects" },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
            <FilterSelect
              ariaLabel="Category filter"
              param="category"
              className="w-44"
              options={[
                { value: "all", label: "All Categories" },
                ...categories.map((c) => ({ value: c, label: c })),
              ]}
            />
          </Suspense>
          <UploadDocument projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
        </div>
      </div>

      <div className="card scroll-thin overflow-x-auto">
        <table role="table" className="stacked-table w-full min-w-[720px] text-sm">
          <thead role="rowgroup">
            <tr role="row" className="border-b border-line text-left text-xs font-semibold text-ink-muted">
              <th role="columnheader" className="px-4 py-3">Name</th>
              <th role="columnheader" className="px-4 py-3">Belongs to</th>
              <th role="columnheader" className="px-4 py-3">Category</th>
              <th role="columnheader" className="px-4 py-3">Uploaded by</th>
              <th role="columnheader" className="px-4 py-3">Date</th>
              <th role="columnheader" className="px-4 py-3 text-right">Size</th>
              <th role="columnheader" className="px-4 py-3 text-right">Edit</th>
            </tr>
          </thead>
          <tbody role="rowgroup" className="divide-y divide-line">
            {visible.map((document) => (
              <ClickableRow key={document.id} className="cursor-pointer hover:bg-canvas/60">
                <td role="cell" className="px-4 py-3">
                  <DocumentLink
                    id={document.id}
                    name={document.name}
                    hasFile={Boolean(document.storage_path)}
                  />
                </td>
                {/* A parcel's survey belongs here too, and it has no project to
                    name — so the column carries whichever the file hangs off. */}
                <td role="cell" data-label="Belongs to" className="px-4 py-3 text-ink-muted">
                  {document.owner ? (
                    <Link href={document.owner.href} className="hover:text-brand-700">
                      {document.owner.label}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td role="cell" data-label="Category" className="px-4 py-3">
                  <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-ink-muted">
                    {document.category}
                  </span>
                </td>
                <td role="cell" data-label="Uploaded by" className="px-4 py-3 text-ink-muted">
                  {document.uploaded_by}
                </td>
                <td role="cell" data-label="Date" className="px-4 py-3 text-ink-muted">
                  {formatDate(document.uploaded_at)}
                </td>
                <td role="cell" data-label="Size" className="px-4 py-3 text-right text-ink-muted">
                  {formatSize(document.size_kb)}
                </td>
                <td role="cell" data-cell="action" className="px-4 py-3 text-right">
                  <EditDocumentForm
                    document={document}
                    projects={projects.map((p) => ({ id: p.id, name: p.name }))}
                  />
                </td>
              </ClickableRow>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-2">
                  <EmptyState
                    variant="filtered"
                    icon={FileText}
                    title="Nothing matches these filters"
                    action={<ClearFilters params={["project", "category"]} />}
                  >
                    There are documents here — none of them fit what you have
                    selected.
                  </EmptyState>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
