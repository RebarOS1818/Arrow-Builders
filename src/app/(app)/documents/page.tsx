import { Suspense } from "react";
import { DocumentLink } from "@/components/documents/document-link";
import { UploadDocument } from "@/components/documents/upload-document";
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
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-semibold text-ink-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Uploaded by</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Size</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.map((document) => (
              <tr key={document.id} className="hover:bg-canvas/60">
                <td className="px-4 py-3">
                  <DocumentLink
                    id={document.id}
                    name={document.name}
                    hasFile={Boolean(document.storage_path)}
                  />
                </td>
                <td className="px-4 py-3 text-ink-muted">{document.project.name}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-ink-muted">
                    {document.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-muted">{document.uploaded_by}</td>
                <td className="px-4 py-3 text-ink-muted">{formatDate(document.uploaded_at)}</td>
                <td className="px-4 py-3 text-right text-ink-muted">
                  {formatSize(document.size_kb)}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-muted">
                  No documents match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
