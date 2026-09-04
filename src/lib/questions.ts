export type QuestionImage = {
  q: string
  a: string
  title?: string
}

export type QuestionsFile = {
  title?: string
  questions: QuestionImage[]
}

export function isQuestionsFile(name: string): boolean {
  return name.toLowerCase().endsWith(".json")
}

function toRawUrl(apiUrl: string): string {
  const match = apiUrl.match(
    /api\.github\.com\/repos\/([^/]+)\/([^/]+)\/contents\/([^?]+)\?.*ref=([^&]+)/,
  )
  if (!match) return apiUrl
  const [, owner, repo, path, branch] = match
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
}

export async function fetchQuestionsFile(url: string): Promise<QuestionsFile> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`GitHub responded with ${res.status}`)
  }
  const apiData = await res.json()
  const rawUrl = apiData.download_url ?? toRawUrl(url)
  const fileRes = await fetch(rawUrl)
  if (!fileRes.ok) {
    throw new Error(`Failed to fetch file: ${fileRes.status}`)
  }
  const data = await fileRes.json()
  return {
    title: data.title,
    questions: Array.isArray(data.questions) ? data.questions : [],
  }
}
