"use client"

import { useCallback, useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Heart, MessageCircle, Repeat2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/components/language-provider"
import type { User } from "@/lib/auth"
import {
  addComment,
  createThought,
  deleteComment,
  deleteThought,
  followUser,
  likeThought,
  listComments,
  listThoughts,
  shareThought,
  unfollowUser,
  unlikeThought,
  unshareThought,
  type Thought,
  type ThoughtAuthor,
  type ThoughtComment,
} from "@/lib/thoughts"

function initials(author: ThoughtAuthor) {
  return `${author.firstName?.[0] || ""}${author.lastName?.[0] || ""}`.toUpperCase() || "U"
}

function nameOf(author: ThoughtAuthor) {
  return `${author.firstName} ${author.lastName}`.trim()
}

export function ThoughtsFeed({ user }: { user: User }) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [feed, setFeed] = useState<"community" | "following">("community")
  const [thoughts, setThoughts] = useState<Thought[]>([])
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [openComments, setOpenComments] = useState<Record<string, ThoughtComment[] | "loading">>({})
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})

  const load = useCallback(async (nextFeed: "community" | "following") => {
    setLoading(true)
    try {
      const response = await listThoughts(nextFeed)
      setThoughts(response.data || [])
    } catch (error) {
      toast({
        title: t("thoughts"),
        description: error instanceof Error ? error.message : t("thoughtsLoadError"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [t, toast])

  useEffect(() => {
    void load(feed)
  }, [feed, load])

  const replaceThought = (updated: Thought) => {
    setThoughts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
  }

  const markFollowing = (authorId: string, following: boolean) => {
    setThoughts((prev) =>
      prev.map((item) =>
        item.author.id === authorId ? { ...item, followingAuthor: following } : item
      )
    )
  }

  const publish = async () => {
    const body = draft.trim()
    if (!body) return
    setPosting(true)
    try {
      const response = await createThought(body)
      setThoughts((prev) => [response.data, ...prev])
      setDraft("")
    } catch (error) {
      toast({
        title: t("thoughtsPost"),
        description: error instanceof Error ? error.message : t("thoughtsLoadError"),
        variant: "destructive",
      })
    } finally {
      setPosting(false)
    }
  }

  const toggleLike = async (thought: Thought) => {
    try {
      const response = thought.likedByMe ? await unlikeThought(thought.id) : await likeThought(thought.id)
      replaceThought(response.data)
    } catch (error) {
      toast({
        title: t("thoughtsLike"),
        description: error instanceof Error ? error.message : t("thoughtsLoadError"),
        variant: "destructive",
      })
    }
  }

  const toggleShare = async (thought: Thought) => {
    try {
      if (thought.sharedByMe) {
        await unshareThought(thought.id)
        await load(feed)
        return
      }
      const response = await shareThought(thought.id)
      setThoughts((prev) => [response.data, ...prev.map((item) => (
        item.id === thought.id ? { ...item, sharedByMe: true, shareCount: item.shareCount + 1 } : item
      ))])
    } catch (error) {
      toast({
        title: t("thoughtsShare"),
        description: error instanceof Error ? error.message : t("thoughtsLoadError"),
        variant: "destructive",
      })
    }
  }

  const toggleFollow = async (author: ThoughtAuthor, following: boolean) => {
    try {
      if (following) await unfollowUser(author.id)
      else await followUser(author.id)
      markFollowing(author.id, !following)
    } catch (error) {
      toast({
        title: t("thoughtsFollow"),
        description: error instanceof Error ? error.message : t("thoughtsLoadError"),
        variant: "destructive",
      })
    }
  }

  const toggleComments = async (thoughtId: string) => {
    if (openComments[thoughtId]) {
      setOpenComments((prev) => {
        const next = { ...prev }
        delete next[thoughtId]
        return next
      })
      return
    }
    setOpenComments((prev) => ({ ...prev, [thoughtId]: "loading" }))
    try {
      const response = await listComments(thoughtId)
      setOpenComments((prev) => ({ ...prev, [thoughtId]: response.data || [] }))
    } catch (error) {
      setOpenComments((prev) => {
        const next = { ...prev }
        delete next[thoughtId]
        return next
      })
      toast({
        title: t("thoughtsComment"),
        description: error instanceof Error ? error.message : t("thoughtsLoadError"),
        variant: "destructive",
      })
    }
  }

  const submitComment = async (thought: Thought) => {
    const body = (commentDrafts[thought.id] || "").trim()
    if (!body) return
    try {
      const response = await addComment(thought.id, body)
      setOpenComments((prev) => {
        const current = prev[thought.id]
        const list = Array.isArray(current) ? current : []
        return { ...prev, [thought.id]: [...list, response.data] }
      })
      setCommentDrafts((prev) => ({ ...prev, [thought.id]: "" }))
      replaceThought({ ...thought, commentCount: thought.commentCount + 1 })
    } catch (error) {
      toast({
        title: t("thoughtsComment"),
        description: error instanceof Error ? error.message : t("thoughtsLoadError"),
        variant: "destructive",
      })
    }
  }

  const removeThought = async (id: string) => {
    try {
      await deleteThought(id)
      setThoughts((prev) => prev.filter((item) => item.id !== id))
    } catch (error) {
      toast({
        title: t("thoughtsDelete"),
        description: error instanceof Error ? error.message : t("thoughtsLoadError"),
        variant: "destructive",
      })
    }
  }

  const removeComment = async (thought: Thought, commentId: string) => {
    try {
      await deleteComment(thought.id, commentId)
      setOpenComments((prev) => {
        const current = prev[thought.id]
        const list = Array.isArray(current) ? current.filter((item) => item.id !== commentId) : []
        return { ...prev, [thought.id]: list }
      })
      replaceThought({ ...thought, commentCount: Math.max(0, thought.commentCount - 1) })
    } catch (error) {
      toast({
        title: t("thoughtsDelete"),
        description: error instanceof Error ? error.message : t("thoughtsLoadError"),
        variant: "destructive",
      })
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("thoughts")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("thoughtsSubtitle")}</p>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <label htmlFor="thought-composer" className="sr-only">{t("thoughtsPrompt")}</label>
          <Textarea
            id="thought-composer"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("thoughtsPrompt")}
            maxLength={2000}
            rows={3}
          />
          <div className="flex justify-end">
            <Button type="button" onClick={() => void publish()} disabled={posting || !draft.trim()}>
              {t("thoughtsPost")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2" role="tablist" aria-label={t("thoughts")}>
        {(["community", "following"] as const).map((option) => (
          <Button
            key={option}
            type="button"
            role="tab"
            aria-selected={feed === option}
            variant={feed === option ? "default" : "outline"}
            onClick={() => setFeed(option)}
          >
            {option === "community" ? t("thoughtsEveryone") : t("thoughtsFollowing")}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("thoughtsLoading")}</p>
      ) : thoughts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("thoughtsEmpty")}</p>
      ) : (
        <ul className="space-y-3">
          {thoughts.map((thought) => {
            const comments = openComments[thought.id]
            const mine = thought.author.id === user.id
            return (
              <li key={thought.id}>
                <Card>
                  <CardContent className="space-y-3 pt-5">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={thought.author.avatarUrl} alt="" />
                        <AvatarFallback>{initials(thought.author)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{nameOf(thought.author)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(thought.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {!mine && (
                              <Button
                                type="button"
                                size="sm"
                                variant={thought.followingAuthor ? "secondary" : "outline"}
                                aria-pressed={thought.followingAuthor}
                                onClick={() => void toggleFollow(thought.author, thought.followingAuthor)}
                              >
                                {thought.followingAuthor ? t("thoughtsFollowingUser") : t("thoughtsFollow")}
                              </Button>
                            )}
                            {mine && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label={t("thoughtsDelete")}
                                onClick={() => void removeThought(thought.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {thought.original ? (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs text-muted-foreground">{t("thoughtsSharedAThought")}</p>
                            <div className="rounded-md border bg-muted/40 p-3">
                              <p className="text-xs font-medium">{nameOf(thought.original.author)}</p>
                              <p className="mt-1 whitespace-pre-wrap text-sm">{thought.original.body}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-3 whitespace-pre-wrap text-sm">{thought.body}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 border-t pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-pressed={thought.likedByMe}
                        onClick={() => void toggleLike(thought)}
                      >
                        <Heart className={thought.likedByMe ? "fill-current text-[var(--as-red)]" : ""} />
                        {thought.likedByMe ? t("thoughtsLiked") : t("thoughtsLike")}
                        <span className="text-muted-foreground">{thought.likeCount}</span>
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => void toggleComments(thought.id)}>
                        <MessageCircle />
                        {t("thoughtsComment")}
                        <span className="text-muted-foreground">{thought.commentCount}</span>
                      </Button>
                      {!mine && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-pressed={thought.sharedByMe}
                          onClick={() => void toggleShare(thought)}
                        >
                          <Repeat2 />
                          {thought.sharedByMe ? t("thoughtsShared") : t("thoughtsShare")}
                          <span className="text-muted-foreground">{thought.shareCount}</span>
                        </Button>
                      )}
                    </div>

                    {comments && (
                      <div className="space-y-3 border-t pt-3">
                        {comments === "loading" ? (
                          <p className="text-sm text-muted-foreground">{t("thoughtsLoading")}</p>
                        ) : (
                          <ul className="space-y-2">
                            {comments.map((comment) => (
                              <li key={comment.id} className="flex items-start justify-between gap-2">
                                <p className="text-sm">
                                  <span className="font-medium">{nameOf(comment.author)} </span>
                                  <span className="whitespace-pre-wrap">{comment.body}</span>
                                </p>
                                {comment.mine && (
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    aria-label={t("thoughtsDelete")}
                                    onClick={() => void removeComment(thought, comment.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                        <form
                          className="flex gap-2"
                          onSubmit={(event) => {
                            event.preventDefault()
                            void submitComment(thought)
                          }}
                        >
                          <label className="sr-only" htmlFor={`comment-${thought.id}`}>{t("thoughtsWriteComment")}</label>
                          <Textarea
                            id={`comment-${thought.id}`}
                            value={commentDrafts[thought.id] || ""}
                            onChange={(event) => setCommentDrafts((prev) => ({ ...prev, [thought.id]: event.target.value }))}
                            placeholder={t("thoughtsWriteComment")}
                            rows={2}
                            maxLength={1000}
                          />
                          <Button type="submit" disabled={!(commentDrafts[thought.id] || "").trim()}>
                            {t("thoughtsComment")}
                          </Button>
                        </form>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
