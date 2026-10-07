import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Header } from "@/components/Header"
import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs"
import { FileList } from "@/components/FileList"
import { Skeleton } from "@/components/ui/skeleton"
import { REPO_URL } from "@/config"
import {
  contentUrl,
  fetchGitHubFolder,
  type GithubItem,
} from "@/lib/github"

export function Home() {
  useEffect(() => {
    document.title = "Study Hub - Explore"
  }, [])

  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<GithubItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const rawPath = searchParams.get("path") ?? ""
  const dirPath = rawPath.replace(/^\/+|\/+$/g, "")
  const segments = useMemo(
    () => (dirPath ? dirPath.split("/").filter(Boolean) : []),
    [dirPath],
  )

  const apiUrl = useMemo(
    () =>
      contentUrl(
        REPO_URL,
        segments.map((s) => encodeURIComponent(s)).join("/"),
      ),
    [segments],
  )

  const crumbs: Crumb[] = useMemo(() => {
    const list: Crumb[] = [{ name: "Home", url: REPO_URL }]
    segments.forEach((seg, i) => {
      list.push({
        name: seg,
        url: contentUrl(
          REPO_URL,
          segments
            .slice(0, i + 1)
            .map((s) => encodeURIComponent(s))
            .join("/"),
        ),
      })
    })
    return list
  }, [segments])

  const loadFolder = useCallback(async (url: string) => {
    setLoading(true)
    setError("")
    try {
      const list = await fetchGitHubFolder(url)
      setItems(list)
    } catch (e) {
      console.error("Error fetching repository structure:", e)
      setError(
        "Couldn't load the repository. Check that the link is set correctly.",
      )
      setItems([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!REPO_URL) {
      setError("No repository link has been set. Visit the project settings.")
      setLoading(false)
      return
    }
    loadFolder(apiUrl)
  }, [apiUrl, loadFolder])

  const openDir = (item: GithubItem) => {
    const target = (item.path || "").replace(/^\/+|\/+$/g, "")
    setSearchParams(target ? { path: target } : {})
  }

  const goToCrumb = (index: number) => {
    if (index <= 0) {
      setSearchParams({})
      return
    }
    const target = segments.slice(0, index).join("/")
    setSearchParams(target ? { path: target } : {})
  }

  const refresh = () => {
    setRefreshing(true)
    loadFolder(apiUrl)
  }

  const currentUrl = apiUrl

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="mx-auto w-full max-w-4xl px-5 py-10 md:py-14">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            اللهم صل على محمد
          </h1>
        </div>

        {crumbs.length > 0 && !error && (
          <Breadcrumbs
            crumbs={crumbs}
            onNavigate={goToCrumb}
            onRefresh={refresh}
            refreshing={refreshing}
          />
        )}

        {loading ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <p className="mx-auto mt-10 max-w-md rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
            {error}
          </p>
        ) : items.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            This folder is empty.
          </p>
        ) : (
          <FileList items={items} onOpenDir={openDir} />
        )}

        {loading && currentUrl && (
          <div className="sr-only" aria-live="polite">
            Loading…
          </div>
        )}
      </main>

      <footer className="border-t border-border px-5 py-6 text-center text-sm text-muted-foreground">
        Powered by a cloud database — updates reach every student instantly.
      </footer>
    </div>
  )
}
