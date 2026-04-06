"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Star, GripVertical } from "lucide-react"
import { motion, Reorder } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Inter } from "next/font/google"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [texts, setTexts] = useState([])
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState("")
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)

  const reorderTimeout = useRef(null)

  useEffect(() => {
    getUser()
    fetchTexts()
  }, [])

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const fetchTexts = async () => {
    const { data } = await supabase
      .from("texts")
      .select("*")
      .order("position", { ascending: true })
    setTexts(data || [])
  }

  const addText = async () => {
    if (!user) return

    const maxPos = texts.length ? Math.max(...texts.map(t => t.position || 0)) : 0

    await supabase.from("texts").insert([
      {
        title,
        content,
        tags: tags.split(",").map(t => t.trim()),
        favorite: false,
        position: maxPos + 1,
        user_id: user.id
      }
    ])

    setTitle("")
    setContent("")
    setTags("")
    setShowModal(false)
    fetchTexts()
  }

  const deleteText = async (id) => {
    await supabase.from("texts").delete().eq("id", id)
    fetchTexts()
  }

  const toggleFavorite = async (id, value) => {
    await supabase
      .from("texts")
      .update({ favorite: !value })
      .eq("id", id)
    fetchTexts()
  }

  const handleReorder = (newIds) => {
    const newOrder = newIds.map(id => texts.find(t => t.id === id))
    setTexts(newOrder)

    if (reorderTimeout.current) clearTimeout(reorderTimeout.current)

    reorderTimeout.current = setTimeout(async () => {
      const updates = newOrder.map((t, idx) => ({ id: t.id, position: idx }))
      const { error } = await supabase.from("texts").upsert(updates, { onConflict: ["id"] })
      if (error) console.error("Failed to save positions:", error.message)
    }, 300)
  }

  const filteredTexts = texts.filter(
    t =>
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.content?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      <div className="border-b sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="max-w-5xl mx-auto p-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Text Dashboard</h1>
          {!user ? (
            <Button onClick={() => supabase.auth.signInWithOAuth({ provider: "github" })}>
              Login
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{user.email}</span>
              <Button variant="outline" onClick={() => supabase.auth.signOut()}>Logout</Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-6"
        />

        <Reorder.Group
          axis="y"
          values={texts.map(t => t.id)}
          onReorder={handleReorder}
          className="grid gap-4"
        >
          {filteredTexts.map((text) => (
            <Reorder.Item
              key={text.id}
              value={text.id}
              layout
              drag
              dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
            >
              <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="flex items-start justify-between p-4">
                  <div className="mr-2 cursor-grab text-gray-400">
                    <GripVertical size={20} />
                  </div>
                  <CardTitle className="text-lg font-medium text-gray-900">{text.title}</CardTitle>
                  {user?.id === text.user_id && (
                    <Button variant="destructive" size="sm" onClick={() => deleteText(text.id)}>Delete</Button>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  <p className="text-gray-700">{text.content}</p>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {text.tags?.map((tag, i) => (
                      <Badge key={i} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                  {user?.id === text.user_id && (
                    <Button variant="ghost" size="sm" className="mt-3" onClick={() => toggleFavorite(text.id, text.favorite)}>
                      <Star size={16} className={text.favorite ? "fill-yellow-400 text-yellow-400" : ""} />
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {filteredTexts.length === 0 && (
          <div className="text-center text-gray-500 mt-10">No results found</div>
        )}
      </div>

      {user && (
        <Button
          onClick={() => setShowModal(true)}
          className="fixed bottom-6 right-6 rounded-full w-14 h-14 text-xl"
        >
          +
        </Button>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Text</DialogTitle>
            <DialogDescription>
              Fill in the title, content, and optional tags for your new text item.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Text title"
            />
            <Textarea
              placeholder="Content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              aria-label="Text content"
            />
            <Input
              placeholder="Tags (comma-separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              aria-label="Text tags"
            />

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={addText}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}