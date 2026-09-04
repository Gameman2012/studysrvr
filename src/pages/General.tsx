import { Link } from "react-router-dom"
import { Header } from "@/components/Header"
import { BookOpen, ImageIcon } from "lucide-react"

const sections = [
  { name: "مذكرات", to: "/m", icon: BookOpen },
  { name: "أسئلة", to: "/q", icon: ImageIcon },
]

export function General() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-5 py-10 md:py-14">
        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 transition hover:bg-secondary/60"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-6 w-6" />
              </span>
              <span className="text-lg font-semibold">{s.name}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
