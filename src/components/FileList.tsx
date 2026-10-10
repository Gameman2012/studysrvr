import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, FileText, FileType, TriangleAlert } from "lucide-react"
import type { GithubItem } from "@/lib/github"
import {
  baseFileName,
  displayName,
  isBrokenLink,
  isHiddenItem,
  isLink,
  isPdf,
  thumbRawUrl,
} from "@/lib/github"

/**
 * Card image: for `*.pdf.link` uses the pre-generated first-page image
 * from `.thumbs/`; for image links (`*.jpeg.link`) resolves the target and
 * uses the image itself. Falls back to a file icon on any failure.
 */
function CardThumb({ item }: { item: GithubItem }) {
  const staticThumb = thumbRawUrl(item)
  const [src, setSrc] = useState<string | null>(staticThumb)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setSrc(staticThumb)
    setFailed(false)
    if (staticThumb || !isLink(item.name) || !item.download_url) return
    let cancelled = false
    fetch(item.download_url)
      .then((r) => r.text())
      .then((t) => {
        const target = t.trim()
        if (!cancelled && /\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(target)) {
          setSrc(target)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [item.download_url, item.name, staticThumb])

  if (!src || failed) {
    const FileIcon = isPdf(baseFileName(item.name)) ? FileType : FileText
    return (
      <span className="flex aspect-[3/4] w-full items-center justify-center bg-secondary text-muted-foreground">
        <FileIcon className="h-10 w-10" />
      </span>
    )
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="aspect-[3/4] w-full border-b border-border object-cover"
    />
  )
}

export function FileList({
  items,
  onOpenDir,
}: {
  items: GithubItem[]
  onOpenDir: (item: GithubItem) => void
}) {
  // Backup filter: hidden dot-paths (e.g. `.thumbs/`) never render,
  // even if they slip through fetchGitHubFolder.
  const visibleItems = items.filter((item) => !isHiddenItem(item))
  const dirs = visibleItems.filter((item) => item.type === "dir")
  const files = visibleItems.filter((item) => item.type !== "dir")

  return (
    <div className="mt-4 space-y-4">
      {dirs.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {dirs.map((item, idx) => (
            <button
              key={item.path || `${item.name}-${idx}`}
              type="button"
              onClick={() => onOpenDir(item)}
              className="group flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-start transition last:border-b-0 hover:bg-secondary/60"
            >
              <span className="min-w-0 flex-1">
                <span dir="auto" className="block truncate text-sm font-medium">
                  {displayName(item.name)}
                </span>
                <span className="block text-xs text-muted-foreground">
                  مجلد · Folder
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
            </button>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((item, idx) => {
            const broken = isBrokenLink(item.name)
            const pdfLabel = isPdf(baseFileName(item.name))
            const internal = isLink(item.name) && item.path
            const cardClass =
              "group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:bg-secondary/60"

            const cardInner = (
              <>
                <CardThumb item={item} />
                <span className="flex min-h-16 flex-1 flex-col justify-center gap-1 p-3">
                  <span className="line-clamp-2 text-sm font-medium leading-snug">
                    {displayName(item.name)}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {pdfLabel ? "PDF" : "File"}
                    {broken && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-400">
                        <TriangleAlert className="h-3 w-3" />
                        معطل مؤقتاً
                      </span>
                    )}
                  </span>
                </span>
              </>
            )

            if (internal) {
              return (
                <Link
                  key={item.path || `${item.name}-${idx}`}
                  to={`/f?path=${encodeURIComponent(item.path)}`}
                  className={cardClass}
                >
                  {cardInner}
                </Link>
              )
            }

            return (
              <a
                key={item.path || `${item.name}-${idx}`}
                href={item.download_url ?? "#"}
                download={isPdf(item.name) ? undefined : item.name}
                className={cardClass}
              >
                {cardInner}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
