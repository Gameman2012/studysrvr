import { Link } from "react-router-dom"
import { MessageSquareText } from "lucide-react"
import { Button } from "@/components/ui/button"

export function FeedbackFab() {
  return (
    <Button
      asChild
      size="icon"
      title="اقتراح أو بلاغ"
      aria-label="اقتراح أو بلاغ"
      className="fixed bottom-4 left-4 z-50 size-12 rounded-full shadow-lg"
    >
      <Link to="/feedback">
        <MessageSquareText className="h-5 w-5" />
      </Link>
    </Button>
  )
}
