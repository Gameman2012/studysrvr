import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { ArrowRight, ArrowLeft, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react"
import { Header } from "@/components/Header"
import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs"
import { Skeleton } from "@/components/ui/skeleton"
import { QUESTIONS_REPO_URL } from "@/config"
import {
  fetchGitHubFolder,
  contentUrl,
  type GithubItem,
} from "@/lib/github"
import {
  fetchQuestionsFile,
  type QuestionsFile,
} from "@/lib/questions"

const isLocalFile = QUESTIONS_REPO_URL.endsWith(".json")

function buildCrumbs(root: string, p: string): Crumb[] {
  const crumbs: Crumb[] = [{ name: "Home", url: root }]
  const segs = p.split("/").filter(Boolean)
  let acc = ""
  for (const s of segs) {
    acc = acc ? `${acc}/${s}` : s
    crumbs.push({ name: s, url: contentUrl(root, acc) })
  }
  return crumbs
}

export function Questions() {
  const [searchParams, setSearchParams] = useSearchParams()
  const p = searchParams.get("p") ?? ""
  const f = searchParams.get("f")
  const i = Math.max(0, parseInt(searchParams.get("i") ?? "0", 10) || 0)

  const [crumbs, setCrumbs] = useState<Crumb[]>([])
  const [items, setItems] = useState<GithubItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const [activeFile, setActiveFile] = useState<QuestionsFile | null>(null)
  const [activeFileName, setActiveFileName] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [finished, setFinished] = useState(false)
  const clickTimerRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const hasDraggedRef = useRef(false)

  const loadFolder = async (url: string) => {
    setLoading(true)
    setError("")
    setActiveFile(null)
    setFinished(false)
    try {
      const list = await fetchGitHubFolder(url)
      setItems(list)
    } catch {
      setError("Couldn't load the repository. Check that the link is set correctly.")
      setItems([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    setError("")

    if (isLocalFile) {
      const name = QUESTIONS_REPO_URL.split("/").pop() ?? "اختبار"
      fetchQuestionsFile(QUESTIONS_REPO_URL)
        .then((data) => {
          console.log("[Q] local file loaded:", data)
          setActiveFile(data)
          setActiveFileName(name)
          setCrumbs([{ name: name, url: QUESTIONS_REPO_URL }])
          const total = data.questions.length
          setCurrentIndex(total ? Math.min(Math.max(0, i), total - 1) : 0)
          setFlipped(false)
          setScale(1)
          setPan({ x: 0, y: 0 })
          setFinished(false)
        })
        .catch((e) => { console.error("[Q] local file error:", e); setError("تعذّر قراءة ملف الأسئلة.") })
        .finally(() => setLoading(false))
      return
    }

    if (f) {
      const url = contentUrl(QUESTIONS_REPO_URL, p ? `${p}/${f}` : f)
      console.log("[Q] fetching file:", url)
      fetchQuestionsFile(url)
        .then((data) => {
          console.log("[Q] file loaded:", data)
          setActiveFile(data)
          setActiveFileName(f)
          setCrumbs([...buildCrumbs(QUESTIONS_REPO_URL, p), { name: f, url }])
          const total = data.questions.length
          setCurrentIndex(total ? Math.min(Math.max(0, i), total - 1) : 0)
          setFlipped(false)
          setScale(1)
          setPan({ x: 0, y: 0 })
          setFinished(false)
        })
        .catch((e) => { console.error("[Q] file error:", e); setError("تعذّر قراءة ملف الأسئلة.") })
        .finally(() => setLoading(false))
    } else {
      const url = contentUrl(QUESTIONS_REPO_URL, p)
      setCrumbs(buildCrumbs(QUESTIONS_REPO_URL, p))
      loadFolder(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p, f])

  useEffect(() => {
    if (!activeFile) return
    const total = activeFile.questions.length
    setCurrentIndex(total ? Math.min(Math.max(0, i), total - 1) : 0)
    setFlipped(false)
    setScale(1)
    setPan({ x: 0, y: 0 })
    setFinished(false)
  }, [i, activeFile])

  // عند 100% رجّع الصورة للنص تلقائياً
  useEffect(() => {
    if (scale === 1 && (pan.x !== 0 || pan.y !== 0)) {
      setPan({ x: 0, y: 0 })
    }
  }, [scale, pan.x, pan.y])

  const setParams = (next: Record<string, string>) => setSearchParams(next)

  const goIndex = (idx: number) => {
    const params: Record<string, string> = {}
    if (p) params.p = p
    if (f) params.f = f
    params.i = String(idx)
    setParams(params)
  }

  const next = () => {
    if (!activeFile) return
    if (currentIndex < activeFile.questions.length - 1) goIndex(currentIndex + 1)
    else setFinished(true)
  }

  const prev = () => {
    if (currentIndex > 0) goIndex(currentIndex - 1)
  }

  const backToFolder = () => {
    const params: Record<string, string> = {}
    if (p) params.p = p
    setParams(params)
  }

  const openDir = (item: GithubItem) => {
    const np = p ? `${p}/${item.name}` : item.name
    setParams({ p: np })
  }

  const openFile = (item: GithubItem) => {
    const params: Record<string, string> = {}
    if (p) params.p = p
    params.f = item.name
    params.i = "0"
    setParams(params)
  }

  const goToCrumb = (index: number) => {
    const names = crumbs.slice(1, index + 1).map((c) => c.name)
    const np = names.join("/")
    const params: Record<string, string> = {}
    if (np) params.p = np
    setParams(params)
  }

  const refresh = () => {
    setRefreshing(true)
    if (activeFile && f) {
      const url = contentUrl(QUESTIONS_REPO_URL, p ? `${p}/${f}` : f)
      fetchQuestionsFile(url)
        .then((data) => {
          setActiveFile(data)
          setFlipped(false)
          setScale(1)
          setPan({ x: 0, y: 0 })
          setCurrentIndex(0)
          setFinished(false)
        })
        .catch(() => setError("تعذّر قراءة ملف الأسئلة."))
        .finally(() => setRefreshing(false))
    } else {
      loadFolder(contentUrl(QUESTIONS_REPO_URL, p))
    }
  }

  const question = activeFile?.questions[currentIndex]
  const total = activeFile?.questions.length ?? 0
  const isLast = total > 0 && currentIndex === total - 1

  if (activeFile && !loading) {
    console.log("[Q] state:", JSON.stringify({
      questionsLen: activeFile.questions.length,
      questions: activeFile.questions.map((q) => ({ q: q.q?.slice(0, 50), a: q.a?.slice(0, 50) })),
      total,
      currentIndex,
      question,
      flipped,
    }))
  }

  const zoomIn = () => setScale((s) => Math.min(3, +(s + 0.25).toFixed(2)))
  const zoomOut = () => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))
  const resetZoom = () => { setScale(1); setPan({ x: 0, y: 0 }) }
  const toggleZoom = () => {
    setScale((s) => {
      const next = s === 1 ? 2 : 1
      if (next === 1) setPan({ x: 0, y: 0 })
      return next
    })
  }

  const handleCardClick = () => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false
      return
    }
    if (clickTimerRef.current !== null) {
      // double click -> zoom (within cooldown)
      window.clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
      toggleZoom()
      return
    }
    // cooldown to confirm it's a single click, not a double
    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = null
      if (hasDraggedRef.current) { hasDraggedRef.current = false; return }
      setFlipped((v) => !v)
      setPan({ x: 0, y: 0 })
    }, 300)
  }

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (scale <= 1) return
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    isDraggingRef.current = true
    hasDraggedRef.current = false
    dragStartRef.current = { x: clientX, y: clientY, panX: pan.x, panY: pan.y }
  }

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingRef.current || scale <= 1) return
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    const dx = clientX - dragStartRef.current.x
    const dy = clientY - dragStartRef.current.y
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) hasDraggedRef.current = true
    setPan({ x: dragStartRef.current.panX + dx, y: dragStartRef.current.panY + dy })
  }

  const handlePointerUp = () => {
    isDraggingRef.current = false
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 py-4 md:py-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            أسئلة
          </h1>
        </div>

        {loading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-10 text-center">
            <p className="mx-auto mb-4 max-w-md rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
            {crumbs.length > 0 && (
              <button
                type="button"
                onClick={backToFolder}
                className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition hover:bg-secondary/70"
              >
                <ArrowRight className="h-4 w-4" />
                رجوع للمجلد
              </button>
            )}
          </div>
        ) : activeFile ? (
          finished ? (
            <div className="mt-10 text-center">
              <p className="mb-2 text-lg font-semibold">انتهيت من الأسئلة 🎉</p>
              <p className="mb-6 text-sm text-muted-foreground">
                لقد استعرضت جميع الأسئلة في هذا الملف.
              </p>
              <button
                type="button"
                onClick={backToFolder}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                <ArrowRight className="h-4 w-4" />
                رجوع للمجلد
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <p className="mb-3 text-center text-xs text-muted-foreground">
                {activeFileName}
              </p>

              {/* Top navigation: <-- number --> */}
              <div className="mb-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={backToFolder}
                  className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground transition hover:bg-secondary/70"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  رجوع
                </button>

                <div className="flex items-center gap-1 rounded-full border border-border bg-card px-1 py-1 shadow-sm">
                  <button
                    type="button"
                    onClick={prev}
                    disabled={currentIndex === 0}
                    aria-label="السابق"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition hover:bg-secondary/70 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <span className="min-w-[80px] text-center text-sm font-semibold tabular-nums">
                    {currentIndex + 1} / {total}
                  </span>
                  <button
                    type="button"
                    onClick={next}
                    disabled={isLast}
                    aria-label="التالي"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                </div>

                {isLast ? (
                  <button
                    type="button"
                    onClick={next}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                  >
                    انتهى
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <div className="w-[68px]" aria-hidden />
                )}
              </div>

              {/* Flip card + zoom */}
              <div className="group relative">
                {/* Zoom controls */}
                <div className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-full border border-border bg-card/90 px-1 py-1 shadow-md backdrop-blur">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); zoomOut() }}
                    disabled={scale <= 0.5}
                    aria-label="تصغير"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-secondary disabled:opacity-30"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="min-w-[36px] text-center text-[11px] font-medium tabular-nums">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); zoomIn() }}
                    disabled={scale >= 3}
                    aria-label="تكبير"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-secondary disabled:opacity-30"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <div className="mx-0.5 h-4 w-px bg-border" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); resetZoom() }}
                    aria-label="إعادة الضبط"
                    title="إعادة الضبط"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-secondary"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Card - ضغطة/ضغطتين على الصورة فقط */}
                <div
                  className="flip-perspective select-none"
                  onWheel={(e) => {
                    if (e.ctrlKey || e.metaKey) {
                      e.preventDefault()
                      if (e.deltaY < 0) zoomIn()
                      else zoomOut()
                    }
                  }}
                >
                  <div
                    className={`flip-inner relative w-full ${flipped ? "flip-flipped" : ""}`}
                  >
                    {/* Front - Question */}
                    <div className="flip-face overflow-hidden rounded-2xl border border-border bg-card">
                      <div className="p-2 sm:p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground">السؤال</p>
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Maximize2 className="h-3 w-3" /> ضغطة للقلب · ضغطتين للتكبير
                          </span>
                        </div>
                        <div
                          className="flex items-center justify-center overflow-hidden rounded-xl border border-border bg-background touch-none select-none"
                          style={{ maxHeight: "min(48vh, calc(100dvh - 280px))", minHeight: "32vh", cursor: scale > 1 ? (isDraggingRef.current ? "grabbing" : "grab") : "pointer" }}
                          onMouseDown={handlePointerDown}
                          onMouseMove={handlePointerMove}
                          onMouseUp={handlePointerUp}
                          onMouseLeave={handlePointerUp}
                          onTouchStart={handlePointerDown}
                          onTouchMove={handlePointerMove}
                          onTouchEnd={handlePointerUp}
                        >
                          {question && (
                            <img
                              src={question.q}
                              alt={`سؤال ${currentIndex + 1}`}
                              draggable={false}
                              onClick={handleCardClick}
                              title={flipped ? "ضغطة للسؤال · ضغطتين للتكبير" : "ضغطة للإجابة · ضغطتين للتكبير"}
                              className="h-auto max-h-[min(48vh,calc(100dvh-280px))] w-auto max-w-full cursor-pointer object-contain transition-transform duration-200 will-change-transform"
                              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: "center center" }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Back - Answer */}
                    <div className="flip-face flip-back overflow-hidden rounded-2xl border border-border bg-card">
                      <div className="p-2 sm:p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-medium text-primary">الإجابة</p>
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Maximize2 className="h-3 w-3" /> ضغطة للرجوع · ضغطتين للتكبير
                          </span>
                        </div>
                        <div
                          className="flex items-center justify-center overflow-hidden rounded-xl border border-border bg-background touch-none select-none"
                          style={{ maxHeight: "min(48vh, calc(100dvh - 280px))", minHeight: "32vh", cursor: scale > 1 ? (isDraggingRef.current ? "grabbing" : "grab") : "pointer" }}
                          onMouseDown={handlePointerDown}
                          onMouseMove={handlePointerMove}
                          onMouseUp={handlePointerUp}
                          onMouseLeave={handlePointerUp}
                          onTouchStart={handlePointerDown}
                          onTouchMove={handlePointerMove}
                          onTouchEnd={handlePointerUp}
                        >
                          {question && (
                            <img
                              src={question.a}
                              alt={`إجابة ${currentIndex + 1}`}
                              draggable={false}
                              onClick={handleCardClick}
                              title="ضغطة للسؤال · ضغطتين للتكبير"
                              className="h-auto max-h-[min(48vh,calc(100dvh-280px))] w-auto max-w-full cursor-pointer object-contain transition-transform duration-200 will-change-transform"
                              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: "center center" }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          <>
            {crumbs.length > 0 && (
              <Breadcrumbs
                crumbs={crumbs}
                onNavigate={goToCrumb}
                onRefresh={refresh}
                refreshing={refreshing}
              />
            )}

            {items.length === 0 ? (
              <p className="mt-10 text-center text-sm text-muted-foreground">
                This folder is empty.
              </p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
                {items.map((item, idx) => {
                  const isDir = item.type === "dir"
                  return (
                    <button
                      key={item.path || `${item.name}-${idx}`}
                      type="button"
                      onClick={() => (isDir ? openDir(item) : openFile(item))}
                      className="group flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left transition last:border-b-0 hover:bg-secondary/60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {item.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {isDir ? "مجلد · Folder" : "ملف أسئلة · JSON"}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
