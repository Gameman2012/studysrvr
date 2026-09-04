import { Link } from "react-router-dom"
import { GraduationCap } from "lucide-react"

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-border px-5 py-4 md:px-8">
      <Link to="/" className="flex items-center gap-2 font-semibold">
        <GraduationCap className="h-6 w-6 text-primary" />
        <span>Study Hub</span>
      </Link>
    </header>
  )
}
