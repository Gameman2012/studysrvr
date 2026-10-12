import { REPO_URL } from "@/config"

/** Short-link map: `{ "<id6>": "<repo path>" }` stored at `.ids/map.json`. */
export type IdsMap = Record<string, string>

/**
 * Raw URL of the id map, derived from REPO_URL
 * (`api.github.com/repos/<owner>/<repo>/contents...?ref=<branch>`).
 * Defaults to `main` when no `ref` is present.
 */
export function idsMapUrl(): string | null {
  const m = REPO_URL.match(
    /api\.github\.com\/repos\/([^/?#]+)\/([^/?#]+)\/contents/i,
  )
  if (!m) return null
  const query = REPO_URL.split("?")[1] ?? ""
  const ref = new URLSearchParams(query).get("ref") ?? "main"
  return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${encodeURIComponent(ref)}/.ids/map.json`
}

let mapCache: Promise<IdsMap> | null = null

/** Fetch the id map once per session; `{}` when missing/unreachable. */
export function fetchIdsMap(): Promise<IdsMap> {
  if (!mapCache) {
    mapCache = (async () => {
      try {
        const url = idsMapUrl()
        if (!url) return {}
        const res = await fetch(url)
        if (!res.ok) return {}
        const data = await res.json()
        if (!data || typeof data !== "object" || Array.isArray(data)) return {}
        const clean: IdsMap = {}
        for (const [k, v] of Object.entries(data)) {
          if (typeof k === "string" && typeof v === "string" && k && v) {
            clean[k] = v
          }
        }
        return clean
      } catch {
        return {}
      }
    })()
  }
  return mapCache
}

/** Reverse lookup: repo path -> short id (exact match). */
export function findIdByPath(map: IdsMap, path: string): string | null {
  for (const [id, p] of Object.entries(map)) {
    if (p === path) return id
  }
  return null
}

/** Canonical short URL for an id (same origin). */
export function shortUrlForId(id: string): string {
  return `${window.location.origin}/f?id=${encodeURIComponent(id)}`
}

/** Long URL fallback when a file has no short id yet. */
export function longUrlForPath(path: string): string {
  return `${window.location.origin}/f?path=${encodeURIComponent(path)}`
}

/** Copy text with clipboard API + textarea fallback. Resolves true on success. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement("textarea")
      ta.value = text
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand("copy")
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}
