"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Camera, Heart, ImagePlus, MessageCircle, Repeat2, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/components/language-provider"
import { uploadAvatar, type User } from "@/lib/auth"
import {
  addComment,
  createThought,
  deleteComment,
  deleteThought,
  likeComment,
  reshareComment,
  unlikeComment,
  followUser,
  likeThought,
  listComments,
  listSponsoredThoughts,
  listThoughts,
  shareThought,
  uploadThoughtPhoto,
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

function ThoughtText({ text, moreLabel, lessLabel }: { text: string; moreLabel: string; lessLabel: string }) {
  const [expanded, setExpanded] = useState(false)
  const long = text.length > 280 || text.split("\n").length > 6
  return (
    <div className="mt-1">
      <p className={`whitespace-pre-wrap text-sm ${long && !expanded ? "line-clamp-4" : ""}`}>{text}</p>
      {long && (
        <button
          type="button"
          className="mt-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      )}
    </div>
  )
}

function ThoughtPhoto({ src, alt, className, imgClassName }: { src: string; alt: string; className?: string; imgClassName?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className={`block w-full cursor-zoom-in rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className || "mt-3"}`}
        onClick={() => setOpen(true)}
        aria-label={alt}
      >
        <img src={src} alt="" className={`w-full rounded-md object-cover ${imgClassName || "max-h-96"}`} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl border-0 bg-black p-2 text-white sm:max-w-5xl">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <img src={src} alt={alt} className="max-h-[85vh] w-full object-contain" />
        </DialogContent>
      </Dialog>
    </>
  )
}

export function ThoughtsFeed({ user, onUserUpdate }: { user: User; onUserUpdate?: (user: User) => void }) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [feed, setFeed] = useState<"community" | "following">("community")
  const [thoughts, setThoughts] = useState<Thought[]>([])
  const [sponsored, setSponsored] = useState<Thought[]>([])
  const [draft, setDraft] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoDragging, setPhotoDragging] = useState(false)
  const [requestSponsorship, setRequestSponsorship] = useState(false)
  const [sponsorName, setSponsorName] = useState("")
  const photoInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [updatingAvatar, setUpdatingAvatar] = useState(false)
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

  useEffect(() => {
    void listSponsoredThoughts()
      .then((response) => setSponsored(response.data || []))
      .catch(() => setSponsored([]))
  }, [])

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

  const clearPhoto = () => {
    setPhoto(null)
    setPhotoPreview((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
    if (photoInputRef.current) photoInputRef.current.value = ""
  }

  const choosePhoto = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast({ title: t("thoughtsAddPhoto"), description: t("thoughtsPhotoType"), variant: "destructive" })
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: t("thoughtsAddPhoto"), description: t("thoughtsPhotoSize"), variant: "destructive" })
      return
    }
    setPhoto(file)
    setPhotoPreview((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })
  }

  const changeAvatar = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast({ title: t("thoughtsChangeAvatar"), description: t("thoughtsPhotoType"), variant: "destructive" })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t("thoughtsChangeAvatar"), description: t("thoughtsAvatarSize"), variant: "destructive" })
      return
    }
    setUpdatingAvatar(true)
    try {
      const response = await uploadAvatar(file)
      if (!response.avatarUrl) return
      const nextUser = { ...user, avatarUrl: response.avatarUrl }
      onUserUpdate?.(nextUser)
      setThoughts((prev) => prev.map((item) => (
        item.author.id === user.id
          ? { ...item, author: { ...item.author, avatarUrl: response.avatarUrl } }
          : item
      )))
      setOpenComments((prev) => {
        const next = { ...prev }
        for (const id of Object.keys(next)) {
          const list = next[id]
          if (!Array.isArray(list)) continue
          next[id] = list.map((comment) => (
            comment.author.id === user.id
              ? { ...comment, author: { ...comment.author, avatarUrl: response.avatarUrl } }
              : comment
          ))
        }
        return next
      })
    } catch (error) {
      toast({
        title: t("thoughtsChangeAvatar"),
        description: error instanceof Error ? error.message : t("thoughtsLoadError"),
        variant: "destructive",
      })
    } finally {
      setUpdatingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ""
    }
  }

  const publish = async () => {
    const body = draft.trim()
    if (!body && !photo) return
    setPosting(true)
    try {
      const imageUrl = photo ? await uploadThoughtPhoto(photo) : undefined
      const sponsorship = requestSponsorship ? { sponsorName: sponsorName.trim() } : undefined
      const response = await createThought(body, imageUrl, sponsorship)
      setThoughts((prev) => [response.data, ...prev])
      setDraft("")
      setRequestSponsorship(false)
      setSponsorName("")
      clearPhoto()
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

  const replaceComment = (thoughtId: string, updated: ThoughtComment) => {
    setOpenComments((prev) => {
      const current = prev[thoughtId]
      if (!Array.isArray(current)) return prev
      return { ...prev, [thoughtId]: current.map((item) => (item.id === updated.id ? updated : item)) }
    })
  }

  const toggleCommentLike = async (thoughtId: string, comment: ThoughtComment) => {
    try {
      const response = comment.likedByMe
        ? await unlikeComment(thoughtId, comment.id)
        : await likeComment(thoughtId, comment.id)
      replaceComment(thoughtId, response.data)
    } catch (error) {
      toast({
        title: t("thoughtsLike"),
        description: error instanceof Error ? error.message : t("thoughtsLoadError"),
        variant: "destructive",
      })
    }
  }

  const reshareAsThought = async (thoughtId: string, commentId: string) => {
    try {
      const response = await reshareComment(thoughtId, commentId)
      setThoughts((prev) => [response.data, ...prev])
    } catch (error) {
      toast({
        title: t("thoughtsReshare"),
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
    <div className="mx-auto grid w-full max-w-5xl items-start gap-8 lg:grid-cols-[minmax(0,36rem)_17rem]">
      <div className="min-w-0 space-y-5">
      <Card
        onDragOver={(event) => {
          event.preventDefault()
          setPhotoDragging(true)
        }}
        onDragLeave={() => setPhotoDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setPhotoDragging(false)
          choosePhoto(event.dataTransfer.files?.[0])
        }}
        className={`gap-0 py-0 ${photoDragging ? "ring-2 ring-primary" : ""}`}
      >
        <CardContent className="px-4 py-3">
          <h1 className="text-sm font-medium text-muted-foreground">{t("thoughtsCreatePost")}</h1>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              className="relative mt-1 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => avatarInputRef.current?.click()}
              disabled={updatingAvatar}
              aria-label={t("thoughtsChangeAvatar")}
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.avatarUrl} alt="" />
                <AvatarFallback>{initials({ id: user.id, firstName: user.firstName, lastName: user.lastName })}</AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Camera className="size-2.5" aria-hidden="true" />
              </span>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="sr-only"
              onChange={(event) => void changeAvatar(event.target.files?.[0])}
            />
            <div className="min-w-0 flex-1">
              <label htmlFor="thought-composer" className="sr-only">{t("thoughtsPrompt")}</label>
              <Textarea
                id="thought-composer"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t("thoughtsPromptName").replace("{name}", user.firstName)}
                maxLength={2000}
                rows={2}
                className="min-h-14 resize-none border-0 bg-transparent px-0 py-1 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0 md:text-base"
              />
              {photoPreview && (
                <div className="relative mt-2">
                  <ThoughtPhoto src={photoPreview} alt={t("thoughtsAddPhoto")} className="mt-0" imgClassName="max-h-64" />
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute right-2 top-2 size-8"
                    aria-label={t("thoughtsRemovePhoto")}
                    onClick={clearPhoto}
                  >
                    <X />
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="mt-2 space-y-2 border-t pt-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={requestSponsorship}
                onChange={(event) => setRequestSponsorship(event.target.checked)}
              />
              {t("thoughtsRequestSponsor")}
            </label>
            {requestSponsorship && (
              <input
                value={sponsorName}
                onChange={(event) => setSponsorName(event.target.value)}
                placeholder={t("thoughtsSponsorName")}
                maxLength={120}
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <input
              ref={photoInputRef}
              id="thought-photo"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="sr-only"
              onChange={(event) => choosePhoto(event.target.files?.[0])}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-pressed={Boolean(photo)}
              aria-label={t("thoughtsAddPhoto")}
              title={t("thoughtsDropPhoto")}
              onClick={() => photoInputRef.current?.click()}
            >
              <ImagePlus className="text-primary" />
              {t("thoughtsAddPhoto")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void publish()}
              disabled={posting || (!draft.trim() && !photo) || (requestSponsorship && sponsorName.trim().length < 2)}
            >
              {posting ? t("thoughtsLoading") : t("thoughtsPost")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 border-b" role="tablist" aria-label={t("thoughts")}>
        {(["community", "following"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={feed === option}
            className={`-mb-px border-b-2 pb-2 text-sm ${feed === option ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground"}`}
            onClick={() => setFeed(option)}
          >
            {option === "community" ? t("thoughtsEveryone") : t("thoughtsFollowing")}
          </button>
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
                <Card className="gap-0 py-0">
                  <CardContent className="space-y-3 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={thought.author.avatarUrl} alt="" />
                        <AvatarFallback>{initials(thought.author)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{nameOf(thought.author)}</p>
                            {thought.sponsorshipStatus === "pending" && (
                              <p className="text-xs text-primary">{t("thoughtsSponsorPending")}</p>
                            )}
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
                              {thought.original.body && (
                                <ThoughtText
                                  text={thought.original.body}
                                  moreLabel={t("thoughtsShowMore")}
                                  lessLabel={t("thoughtsShowLess")}
                                />
                              )}
                              {thought.original.imageUrl && (
                                <ThoughtPhoto
                                  src={thought.original.imageUrl}
                                  alt={t("thoughtsPhotoAlt").replace("{name}", nameOf(thought.original.author))}
                                />
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            {thought.body && (
                              <div className="mt-2">
                                <ThoughtText
                                  text={thought.body}
                                  moreLabel={t("thoughtsShowMore")}
                                  lessLabel={t("thoughtsShowLess")}
                                />
                              </div>
                            )}
                            {thought.imageUrl && (
                              <ThoughtPhoto
                                src={thought.imageUrl}
                                alt={t("thoughtsPhotoAlt").replace("{name}", nameOf(thought.author))}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1 border-t pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-pressed={thought.likedByMe}
                        aria-label={thought.likedByMe ? t("thoughtsLiked") : t("thoughtsLike")}
                        onClick={() => void toggleLike(thought)}
                      >
                        <Heart className={thought.likedByMe ? "fill-current text-[var(--as-red)]" : ""} />
                        {thought.likeCount}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={t("thoughtsComment")}
                        onClick={() => void toggleComments(thought.id)}
                      >
                        <MessageCircle />
                        {thought.commentCount}
                      </Button>
                      {!mine && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-pressed={thought.sharedByMe}
                          aria-label={thought.sharedByMe ? t("thoughtsShared") : t("thoughtsShare")}
                          onClick={() => void toggleShare(thought)}
                        >
                          <Repeat2 />
                          {thought.shareCount}
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
                              <li key={comment.id} className="flex items-start gap-2">
                                <Avatar className="mt-0.5 h-7 w-7 shrink-0">
                                  <AvatarImage src={comment.author.avatarUrl} alt="" />
                                  <AvatarFallback className="text-[10px]">{initials(comment.author)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm">
                                    <span className="font-medium">{nameOf(comment.author)}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {" · "}
                                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                    </span>
                                  </p>
                                  <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
                                  <div className="mt-1 flex gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2"
                                      aria-pressed={comment.likedByMe}
                                      aria-label={comment.likedByMe ? t("thoughtsLiked") : t("thoughtsLike")}
                                      onClick={() => void toggleCommentLike(thought.id, comment)}
                                    >
                                      <Heart className={comment.likedByMe ? "fill-current text-[var(--as-red)]" : ""} />
                                      {comment.likeCount}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2"
                                      aria-label={t("thoughtsReshare")}
                                      onClick={() => void reshareAsThought(thought.id, comment.id)}
                                    >
                                      <Repeat2 />
                                      {t("thoughtsReshare")}
                                    </Button>
                                  </div>
                                </div>
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
                          className="flex items-center gap-2"
                          onSubmit={(event) => {
                            event.preventDefault()
                            void submitComment(thought)
                          }}
                        >
                          <label className="sr-only" htmlFor={`comment-${thought.id}`}>{t("thoughtsWriteComment")}</label>
                          <input
                            id={`comment-${thought.id}`}
                            value={commentDrafts[thought.id] || ""}
                            onChange={(event) => setCommentDrafts((prev) => ({ ...prev, [thought.id]: event.target.value }))}
                            placeholder={t("thoughtsWriteComment")}
                            maxLength={1000}
                            className="h-9 min-w-0 flex-1 rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <Button type="submit" size="sm" disabled={!(commentDrafts[thought.id] || "").trim()}>
                            {t("thoughtsPost")}
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

      {sponsored.length > 0 && (
        <aside className="space-y-3 lg:sticky lg:top-6" aria-label={t("thoughtsSponsored")}>
          <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {t("thoughtsSponsored")}
          </h2>
          <ul className="space-y-3">
            {sponsored.map((thought) => (
              <li key={thought.id}>
                <Card className="gap-0 py-0">
                  <CardContent className="space-y-2 px-3 py-3">
                    <p className="text-sm font-medium">{thought.sponsorName || nameOf(thought.author)}</p>
                    <ThoughtText
                      text={thought.body}
                      moreLabel={t("thoughtsShowMore")}
                      lessLabel={t("thoughtsShowLess")}
                    />
                    {thought.imageUrl && (
                      <ThoughtPhoto
                        src={thought.imageUrl}
                        alt={t("thoughtsPhotoAlt").replace("{name}", thought.sponsorName || nameOf(thought.author))}
                        className="mt-1"
                        imgClassName="max-h-36"
                      />
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  )
}
