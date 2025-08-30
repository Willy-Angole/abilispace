"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
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
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface NewsArticle {
  id: string
  title: string
  summary: string
  content: string
  category: string
  source: string
  publishedAt: string
  readTime: number
  tags: string[]
  isBookmarked?: boolean
  hasAudio?: boolean
  hasVideo?: boolean
  accessibilityFeatures: string[]
  region: string
  priority: "high" | "medium" | "low"
  imageAlt?: string
}

interface CurrentAffairsProps {
  user: any
}

export function CurrentAffairs({ user }: CurrentAffairsProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [filteredArticles, setFilteredArticles] = useState<NewsArticle[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedRegion, setSelectedRegion] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)
  const [accessibilityFilters, setAccessibilityFilters] = useState<string[]>([])
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null)
  const [bookmarkedArticles, setBookmarkedArticles] = useState<string[]>([])
  const { toast } = useToast()

  // Load articles and bookmarks on component mount
  useEffect(() => {
    loadArticles()
    loadBookmarks()
  }, [user.id])

  // Filter articles based on search and filters
  useEffect(() => {
    let filtered = articles

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (article) =>
          article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter((article) => article.category === selectedCategory)
    }

    // Region filter
    if (selectedRegion !== "all") {
      filtered = filtered.filter((article) => article.region === selectedRegion)
    }

    // Accessibility filters
    if (accessibilityFilters.length > 0) {
      filtered = filtered.filter((article) =>
        accessibilityFilters.every((filter) =>
          article.accessibilityFeatures.some((feature) => feature.toLowerCase().includes(filter.toLowerCase())),
        ),
      )
    }

    // Sort by priority and date
    filtered.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })

    setFilteredArticles(filtered)
  }, [articles, searchQuery, selectedCategory, selectedRegion, accessibilityFilters])

  const loadArticles = () => {
    const savedArticles = localStorage.getItem("accessibleApp_articles")
    if (savedArticles) {
      const loadedArticles = JSON.parse(savedArticles)
      setArticles(loadedArticles)
    } else {
      // Sample articles focused on disability rights and accessibility
      const sampleArticles: NewsArticle[] = [
        {
          id: "1",
          title: "New Accessibility Standards Approved for Public Transportation",
          summary:
            "Government announces comprehensive accessibility improvements for buses, trains, and stations across the country.",
          content:
            "The Ministry of Transportation has approved new accessibility standards that will require all public transportation systems to implement comprehensive accessibility features within the next two years. The standards include audio announcements, tactile guidance systems, wheelchair-accessible vehicles, and improved signage with high contrast and braille options. This landmark decision comes after extensive consultation with disability advocacy groups and represents a significant step forward in ensuring equal access to public transportation for all citizens.",
          category: "Policy",
          source: "Government Press Release",
          publishedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          readTime: 3,
          tags: ["transportation", "accessibility", "policy", "government"],
          hasAudio: true,
          hasVideo: false,
          accessibilityFeatures: ["Audio Description", "High Contrast Text", "Screen Reader Compatible"],
          region: "National",
          priority: "high",
          imageAlt: "Modern accessible bus with wheelchair ramp deployed",
        },
        {
          id: "2",
          title: "Technology Grant Program Launches for Assistive Device Innovation",
          summary:
            "New $50 million fund supports development of cutting-edge assistive technologies for people with disabilities.",
          content:
            "A groundbreaking $50 million grant program has been launched to accelerate the development of innovative assistive technologies. The program will fund research and development of devices ranging from advanced prosthetics to AI-powered communication aids. Priority will be given to projects that address gaps in current assistive technology markets, particularly for underserved communities. Applications are now open for researchers, startups, and established companies working on accessibility solutions.",
          category: "Technology",
          source: "Tech Innovation Daily",
          publishedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          readTime: 4,
          tags: ["technology", "grants", "innovation", "assistive-devices"],
          hasAudio: true,
          hasVideo: true,
          accessibilityFeatures: ["Audio Description", "Live Captions", "Screen Reader Compatible"],
          region: "International",
          priority: "high",
          imageAlt: "Researcher testing a robotic prosthetic arm in a laboratory setting",
        },
        {
          id: "3",
          title: "Employment Rights Victory: Landmark Discrimination Case Settled",
          summary: "Major corporation agrees to $2.5 million settlement in disability discrimination lawsuit.",
          content:
            "A major technology corporation has agreed to a $2.5 million settlement in a class-action lawsuit alleging systematic discrimination against employees with disabilities. The settlement includes not only financial compensation but also mandatory accessibility training for all managers and a commitment to improve workplace accommodations. The case, which took three years to resolve, is being hailed as a significant victory for disability rights advocates and sets an important precedent for future employment discrimination cases.",
          category: "Legal",
          source: "Legal Affairs Weekly",
          publishedAt: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
          readTime: 5,
          tags: ["employment", "discrimination", "legal", "rights"],
          hasAudio: false,
          hasVideo: false,
          accessibilityFeatures: ["High Contrast Text", "Screen Reader Compatible"],
          region: "National",
          priority: "medium",
          imageAlt: "Courthouse steps with people holding signs supporting disability rights",
        },
        {
          id: "4",
          title: "Breakthrough in Brain-Computer Interface Technology",
          summary:
            "New research shows promising results for helping paralyzed patients control devices with thought alone.",
          content:
            "Researchers at leading universities have achieved a major breakthrough in brain-computer interface technology, demonstrating that paralyzed patients can control computer cursors and robotic arms with unprecedented precision using only their thoughts. The study, published in a prestigious medical journal, shows success rates of over 90% in controlled trials. This technology could revolutionize independence for people with severe mobility impairments, offering new possibilities for communication, mobility, and daily living activities.",
          category: "Medical",
          source: "Medical Research Today",
          publishedAt: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
          readTime: 6,
          tags: ["medical", "research", "brain-computer-interface", "paralysis"],
          hasAudio: true,
          hasVideo: true,
          accessibilityFeatures: ["Audio Description", "Live Captions", "Screen Reader Compatible", "Sign Language"],
          region: "International",
          priority: "high",
          imageAlt: "Patient using brain-computer interface to control a robotic arm",
        },
        {
          id: "5",
          title: "Accessible Housing Initiative Receives Major Funding Boost",
          summary: "New $100 million program aims to create 5,000 fully accessible housing units over next five years.",
          content:
            "A comprehensive accessible housing initiative has received a major funding boost with the announcement of a $100 million program designed to create 5,000 fully accessible housing units over the next five years. The program will focus on universal design principles, ensuring that homes are accessible to people with various types of disabilities from the outset. Features will include roll-in showers, wider doorways, accessible kitchens, and smart home technology integration. Priority will be given to areas with the greatest need for accessible housing options.",
          category: "Housing",
          source: "Housing Development News",
          publishedAt: new Date(Date.now() - 28800000).toISOString(), // 8 hours ago
          readTime: 4,
          tags: ["housing", "accessibility", "funding", "universal-design"],
          hasAudio: false,
          hasVideo: true,
          accessibilityFeatures: ["Live Captions", "Screen Reader Compatible"],
          region: "National",
          priority: "medium",
          imageAlt: "Modern accessible apartment with wide doorways and roll-in shower",
        },
        {
          id: "6",
          title: "Digital Accessibility Audit Reveals Major Website Compliance Issues",
          summary:
            "Study of top 1000 websites finds 70% fail basic accessibility standards, prompting calls for stronger enforcement.",
          content:
            "A comprehensive audit of the top 1000 most visited websites has revealed that 70% fail to meet basic accessibility standards, making them difficult or impossible for people with disabilities to use. The study, conducted by accessibility experts, found common issues including missing alt text for images, poor color contrast, and lack of keyboard navigation support. Disability rights advocates are calling for stronger enforcement of digital accessibility laws and increased penalties for non-compliance. Several major companies have already announced plans to address the identified issues.",
          category: "Digital Rights",
          source: "Digital Accessibility Report",
          publishedAt: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
          readTime: 5,
          tags: ["digital-accessibility", "websites", "compliance", "audit"],
          hasAudio: true,
          hasVideo: false,
          accessibilityFeatures: ["Audio Description", "High Contrast Text", "Screen Reader Compatible"],
          region: "International",
          priority: "medium",
          imageAlt: "Person using screen reader software to navigate a website",
        },
      ]

      setArticles(sampleArticles)
      localStorage.setItem("accessibleApp_articles", JSON.stringify(sampleArticles))
    }
  }

  const loadBookmarks = () => {
    const savedBookmarks = localStorage.getItem(`accessibleApp_bookmarks_${user.id}`)
    if (savedBookmarks) {
      setBookmarkedArticles(JSON.parse(savedBookmarks))
    }
  }

  const toggleBookmark = (articleId: string) => {
    const updatedBookmarks = bookmarkedArticles.includes(articleId)
      ? bookmarkedArticles.filter((id) => id !== articleId)
      : [...bookmarkedArticles, articleId]

    setBookmarkedArticles(updatedBookmarks)
    localStorage.setItem(`accessibleApp_bookmarks_${user.id}`, JSON.stringify(updatedBookmarks))

    toast({
      title: bookmarkedArticles.includes(articleId) ? "Bookmark Removed" : "Article Bookmarked",
      description: bookmarkedArticles.includes(articleId)
        ? "Article removed from your bookmarks"
        : "Article saved to your bookmarks for offline reading",
    })
  }

  const toggleAccessibilityFilter = (filter: string) => {
    setAccessibilityFilters((prev) => (prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]))
  }

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

  if (selectedArticle) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setSelectedArticle(null)}>
            ← Back to Articles
          </Button>
          <Badge variant={getPriorityColor(selectedArticle.priority)}>
            {selectedArticle.priority.toUpperCase()} PRIORITY
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <CardTitle className="text-2xl leading-tight">{selectedArticle.title}</CardTitle>
                  <CardDescription className="text-base">
                    {selectedArticle.source} • {formatTimeAgo(selectedArticle.publishedAt)} • {selectedArticle.readTime}{" "}
                    min read
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleBookmark(selectedArticle.id)}
                    aria-label={bookmarkedArticles.includes(selectedArticle.id) ? "Remove bookmark" : "Add bookmark"}
                  >
                    {bookmarkedArticles.includes(selectedArticle.id) ? (
                      <BookmarkCheck className="h-4 w-4" />
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
                    <Volume2 className="h-3 w-3" />
                    Audio Available
                  </Badge>
                )}
                {selectedArticle.hasVideo && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Video Content
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <p className="font-medium text-sm">Accessibility Features:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedArticle.accessibilityFeatures.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose prose-sm max-w-none">
              <p className="text-lg font-medium text-muted-foreground leading-relaxed">{selectedArticle.summary}</p>
              <div className="mt-6 space-y-4 text-foreground leading-relaxed">
                {selectedArticle.content.split("\n").map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-sm font-medium">Tags:</span>
                {selectedArticle.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                  <MessageCircle className="h-4 w-4" />
                  Discuss in Community
                </Button>
                <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                  <ExternalLink className="h-4 w-4" />
                  View Original Source
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Current Affairs</h2>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Policy">Policy</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Legal">Legal</SelectItem>
                  <SelectItem value="Medical">Medical</SelectItem>
                  <SelectItem value="Housing">Housing</SelectItem>
                  <SelectItem value="Digital Rights">Digital Rights</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="National">National</SelectItem>
                  <SelectItem value="International">International</SelectItem>
                  <SelectItem value="Local">Local</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="border-t pt-4 space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-3 block">Accessibility Features</Label>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      "Audio Description",
                      "Live Captions",
                      "Screen Reader Compatible",
                      "High Contrast Text",
                      "Sign Language",
                    ].map((feature) => (
                      <div key={feature} className="flex items-center space-x-2">
                        <Checkbox
                          id={feature}
                          checked={accessibilityFilters.includes(feature)}
                          onCheckedChange={() => toggleAccessibilityFilter(feature)}
                        />
                        <Label htmlFor={feature} className="text-sm">
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
        <span>
          Showing {filteredArticles.length} of {articles.length} articles
        </span>
        {(searchQuery || selectedCategory !== "all" || selectedRegion !== "all" || accessibilityFilters.length > 0) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("")
              setSelectedCategory("all")
              setSelectedRegion("all")
              setAccessibilityFilters([])
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Articles Grid */}
      <div className="grid gap-4">
        {filteredArticles.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No articles found matching your criteria. Try adjusting your filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredArticles.map((article) => (
            <Card key={article.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getPriorityColor(article.priority)}>{article.priority.toUpperCase()}</Badge>
                      <Badge variant="outline">{article.category}</Badge>
                      <Badge variant="outline">{article.region}</Badge>
                    </div>
                    <CardTitle className="text-lg leading-tight">{article.title}</CardTitle>
                    <CardDescription>
                      {article.source} • {formatTimeAgo(article.publishedAt)} • {article.readTime} min read
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {bookmarkedArticles.includes(article.id) && <BookmarkCheck className="h-4 w-4 text-primary" />}
                    {article.hasAudio && <Volume2 className="h-4 w-4 text-muted-foreground" />}
                    {article.hasVideo && <Eye className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{article.summary}</p>

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
                  <Button size="sm" onClick={() => setSelectedArticle(article)}>
                    Read Full Article
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleBookmark(article.id)}
                    aria-label={bookmarkedArticles.includes(article.id) ? "Remove bookmark" : "Add bookmark"}
                  >
                    {bookmarkedArticles.includes(article.id) ? (
                      <BookmarkCheck className="h-3 w-3 mr-1" />
                    ) : (
                      <Bookmark className="h-3 w-3 mr-1" />
                    )}
                    {bookmarkedArticles.includes(article.id) ? "Saved" : "Save"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Bookmarked Articles Section */}
      {bookmarkedArticles.length > 0 && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              Your Bookmarked Articles ({bookmarkedArticles.length})
            </CardTitle>
            <CardDescription>Articles saved for offline reading and future reference</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your bookmarked articles are stored locally and available for offline reading. Access them anytime, even
              without an internet connection.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
