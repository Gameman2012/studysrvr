import { toGithubApiUrl } from "@/lib/github"

const RAW_REPO_URL = import.meta.env.VITE_REPO_URL ?? ""

export const REPO_URL = toGithubApiUrl(RAW_REPO_URL)
