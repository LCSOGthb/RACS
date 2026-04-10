"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Inter } from "next/font/google"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronUp, ChartNoAxesCombined, Plus, X } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

const inter = Inter({
  subsets: ["latin"],
})

const STATUS_OPTIONS = ["Reported", "Reviewed", "Pending"]

function formatDate(dateStr) {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function MetricCard({ title, value, diff, onClick }) {
  const up = diff > 0
  const down = diff < 0

  return (
    <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.99 }} onClick={onClick} className="cursor-pointer">
      <Card className="border-zinc-200/70 bg-white/90 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-zinc-500 tracking-tight">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between gap-3">
          <div className="text-4xl font-semibold tracking-tight text-zinc-950">
            {value}
          </div>
          <div className="flex items-center gap-1 text-sm font-medium">
            {up && (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <ChevronUp className="h-4 w-4" />
                {Math.abs(diff)}
              </span>
            )}
            {down && (
              <span className="inline-flex items-center gap-1 text-rose-600">
                <ChevronDown className="h-4 w-4" />
                {Math.abs(diff)}
              </span>
            )}
            {!up && !down && <span className="text-zinc-400">0</span>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [reports, setReports] = useState([])
  const [selected, setSelected] = useState(null)
  const [showChart, setShowChart] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    username: "",
    game: "",
    status: "reported",
    reported_date: "",
    reported_time: "",
    video_url: "",
    notes: "",
  })

  useEffect(() => {
    getUser()
    fetchReports()
  }, [])

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const fetchReports = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("reported_date", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Failed to fetch reports:", error)
      setReports([])
    } else {
      setReports(data || [])
    }
    setLoading(false)
  }

  const resetForm = () => {
    setForm({
      username: "",
      game: "",
      status: "reported",
      reported_date: "",
      reported_time: "",
      video_url: "",
      notes: "",
    })
  }

  const addReport = async () => {
    if (!user) return
    if (!form.username.trim() || !form.reported_date) return

    setSubmitting(true)

    const payload = {
      username: form.username.trim(),
      game: form.game.trim() || null,
      status: form.status,
      reported_date: form.reported_date,
      reported_time: form.reported_time || null,
      video_url: form.video_url.trim() || null,
      notes: form.notes.trim() || null,
      created_by: user.id,
    }

    const { error } = await supabase.from("reports").insert([payload])

    if (error) {
      console.error("Failed to create report:", error.message, error.details, error.hint)
      setSubmitting(false)
      return
    }

    resetForm()
    setShowAdd(false)
    setSubmitting(false)
    fetchReports()
  }

  const login = async () => {
    await supabase.auth.signInWithOAuth({ provider: "github" })
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return reports
    return reports.filter((r) =>
      [r.username, r.game, r.status, r.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    )
  }, [reports, search])

  const stats = useMemo(() => {
    const now = new Date()
    const todayKey = now.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const yesterdayKey = yesterday.toDateString()

    const startOfWeek = new Date(now)
    startOfWeek.setHours(0, 0, 0, 0)
    startOfWeek.setDate(now.getDate() - now.getDay())

    const startOfPrevWeek = new Date(startOfWeek)
    startOfPrevWeek.setDate(startOfWeek.getDate() - 7)
    const endOfPrevWeek = new Date(startOfWeek)
    endOfPrevWeek.setMilliseconds(-1)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfPrevMonth = new Date(startOfMonth)
    endOfPrevMonth.setMilliseconds(-1)

    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const startOfPrevYear = new Date(now.getFullYear() - 1, 0, 1)
    const endOfPrevYear = new Date(startOfYear)
    endOfPrevYear.setMilliseconds(-1)

    const dates = reports.map((r) => {
      const d = new Date(`${r.reported_date}T00:00:00`)
      return { raw: r, date: d }
    })

    const today = dates.filter(({ date }) => date.toDateString() === todayKey).length
    const yesterdayCount = dates.filter(({ date }) => date.toDateString() === yesterdayKey).length

    const week = dates.filter(({ date }) => date >= startOfWeek).length
    const prevWeek = dates.filter(({ date }) => date >= startOfPrevWeek && date < startOfWeek).length

    const month = dates.filter(({ date }) => date >= startOfMonth).length
    const prevMonth = dates.filter(({ date }) => date >= startOfPrevMonth && date < startOfMonth).length

    const year = dates.filter(({ date }) => date >= startOfYear).length
    const prevYear = dates.filter(({ date }) => date >= startOfPrevYear && date < startOfYear).length

    return {
      today,
      week,
      month,
      year,
      todayDiff: today - yesterdayCount,
      weekDiff: week - prevWeek,
      monthDiff: month - prevMonth,
      yearDiff: year - prevYear,
    }
  }, [reports])

  return (
    <div className={`${inter.className} min-h-screen bg-zinc-50 text-zinc-950`}>
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">RACS</h1>
            <p className="text-sm text-zinc-500">Anti-cheat intelligence dashboard</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowChart(true)} className="gap-2">
              <ChartNoAxesCombined className="h-4 w-4" />
              Analytics
            </Button>
            {user ? (
              <>
                <Button onClick={() => setShowAdd(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add report
                </Button>
                <Button variant="outline" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              <Button onClick={login}>Login</Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Today's cheaters" value={stats.today} diff={stats.todayDiff} onClick={() => setShowChart(true)} />
          <MetricCard title="Week" value={stats.week} diff={stats.weekDiff} onClick={() => setShowChart(true)} />
          <MetricCard title="Month" value={stats.month} diff={stats.monthDiff} onClick={() => setShowChart(true)} />
          <MetricCard title="Year" value={stats.year} diff={stats.yearDiff} onClick={() => setShowChart(true)} />
        </div>

        <div className="mt-6">
          <Input
            placeholder="Search username, game, status, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 rounded-2xl border-zinc-200 bg-white shadow-sm"
          />
        </div>

        <section className="mt-6 grid gap-4">
          {loading ? (
            <Card className="border-zinc-200/70 bg-white/90">
              <CardContent className="p-6 text-sm text-zinc-500">Loading reports…</CardContent>
            </Card>
          ) : filteredReports.length === 0 ? (
            <Card className="border-dashed border-zinc-300 bg-white/70">
              <CardContent className="px-6 py-16 text-center text-zinc-500">
                <div className="text-lg font-medium text-zinc-800">No reports yet</div>
                <div className="mt-1 text-sm">Add the first incident to populate the dashboard.</div>
              </CardContent>
            </Card>
          ) : (
            filteredReports.map((report) => (
              <motion.button
                key={report.id}
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelected(report)}
                className="text-left"
              >
                <Card className="border-zinc-200/70 bg-white/95 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                    <div>
                      <CardTitle className="text-base font-semibold tracking-tight">{report.username}</CardTitle>
                      <div className="mt-1 text-sm text-zinc-500">
                        {report.game || "No game"} • {formatDate(report.reported_date)}{report.reported_time ? ` • ${report.reported_time}` : ""}
                      </div>
                    </div>

                    <Badge className="rounded-full px-3 py-1 capitalize">
                      {report.status}
                    </Badge>
                  </CardHeader>

                  <CardContent className="flex items-center justify-between gap-3 pt-0">
                    <div className="max-w-3xl text-sm text-zinc-600 line-clamp-2">
                      {report.notes || "No notes attached."}
                    </div>
                    {report.video_url ? (
                      <Badge variant="secondary" className="shrink-0 rounded-full">
                        Video attached
                      </Badge>
                    ) : null}
                  </CardContent>
                </Card>
              </motion.button>
            ))
          )}
        </section>
      </main>

      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">{selected.username}</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {selected.game || "No game"} • {formatDate(selected.reported_date)}{selected.reported_time ? ` • ${selected.reported_time}` : ""}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelected(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-zinc-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Status</div>
                  <div className="mt-1 text-sm font-medium capitalize">{selected.status}</div>
                </div>

                <div className="rounded-2xl bg-zinc-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Video</div>
                  <div className="mt-1 text-sm font-medium break-all">{selected.video_url || "No video attached"}</div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-zinc-50 p-4">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Notes</div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                  {selected.notes || "No notes provided."}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={() => setSelected(null)}>Close</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChart && (
          <motion.div
            className="fixed inset-0 z-50 bg-zinc-950 p-4 text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="mx-auto flex h-full max-w-6xl flex-col">
              <div className="flex items-center justify-between py-2">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Fullscreen analytics</h2>
                  <p className="text-sm text-zinc-400">Chart view placeholder for the full report timeline.</p>
                </div>
                <Button variant="secondary" onClick={() => setShowChart(false)}>
                  Close
                </Button>
              </div>

              <div className="mt-6 grid flex-1 place-items-center rounded-3xl border border-white/10 bg-white/5 p-8">
                <div className="text-center">
                  <ChartNoAxesCombined className="mx-auto h-12 w-12 text-zinc-300" />
                  <div className="mt-4 text-lg font-medium">Chart module next</div>
                  <div className="mt-1 text-sm text-zinc-400">
                    We will place the full-screen trend chart here.
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl tracking-tight">Add report</DialogTitle>
            <DialogDescription>
              Enter the incident details used by the anti-cheat dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 pt-2 md:grid-cols-2">
            <Input
              placeholder="Username *"
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            />
            <Input
              placeholder="Game"
              value={form.game}
              onChange={(e) => setForm((p) => ({ ...p, game: e.target.value }))}
            />
            <Input
              type="date"
              value={form.reported_date}
              onChange={(e) => setForm((p) => ({ ...p, reported_date: e.target.value }))}
            />
            <Input
              type="time"
              value={form.reported_time}
              onChange={(e) => setForm((p) => ({ ...p, reported_time: e.target.value }))}
            />
            <select
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <Input
              placeholder="Video URL"
              value={form.video_url}
              onChange={(e) => setForm((p) => ({ ...p, video_url: e.target.value }))}
            />
            <Textarea
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="min-h-32 md:col-span-2"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button onClick={addReport} disabled={submitting}>
              {submitting ? "Saving…" : "Save report"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}