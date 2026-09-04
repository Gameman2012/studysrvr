import { toGithubApiUrl } from "@/lib/github"

const RAW_REPO_URL = import.meta.env.VITE_REPO_URL ?? ""
const RAW_QUESTIONS_REPO_URL =
  import.meta.env.VITE_QUESTIONS_REPO_URL ?? RAW_REPO_URL

export const REPO_URL = toGithubApiUrl(RAW_REPO_URL)
export const QUESTIONS_REPO_URL = RAW_QUESTIONS_REPO_URL.includes("github")
  ? toGithubApiUrl(RAW_QUESTIONS_REPO_URL)
  : RAW_QUESTIONS_REPO_URL
