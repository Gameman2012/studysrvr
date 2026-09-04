import { ChevronRight, FileText, FileType } from "lucide-react"
import type { GithubItem } from "@/lib/github"
import { isPdf } from "@/lib/github"

function isLink(name: string): boolean {
  return name.toLowerCase().endsWith(".link")
}

function displayName(name: string): string {
  return isLink(name) ? name.slice(0, -5) : name
}

async function handleLinkClick(e: React.MouseEvent<HTMLAnchorElement>, url: string) {
  e.preventDefault()
  try {
    const res = await fetch(url)
    const text = await res.text()
    const target = text.trim()
    if (target) {
      window.open(target, "_blank")
    }
  } catch {
    console.error("Failed to resolve .link file")
  }
}

export function FileList({
  items,
  onOpenDir,
}: {
  items: GithubItem[]
  onOpenDir: (item: GithubItem) => void
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
      {items.map((item, idx) => {
        const isDir = item.type === "dir"

        if (isDir) {
          return (
            <button
              key={item.path || `${item.name}-${idx}`}
              type="button"
              onClick={() => onOpenDir(item)}
              className="group flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left transition last:border-b-0 hover:bg-secondary/60"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {displayName(item.name)}
                </span>
                <span className="block text-xs text-muted-foreground">
                  مجلد · Folder
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
            </button>
          )
        }

        const href = item.download_url
          ? isLink(item.name)
            ? item.download_url
            : item.download_url
          : "#"

        const FileIcon = isPdf(item.name) ? FileType : FileText

        return (
          <a
            key={item.path || `${item.name}-${idx}`}
            href={href}
            download={isLink(item.name) || isPdf(item.name) ? undefined : item.name}
            onClick={isLink(item.name) && item.download_url ? (e) => handleLinkClick(e, item.download_url!) : undefined}
            className="group flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left transition last:border-b-0 hover:bg-secondary/60"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                isPdf(item.name)
                  ? "bg-primary/15 text-primary"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              <FileIcon className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {displayName(item.name)}
              </span>
              <span className="block text-xs text-muted-foreground">
                {isPdf(item.name) ? "PDF" : "File"}
              </span>
            </span>
          </a>
        )
      })}
    </div>
  )
}
