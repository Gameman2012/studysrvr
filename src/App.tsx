import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Toaster } from "sonner"
import { General } from "@/pages/General"
import { Home } from "@/pages/Home"
import { FileViewer } from "@/pages/FileViewer"
import { Feedback } from "@/pages/Feedback"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<General />} />
        <Route path="/m" element={<Home />} />
        <Route path="/f" element={<FileViewer />} />
        <Route path="/feedback" element={<Feedback />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </BrowserRouter>
  )
}
