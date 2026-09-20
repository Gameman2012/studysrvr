export type GithubItem = {
  name: string
  path: string
  type: "dir" | "file"
  download_url: string | null
  url: string
  size: number
}

/**
 * Normalize any GitHub folder URL into a valid GitHub REST API contents URL.
 * Accepts:
 *   - https://github.com/owner/repo
 *   - https://github.com/owner/repo/tree/branch/path/to/folder
 *   - https://api.github.com/repos/owner/repo/contents/path  (passed through)
 */
export function toGithubApiUrl(url: string): string {
  const value = url.trim()
  if (!value) return ""

  // Already an API URL — keep as-is.
  if (value.includes("api.github.com")) {
    return value
  }

  // Match a standard github.com URL.
  const match = value.match(
    /github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+)(?:\/(.*))?)?/i,
  )
  if (!match) return value

  const owner = match[1]
  const repo = match[2].replace(/\.git$/, "")
  const branch = match[3]
  const path = match[4] ? `/${match[4].replace(/\/+$/, "")}` : ""

  let api = `https://api.github.com/repos/${owner}/${repo}/contents${path}`
  if (branch) {
    api += `?ref=${branch}`
  }
  return api
}

/** Rewrite a raw.githubusercontent.com download URL so the PDF opens/renders properly. */
export function pdfDownloadUrl(downloadUrl: string): string {
  if (downloadUrl.includes("raw.githubusercontent.com")) {
    return downloadUrl
      .replace("raw.githubusercontent.com", "github.com")
      .replace("/main/", "/raw/main/")
  }
  return downloadUrl
}

/** Build a GitHub contents API URL by appending a subpath to a base API URL. */
export function contentUrl(base: string, subpath: string): string {
  const trimmed = subpath.replace(/^\/+/, "").replace(/\/+$/, "")
  if (!trimmed) return base
  const [url, query] = base.split("?")
  return `${url}/${trimmed}${query ? `?${query}` : ""}`
}

export function isPdf(name: string): boolean {
  return name.toLowerCase().endsWith(".pdf")
}

export function isLink(name: string): boolean {
  return name.toLowerCase().endsWith(".link")
}

/** Hidden paths (e.g. `.thumbs/`) are never shown in the site. */
export function isHiddenItem(item: GithubItem): boolean {
  if (item.name.startsWith(".")) return true
  return (item.path || "").split("/").some((p) => p.startsWith("."))
}

/** Display name: strip trailing `.link`, keep `-broken` visible as a warning. */
export function displayName(name: string): string {
  return isLink(name) ? name.slice(0, -5) : name
}

/** True for `*.pdf.link` whose display name ends with `-broken.pdf`. */
export function isBrokenLink(name: string): boolean {
  return isLink(name) && displayName(name).toLowerCase().endsWith("-broken.pdf")
}

/** Base file name without `.link` and without `-broken` (e.g. `X-broken.pdf` -> `X.pdf`). */
export function baseFileName(name: string): string {
  const d = displayName(name)
  const suffix = "-broken.pdf"
  if (d.toLowerCase().endsWith(suffix)) {
    return d.slice(0, -suffix.length) + ".pdf"
  }
  return d
}

/**
 * Raw URL of the first-page thumbnail for a `*.pdf.link` item.
 * Thumbs live in `.thumbs/` at repo root mirroring the link path:
 * `مذكرات/علوم/X.pdf.link` -> `/.thumbs/مذكرات/علوم/X.pdf.jpg`
 * Returns null for non-PDF links (jpeg links use the image itself).
 */
export function thumbRawUrl(item: GithubItem): string | null {
  if (!item.download_url || item.type !== "file") return null
  const base = baseFileName(item.name)
  if (!base.toLowerCase().endsWith(".pdf")) return null
  const marker = "/main/"
  const idx = item.download_url.indexOf(marker)
  if (idx === -1) return null
  const prefix = item.download_url.slice(0, idx + marker.length)
  const rest = item.download_url.slice(idx + marker.length)
  const dirEnd = rest.lastIndexOf("/")
  const dir = dirEnd === -1 ? "" : rest.slice(0, dirEnd + 1)
  return `${prefix}.thumbs/${dir}${base}.jpg`
}

export function formatSize(bytes: number): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Fetch and sort the contents of a GitHub folder via the contents API. */
export async function fetchGitHubFolder(url: string): Promise<GithubItem[]> {
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
  })
  if (!res.ok) {
    throw new Error(`GitHub responded with ${res.status}`)
  }
  const data = await res.json()
  const list: GithubItem[] = Array.isArray(data) ? data : [data]
  list.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return list.filter((item) => !isHiddenItem(item))
}
