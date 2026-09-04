import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Toaster } from "sonner"
import { General } from "@/pages/General"
import { Home } from "@/pages/Home"
import { Questions } from "@/pages/Questions"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<General />} />
        <Route path="/m" element={<Home />} />
        <Route path="/q" element={<Questions />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </BrowserRouter>
  )
}
