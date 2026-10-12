import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { ArrowRight, Send } from "lucide-react"
import { Header } from "@/components/Header"
import { Button } from "@/components/ui/button"

const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN ?? ""
const CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID ?? ""

const LABELS: Record<string, string> = {
  suggestion: "💡 اقتراح جديد",
  issue: "🐞 بلاغ مشكلة",
}

export function Feedback() {
  const [type, setType] = useState("suggestion")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    document.title = "Study Hub - اقتراح"
  }, [])

  const send = async () => {
    const text = message.trim()
    if (text.length < 5) {
      toast.error("الرسالة قصيرة جداً.")
      return
    }
    if (!BOT_TOKEN || !CHAT_ID) {
      toast.error("إعدادات تيليجرام ناقصة في .env")
      return
    }
    setSending(true)
    try {
      const body = `${LABELS[type]}\n———————————\n📝 الرسالة:\n${text}`
      const res = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: CHAT_ID, text: body }),
        },
      )
      const data = await res.json()
      if (data.ok) {
        toast.success("✅ وصلت لتيليجرام!")
        setMessage("")
      } else {
        toast.error("❌ فشل: " + (data.description || "خطأ"))
      }
    } catch (e) {
      toast.error("❌ خطأ شبكة: " + (e as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-xl px-5 py-10">
        <Link
          to="/m"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" />
          رجوع
        </Link>
        <h1 className="mt-4 text-2xl font-bold">💬 اقتراح أو بلاغ</h1>

        <label className="mt-6 block text-sm font-medium">النوع</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="mt-2 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="suggestion">💡 اقتراح</option>
          <option value="issue">🐞 بلاغ مشكلة</option>
        </select>

        <label className="mt-4 block text-sm font-medium">النص</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="اكتب اقتراحك أو البلاغ..."
          maxLength={2000}
          rows={6}
          className="mt-2 w-full resize-vertical rounded-md border border-border bg-card px-3 py-2 text-sm"
        />

        <Button onClick={send} disabled={sending} className="mt-4 w-full">
          <Send className="h-4 w-4" />
          {sending ? "جاري الإرسال..." : "إرسال"}
        </Button>
      </main>
    </div>
  )
}
