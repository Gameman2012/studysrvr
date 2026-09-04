import { ChevronRight, Home, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export type Crumb = { name: string; url: string }

export function Breadcrumbs({
  crumbs,
  onNavigate,
  onRefresh,
  refreshing,
}: {
  crumbs: Crumb[]
  onNavigate: (index: number) => void
  onRefresh: () => void
  refreshing: boolean
}) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3">
      <nav className="flex flex-wrap items-center gap-1 text-sm">
        {crumbs.map((c, i) => (
          <span key={`${c.url}-${i}`} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <button
              type="button"
              onClick={() => onNavigate(i)}
              disabled={i === crumbs.length - 1}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 transition hover:bg-secondary disabled:opacity-100 disabled:hover:bg-transparent"
            >
              {i === 0 && <Home className="h-3.5 w-3.5" />}
              <span
                className={
                  i === crumbs.length - 1
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                }
              >
                {c.name}
              </span>
            </button>
          </span>
        ))}
      </nav>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRefresh}
        title="Refresh"
        aria-label="Refresh"
      >
        <RefreshCw
          className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
        />
      </Button>
    </div>
  )
}
