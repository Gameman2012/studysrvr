import { useCallback, useEffect, useState } from "react"
import { Header } from "@/components/Header"
import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs"
import { FileList } from "@/components/FileList"
import { Skeleton } from "@/components/ui/skeleton"
import { REPO_URL } from "@/config"
import {
  fetchGitHubFolder,
  type GithubItem,
} from "@/lib/github"

export function Home() {
  const [crumbs, setCrumbs] = useState<Crumb[]>([])
  const [items, setItems] = useState<GithubItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

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
    setCrumbs([{ name: "Home", url: REPO_URL }])
    loadFolder(REPO_URL)
  }, [loadFolder])

  const openDir = (item: GithubItem) => {
    setCrumbs((prev) => [...prev, { name: item.name, url: item.url }])
    loadFolder(item.url)
  }

  const goToCrumb = (index: number) => {
    const target = crumbs[index]
    setCrumbs((prev) => prev.slice(0, index + 1))
    loadFolder(target.url)
  }

  const refresh = () => {
    setRefreshing(true)
    loadFolder(crumbs[crumbs.length - 1].url)
  }

  const currentUrl = crumbs[crumbs.length - 1]?.url ?? REPO_URL

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
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
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
