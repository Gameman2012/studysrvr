import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  ArrowLeft,
  ExternalLink,
  GraduationCap,
  TriangleAlert,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { REPO_URL } from "@/config"
import {
  baseFileName,
  contentUrl,
  isBrokenLink,
  isLink,
  type GithubItem,
} from "@/lib/github"

function isImageName(name: string): boolean {
  return /\.(jpe?g|png|webp|gif)$/i.test(name)
}

export function FileViewer() {
  const [searchParams] = useSearchParams()
  const rawPath = searchParams.get("path") ?? ""
  const filePath = rawPath.replace(/^\/+|\/+$/g, "")

  const [target, setTarget] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const segments = useMemo(
    () => (filePath ? filePath.split("/").filter(Boolean) : []),
    [filePath],
  )
  const fileName = segments[segments.length - 1] ?? ""
  const parentDir = segments.slice(0, -1).join("/")
  const backTo = parentDir ? `/m?path=${encodeURIComponent(parentDir)}` : "/m"

  const base = fileName ? baseFileName(fileName) : ""
  const broken = fileName ? isBrokenLink(fileName) : false

  useEffect(() => {
    document.title = "Study Hub - File"
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!filePath) {
      setError("No file specified.")
      setLoading(false)
      return
    }
    if (!REPO_URL) {
      setError("No repository link has been set.")
      setLoading(false)
      return
    }
    setLoading(true)
    setError("")
    setTarget(null)

    const apiUrl = contentUrl(
      REPO_URL,
      segments.map((s) => encodeURIComponent(s)).join("/"),
    )

    ;(async () => {
      try {
        const meta = await fetch(apiUrl, {
          headers: { Accept: "application/vnd.github+json" },
        })
        if (!meta.ok) throw new Error(`GitHub responded with ${meta.status}`)
        const data = await meta.json()
        if (Array.isArray(data)) throw new Error("This path is a folder.")
        const item = data as GithubItem
        if (item.type !== "file") throw new Error("This path is a folder.")
        if (cancelled) return

        if (isLink(item.name)) {
          if (!item.download_url) throw new Error("Missing download URL.")
          const res = await fetch(item.download_url)
          if (!res.ok) throw new Error("Couldn't resolve the file link.")
          const text = (await res.text()).trim()
          if (!/^https?:\/\//i.test(text)) {
            throw new Error("The link content is not a valid URL.")
          }
          if (!cancelled) setTarget(text)
        } else {
          if (!item.download_url) throw new Error("Missing download URL.")
          if (!cancelled) setTarget(item.download_url)
        }
      } catch (e) {
        console.error("Failed to load file:", e)
        if (!cancelled) {
          setError("Couldn't load this file. It may have been moved or deleted.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [filePath, segments])

  const showImage =
    target != null && (isImageName(base) || isImageName(target.split("?")[0]))

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <GraduationCap className="h-5 w-5 text-primary" />
          <span>Study Hub</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to={backTo}>
              <ArrowLeft className="h-4 w-4" />
              رجوع للمجلد
            </Link>
          </Button>
          {target && !loading && !error && (
            <Button variant="outline" size="sm" asChild>
              <a href={target} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                فتح في تبويب جديد
              </a>
            </Button>
          )}
        </div>
      </header>

      {broken && !loading && (
        <p className="flex shrink-0 items-center justify-center gap-1.5 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
          <TriangleAlert className="h-3.5 w-3.5" />
          هذا الملف معطل مؤقتاً — قد لا يعمل.
        </p>
      )}

      <div className="min-h-0 flex-1">
        {loading ? (
          <Skeleton className="h-full w-full rounded-none" />
        ) : error ? (
          <div className="flex h-full items-center justify-center p-5">
            <p className="max-w-md rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
              {error}
            </p>
          </div>
        ) : target ? (
          showImage ? (
            <div className="h-full overflow-auto">
              <img
                src={target}
                alt=""
                className="h-full w-full bg-card object-contain"
              />
            </div>
          ) : (
            <iframe
              src={target}
              title="file"
              allowFullScreen
              className="h-full w-full border-0 bg-card"
            />
          )
        ) : null}
      </div>
    </div>
  )
}
