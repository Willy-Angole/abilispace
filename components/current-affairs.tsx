"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Newspaper,
  Search,
  Filter,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Volume2,
  Eye,
  Share2,
  MessageCircle,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  getArticles,
  getArticleById,
  getCategories,
  getBookmarks,
  bookmarkArticle,
  removeBookmark,
  getTrendingArticles,
  type Article,
  type ArticleFilters,
  type CategoryCount,
  type Pagination,
} from "@/lib/articles"
import { isAuthenticated } from "@/lib/auth"

interface CurrentAffairsProps {
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

// Debounce hook for search input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function CurrentAffairs({ user }: CurrentAffairsProps) {
  // Data state
  const [articles, setArticles] = useState<Article[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [categories, setCategories] = useState<CategoryCount[]>([])
  const [trendingArticles, setTrendingArticles] = useState<Article[]>([])

  // UI state
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [isBookmarking, setIsBookmarking] = useState(false)
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false)

  // Filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedRegion, setSelectedRegion] = useState<string>("all")
  const [selectedPriority, setSelectedPriority] = useState<string>("all")
  const [accessibilityFilters, setAccessibilityFilters] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  const { toast } = useToast()
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Build filters object
  const filters = useMemo<ArticleFilters>(() => {
    const f: ArticleFilters = {
      page: currentPage,
      limit: 12,
    }

    if (debouncedSearch) {
      f.search = debouncedSearch
    }
    if (selectedCategory !== "all") {
      f.category = selectedCategory
    }
    if (selectedRegion !== "all") {
      f.region = selectedRegion
    }
    if (selectedPriority !== "all") {
      f.priority = selectedPriority as 'high' | 'medium' | 'low'
    }
    if (accessibilityFilters.length > 0) {
      f.accessibilityFeatures = accessibilityFilters
    }

    return f
  }, [debouncedSearch, selectedCategory, selectedRegion, selectedPriority, accessibilityFilters, currentPage])

  // Fetch categories and trending on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [categoriesRes, trendingRes] = await Promise.all([
          getCategories(),
          getTrendingArticles(5),
        ])

        if (categoriesRes.success) {
          setCategories(categoriesRes.data)
        }
        if (trendingRes.success) {
          setTrendingArticles(trendingRes.data)
        }
      } catch (err) {
        console.error("Failed to fetch metadata:", err)
      }
    }

    fetchMetadata()
  }, [])

  // Fetch articles when filters change
  const fetchArticles = useCallback(async (append = false) => {
    if (!append) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
    }
    setError(null)

    try {
      let response
      
      if (showBookmarksOnly) {
        response = await getBookmarks(currentPage, 12)
      } else {
        response = await getArticles(filters)
      }

      if (response.success) {
        if (append) {
          setArticles((prev) => [...prev, ...response.data])
        } else {
          setArticles(response.data)
        }
        setPagination(response.pagination)
      } else {
        setError("Failed to load articles")
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load articles"
      setError(message)
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [filters, showBookmarksOnly, currentPage, toast])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  // Reset to page 1 when filters change (except page itself)
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [debouncedSearch, selectedCategory, selectedRegion, selectedPriority, accessibilityFilters, showBookmarksOnly])

  // Handle bookmark toggle
  const handleToggleBookmark = async (articleId: string, currentlyBookmarked: boolean) => {
    if (!isAuthenticated()) {
      toast({
        title: "Authentication Required",
        description: "Please log in to bookmark articles.",
        variant: "destructive",
      })
      return
    }

    setIsBookmarking(true)

    try {
      if (currentlyBookmarked) {
        await removeBookmark(articleId)
        // Update article in list
        setArticles((prev) =>
          prev.map((article) =>
            article.id === articleId ? { ...article, isBookmarked: false } : article
          )
        )
        // Update selected article if viewing
        if (selectedArticle?.id === articleId) {
          setSelectedArticle((prev) => prev ? { ...prev, isBookmarked: false } : prev)
        }
        toast({
          title: "Bookmark Removed",
          description: "Article removed from your bookmarks",
        })
      } else {
        await bookmarkArticle(articleId)
        // Update article in list
        setArticles((prev) =>
          prev.map((article) =>
            article.id === articleId ? { ...article, isBookmarked: true } : article
          )
        )
        // Update selected article if viewing
        if (selectedArticle?.id === articleId) {
          setSelectedArticle((prev) => prev ? { ...prev, isBookmarked: true } : prev)
        }
        toast({
          title: "Article Bookmarked",
          description: "Article saved for offline reading",
        })
      }
    } catch (err) {
      const message = (err as { message?: string })?.message || "Failed to update bookmark"
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsBookmarking(false)
    }
  }

  // View article details
  const handleViewArticle = async (article: Article) => {
    try {
      // Fetch fresh article data with full content
      const response = await getArticleById(article.id)
      if (response.success) {
        setSelectedArticle(response.data)
      } else {
        setSelectedArticle(article)
      }
    } catch {
      // Fall back to cached article data
      setSelectedArticle(article)
    }
  }

  // Toggle accessibility filter
  const toggleAccessibilityFilter = (filter: string) => {
    setAccessibilityFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    )
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
    setSelectedRegion("all")
    setSelectedPriority("all")
    setAccessibilityFilters([])
    setShowBookmarksOnly(false)
    setCurrentPage(1)
  }

  // Load more articles
  const loadMore = () => {
    if (pagination && currentPage < pagination.totalPages) {
      setCurrentPage((prev) => prev + 1)
      fetchArticles(true)
    }
  }

  // Utility functions
  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return "Just now"
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "secondary"
      default:
        return "secondary"
    }
  }

  // Check if filters are active
  const hasActiveFilters =
    searchQuery !== "" ||
    selectedCategory !== "all" ||
    selectedRegion !== "all" ||
    selectedPriority !== "all" ||
    accessibilityFilters.length > 0 ||
    showBookmarksOnly

  // Article Detail View
  if (selectedArticle) {
    return (
      <div className="space-y-6" role="main" aria-label="Article Details">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setSelectedArticle(null)}
            aria-label="Go back to articles list"
          >
            ← Back to Articles
          </Button>
          <Badge variant={getPriorityColor(selectedArticle.priority)}>
            {selectedArticle.priority.toUpperCase()} PRIORITY
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <div className="space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="space-y-2 flex-1">
                  <CardTitle className="text-2xl leading-tight">{selectedArticle.title}</CardTitle>
                  <CardDescription className="text-base">
                    {selectedArticle.source} • {formatTimeAgo(selectedArticle.publishedAt)} •{" "}
                    {selectedArticle.readTimeMinutes} min read
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleBookmark(selectedArticle.id, selectedArticle.isBookmarked || false)}
                    disabled={isBookmarking}
                    aria-label={selectedArticle.isBookmarked ? "Remove bookmark" : "Add bookmark"}
                  >
                    {isBookmarking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : selectedArticle.isBookmarked ? (
                      <BookmarkCheck className="h-4 w-4 text-primary" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" aria-label="Share article">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{selectedArticle.category}</Badge>
                <Badge variant="outline">{selectedArticle.region}</Badge>
                {selectedArticle.hasAudio && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Volume2 className="h-3 w-3" aria-hidden="true" />
                    Audio Available
                  </Badge>
                )}
                {selectedArticle.hasVideo && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Eye className="h-3 w-3" aria-hidden="true" />
                    Video Content
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <p className="font-medium text-sm">Accessibility Features:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedArticle.accessibilityFeatures.length > 0 ? (
                    selectedArticle.accessibilityFeatures.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">None specified</span>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose prose-sm max-w-none">
              <p className="text-lg font-medium text-muted-foreground leading-relaxed">
                {selectedArticle.summary}
              </p>
              {selectedArticle.content && (
                <div className="mt-6 space-y-4 text-foreground leading-relaxed">
                  {selectedArticle.content.split("\n").map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              )}
            </div>

            {selectedArticle.tags.length > 0 && (
              <div className="border-t pt-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-sm font-medium">Tags:</span>
                  {selectedArticle.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Discuss in Community
              </Button>
              {selectedArticle.sourceUrl && (
                <Button
                  variant="outline"
                  className="flex items-center gap-2 bg-transparent"
                  onClick={() => window.open(selectedArticle.sourceUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  View Original Source
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Articles List View
  return (
    <div className="space-y-6" role="main" aria-label="Current Affairs">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold">Current Affairs</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchArticles()}
            disabled={isLoading}
            aria-label="Refresh articles"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            aria-controls="filters-panel"
          >
            <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                Active
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search articles by title, content, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label="Search articles"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40" aria-label="Filter by category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.category} value={cat.category}>
                      {cat.category} ({cat.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="w-36" aria-label="Filter by region">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="National">National</SelectItem>
                  <SelectItem value="International">International</SelectItem>
                  <SelectItem value="Local">Local</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger className="w-32" aria-label="Filter by priority">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={showBookmarksOnly ? "default" : "outline"}
                onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
                className="flex items-center gap-2"
              >
                <Bookmark className="h-4 w-4" aria-hidden="true" />
                Bookmarks
              </Button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div id="filters-panel" className="border-t pt-4 space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-3 block">
                    Accessibility Features
                  </Label>
                  <div
                    className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
                    role="group"
                    aria-label="Accessibility feature filters"
                  >
                    {[
                      "Audio Description",
                      "Live Captions",
                      "Screen Reader Compatible",
                      "High Contrast Text",
                      "Sign Language",
                    ].map((feature) => (
                      <div key={feature} className="flex items-center space-x-2">
                        <Checkbox
                          id={`article-filter-${feature}`}
                          checked={accessibilityFilters.includes(feature)}
                          onCheckedChange={() => toggleAccessibilityFilter(feature)}
                        />
                        <Label htmlFor={`article-filter-${feature}`} className="text-sm cursor-pointer">
                          {feature}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span aria-live="polite">
          {isLoading ? (
            "Loading articles..."
          ) : (
            <>
              Showing {articles.length} of {pagination?.total || 0} articles
              {showBookmarksOnly && " (Bookmarks)"}
            </>
          )}
        </span>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={() => fetchArticles()} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && !error && (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Articles Grid */}
      {!isLoading && !error && (
        <div className="grid gap-4">
          {articles.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                <p className="text-muted-foreground">
                  {showBookmarksOnly
                    ? "You haven't bookmarked any articles yet."
                    : "No articles found matching your criteria. Try adjusting your filters."}
                </p>
              </CardContent>
            </Card>
          ) : (
            articles.map((article) => (
              <Card key={article.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getPriorityColor(article.priority)}>
                          {article.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{article.category}</Badge>
                        <Badge variant="outline">{article.region}</Badge>
                      </div>
                      <CardTitle className="text-lg leading-tight">{article.title}</CardTitle>
                      <CardDescription>
                        {article.source} • {formatTimeAgo(article.publishedAt)} •{" "}
                        {article.readTimeMinutes} min read
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {article.isBookmarked && (
                        <BookmarkCheck
                          className="h-4 w-4 text-primary"
                          aria-label="Bookmarked"
                        />
                      )}
                      {article.hasAudio && (
                        <Volume2
                          className="h-4 w-4 text-muted-foreground"
                          aria-label="Has audio"
                        />
                      )}
                      {article.hasVideo && (
                        <Eye
                          className="h-4 w-4 text-muted-foreground"
                          aria-label="Has video"
                        />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-2">
                    {article.summary}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {article.accessibilityFeatures.slice(0, 3).map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {article.accessibilityFeatures.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{article.accessibilityFeatures.length - 3} more
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleViewArticle(article)}>
                      Read Full Article
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleBookmark(article.id, article.isBookmarked || false)}
                      disabled={isBookmarking}
                      aria-label={article.isBookmarked ? "Remove bookmark" : "Add bookmark"}
                    >
                      {isBookmarking ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : article.isBookmarked ? (
                        <BookmarkCheck className="h-3 w-3 mr-1 text-primary" />
                      ) : (
                        <Bookmark className="h-3 w-3 mr-1" />
                      )}
                      {article.isBookmarked ? "Saved" : "Save"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Load More */}
      {pagination && currentPage < pagination.totalPages && !isLoading && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>Load More Articles</>
            )}
          </Button>
        </div>
      )}

      {/* Trending Articles Section */}
      {trendingArticles.length > 0 && !showBookmarksOnly && !hasActiveFilters && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5" aria-hidden="true" />
              Trending Articles
            </CardTitle>
            <CardDescription>Most popular articles this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trendingArticles.slice(0, 5).map((article, index) => (
                <button
                  key={article.id}
                  onClick={() => handleViewArticle(article)}
                  className="flex items-start gap-3 w-full text-left hover:bg-muted p-2 rounded-md transition-colors"
                >
                  <span className="text-2xl font-bold text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-2">{article.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {article.category} • {article.readTimeMinutes} min read
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
