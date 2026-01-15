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
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Calendar, MapPin, Users, Search, Filter, Accessibility, Video, Heart, Loader2, RefreshCw, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  getEvents,
  getEventById,
  getCategories,
  getAccessibilityFeatures as fetchAccessibilityFeatures,
  registerForEvent,
  cancelRegistration,
  type Event,
  type EventFilters,
  type CategoryCount,
  type AccessibilityFeature,
  type Pagination,
} from "@/lib/events"
import { isAuthenticated } from "@/lib/auth"

interface EventDiscoveryProps {
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

type EventType = 'virtual' | 'in_person' | 'hybrid'

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

export function EventDiscovery({ user }: EventDiscoveryProps) {
  // Data state
  const [events, setEvents] = useState<Event[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [categories, setCategories] = useState<CategoryCount[]>([])
  const [accessibilityOptions, setAccessibilityOptions] = useState<AccessibilityFeature[]>([])

  // UI state
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [showAccommodationDialog, setShowAccommodationDialog] = useState(false)
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false)
  const [pendingWithdrawEventId, setPendingWithdrawEventId] = useState<string | null>(null)
  const [accommodationNotes, setAccommodationNotes] = useState("")
  const [pendingRegistrationEventId, setPendingRegistrationEventId] = useState<string | null>(null)

  // Filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [accessibilityFilters, setAccessibilityFilters] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  const { toast } = useToast()
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Build filters object
  const filters = useMemo<EventFilters>(() => {
    const f: EventFilters = {
      page: currentPage,
      limit: 12,
    }

    if (debouncedSearch) {
      f.search = debouncedSearch
    }
    if (selectedCategory !== "all") {
      f.category = selectedCategory
    }
    if (selectedType !== "all") {
      f.type = selectedType as EventType
    }
    if (accessibilityFilters.length > 0) {
      f.accessibilityFeatures = accessibilityFilters
    }

    return f
  }, [debouncedSearch, selectedCategory, selectedType, accessibilityFilters, currentPage])

  // Fetch categories and accessibility features on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [categoriesRes, featuresRes] = await Promise.all([
          getCategories(),
          fetchAccessibilityFeatures(),
        ])

        if (categoriesRes.success) {
          setCategories(categoriesRes.data)
        }
        if (featuresRes.success) {
          setAccessibilityOptions(featuresRes.data)
        }
      } catch (err) {
        console.error("Failed to fetch metadata:", err)
      }
    }

    fetchMetadata()
  }, [])

  // Fetch events when filters change
  const fetchEvents = useCallback(async (append = false) => {
    if (!append) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
    }
    setError(null)

    try {
      const response = await getEvents(filters)

      if (response.success) {
        if (append) {
          setEvents((prev) => [...prev, ...response.data])
        } else {
          setEvents(response.data)
        }
        setPagination(response.pagination)
      } else {
        setError("Failed to load events")
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load events"
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
  }, [filters, toast])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Reset to page 1 when filters change (except page itself)
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [debouncedSearch, selectedCategory, selectedType, accessibilityFilters])

  // Handle registration
  const handleRegister = async (eventId: string, withAccommodation = false) => {
    if (!isAuthenticated()) {
      toast({
        title: "Authentication Required",
        description: "Please log in to register for events.",
        variant: "destructive",
      })
      return
    }

    if (withAccommodation && !showAccommodationDialog) {
      setPendingRegistrationEventId(eventId)
      setShowAccommodationDialog(true)
      return
    }

    setIsRegistering(true)

    try {
      const response = await registerForEvent({
        eventId,
        accommodationNotes: accommodationNotes || undefined,
      })

      if (response.success) {
        // Update event in list
        setEvents((prev) =>
          prev.map((event) =>
            event.id === eventId
              ? { ...event, isRegistered: true, registeredCount: event.registeredCount + 1 }
              : event
          )
        )

        // Update selected event if viewing
        if (selectedEvent?.id === eventId) {
          setSelectedEvent((prev) =>
            prev ? { ...prev, isRegistered: true, registeredCount: prev.registeredCount + 1 } : prev
          )
        }

        toast({
          title: "Registration Successful!",
          description: "You have been registered for this event.",
        })

        // Reset state
        setShowAccommodationDialog(false)
        setAccommodationNotes("")
        setPendingRegistrationEventId(null)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to register"
      
      // Provide user-friendly messages for common errors
      let title = "Registration Failed"
      let description = message
      
      if (message.toLowerCase().includes("full") || message.toLowerCase().includes("capacity")) {
        title = "Event Full"
        description = "Sorry, this event has reached its maximum capacity. Please check back later or browse other events."
        
        // Update the event's registered count to show it's full
        setEvents((prev) =>
          prev.map((event) =>
            event.id === eventId
              ? { ...event, registeredCount: event.capacity }
              : event
          )
        )
        
        if (selectedEvent?.id === eventId) {
          setSelectedEvent((prev) =>
            prev ? { ...prev, registeredCount: prev.capacity } : prev
          )
        }
      } else if (message.toLowerCase().includes("past")) {
        title = "Event Expired"
        description = "This event has already passed and registration is no longer available."
      } else if (message.toLowerCase().includes("already registered")) {
        title = "Already Registered"
        description = "You are already registered for this event."
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      })
    } finally {
      setIsRegistering(false)
    }
  }

  // Handle withdrawal request - show confirmation dialog
  const handleWithdrawRequest = (eventId: string) => {
    setPendingWithdrawEventId(eventId)
    setShowWithdrawDialog(true)
  }

  // Handle confirmed withdrawal
  const handleUnregister = async (eventId: string) => {
    if (!isAuthenticated()) {
      toast({
        title: "Authentication Required",
        description: "Please log in to manage registrations.",
        variant: "destructive",
      })
      return
    }

    setIsRegistering(true)
    setShowWithdrawDialog(false)

    try {
      const response = await cancelRegistration(eventId)

      if (response.success) {
        // Update event in list
        setEvents((prev) =>
          prev.map((event) =>
            event.id === eventId
              ? { ...event, isRegistered: false, registeredCount: Math.max(0, event.registeredCount - 1) }
              : event
          )
        )

        // Update selected event if viewing
        if (selectedEvent?.id === eventId) {
          setSelectedEvent((prev) =>
            prev ? { ...prev, isRegistered: false, registeredCount: Math.max(0, prev.registeredCount - 1) } : prev
          )
        }

        toast({
          title: "Registration Withdrawn",
          description: "Your spot has been freed up for others. Thank you for letting us know!",
        })
      }
    } catch (err) {
      const message = (err as { message?: string })?.message || "Failed to withdraw registration"
      toast({
        title: "Withdrawal Failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsRegistering(false)
      setPendingWithdrawEventId(null)
    }
  }

  // View event details
  const handleViewEvent = async (event: Event) => {
    try {
      // Fetch fresh event data
      const response = await getEventById(event.id)
      if (response.success) {
        setSelectedEvent(response.data)
      } else {
        setSelectedEvent(event)
      }
    } catch {
      // Fall back to cached event data
      setSelectedEvent(event)
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
    setSelectedType("all")
    setAccessibilityFilters([])
    setCurrentPage(1)
  }

  // Load more events
  const loadMore = () => {
    if (pagination && currentPage < pagination.totalPages) {
      setCurrentPage((prev) => prev + 1)
      fetchEvents(true)
    }
  }

  // Utility functions
  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case "virtual":
        return <Video className="h-4 w-4" aria-hidden="true" />
      case "in_person":
        return <MapPin className="h-4 w-4" aria-hidden="true" />
      case "hybrid":
        return <Users className="h-4 w-4" aria-hidden="true" />
      default:
        return <Calendar className="h-4 w-4" aria-hidden="true" />
    }
  }

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case "virtual":
        return "Virtual"
      case "in_person":
        return "In-Person"
      case "hybrid":
        return "Hybrid"
      default:
        return type
    }
  }

  const formatCategory = (category: string) => {
    // Capitalize first letter of each word
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (timeString: string) => {
    // Handle HH:MM:SS or HH:MM format
    const [hours, minutes] = timeString.split(":")
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? "PM" : "AM"
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  // Check if filters are active
  const hasActiveFilters =
    searchQuery !== "" ||
    selectedCategory !== "all" ||
    selectedType !== "all" ||
    accessibilityFilters.length > 0

  // Event Detail View
  if (selectedEvent) {
    return (
      <div className="space-y-6" role="main" aria-label="Event Details">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setSelectedEvent(null)}
            aria-label="Go back to events list"
          >
            ← Back to Events
          </Button>
          <h2 className="text-2xl font-bold">Event Details</h2>
        </div>

        <Card>
          {/* Event Poster Image */}
          {selectedEvent.imageUrl && (
            <div className="relative w-full h-48 sm:h-64 md:h-80 overflow-hidden rounded-t-lg">
              <img
                src={selectedEvent.imageUrl}
                alt={selectedEvent.imageAlt || `${selectedEvent.title} poster`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedEvent.registeredCount >= selectedEvent.capacity && (
                    <Badge variant="destructive">FULL</Badge>
                  )}
                  <Badge variant={selectedEvent.eventType === "virtual" ? "secondary" : "default"}>
                    {getEventTypeLabel(selectedEvent.eventType)}
                  </Badge>
                  {selectedEvent.isFeatured && (
                    <Badge variant="default" className="bg-yellow-500">Featured</Badge>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <CardHeader>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="space-y-2">
                <CardTitle className="text-2xl">{selectedEvent.title}</CardTitle>
                <CardDescription className="text-base">
                  Organized by {selectedEvent.organizerName}
                </CardDescription>
              </div>
              {!selectedEvent.imageUrl && (
                <div className="flex items-center gap-2">
                  {selectedEvent.registeredCount >= selectedEvent.capacity && (
                    <Badge variant="destructive">
                      FULL
                    </Badge>
                  )}
                  {getEventTypeIcon(selectedEvent.eventType)}
                  <Badge variant={selectedEvent.eventType === "virtual" ? "secondary" : "default"}>
                    {getEventTypeLabel(selectedEvent.eventType)}
                  </Badge>
                  {selectedEvent.isFeatured && (
                    <Badge variant="default" className="bg-yellow-500">
                      Featured
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground leading-relaxed">{selectedEvent.description}</p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="font-medium">Date & Time</span>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  {formatDate(selectedEvent.eventDate)} at {formatTime(selectedEvent.eventTime)}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="font-medium">Location</span>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  {selectedEvent.location || "Virtual Event"}
                </p>
                {selectedEvent.virtualLink && (
                  <a
                    href={selectedEvent.virtualLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary ml-6 hover:underline"
                  >
                    Join Virtual Event
                  </a>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="font-medium">Capacity</span>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  {selectedEvent.registeredCount} / {selectedEvent.capacity} registered
                </p>
                {selectedEvent.registeredCount >= selectedEvent.capacity && (
                  <p className="text-sm text-destructive ml-6">This event is full</p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Accessibility className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="font-medium">Accessibility Features</span>
                </div>
                <div className="flex flex-wrap gap-1 ml-6">
                  {selectedEvent.accessibilityFeatures.length > 0 ? (
                    selectedEvent.accessibilityFeatures.map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">None specified</span>
                  )}
                </div>
              </div>
            </div>

            {selectedEvent.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedEvent.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-4 flex-wrap">
              {selectedEvent.isRegistered ? (
                <Button
                  variant="outline"
                  onClick={() => handleWithdrawRequest(selectedEvent.id)}
                  disabled={isRegistering}
                  className="min-h-12 border-orange-500 text-orange-600 hover:bg-orange-50"
                  aria-describedby="registration-status"
                >
                  {isRegistering ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Heart className="h-4 w-4 mr-2 fill-current text-red-500" aria-hidden="true" />
                  )}
                  Withdraw Registration
                </Button>
              ) : (
                <Button
                  onClick={() => handleRegister(selectedEvent.id, true)}
                  disabled={isRegistering || selectedEvent.registeredCount >= selectedEvent.capacity}
                  className="min-h-12"
                >
                  {isRegistering && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {selectedEvent.registeredCount >= selectedEvent.capacity
                    ? "Event Full"
                    : "Register for Event"}
                </Button>
              )}
            </div>
            <span id="registration-status" className="sr-only">
              {selectedEvent.isRegistered ? "You are registered for this event" : "You are not registered for this event"}
            </span>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Events List View
  return (
    <div className="space-y-6" role="main" aria-label="Event Discovery">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold">Discover Events</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchEvents()}
            disabled={isLoading}
            aria-label="Refresh events"
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
                placeholder="Search events by title, description, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label="Search events"
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
                      {formatCategory(cat.category)} ({cat.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-32" aria-label="Filter by event type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="virtual">Virtual</SelectItem>
                  <SelectItem value="in_person">In-Person</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
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
                    {accessibilityOptions.length > 0 ? (
                      accessibilityOptions.map((feature) => (
                        <div key={feature.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`filter-${feature.id}`}
                            checked={accessibilityFilters.includes(feature.name)}
                            onCheckedChange={() => toggleAccessibilityFilter(feature.name)}
                          />
                          <Label htmlFor={`filter-${feature.id}`} className="text-sm cursor-pointer">
                            {feature.name}
                          </Label>
                        </div>
                      ))
                    ) : (
                      // Fallback to common features if API hasn't loaded
                      [
                        "Sign Language",
                        "Live Captions",
                        "Wheelchair Access",
                        "Audio Description",
                        "Screen Reader Compatible",
                      ].map((feature) => (
                        <div key={feature} className="flex items-center space-x-2">
                          <Checkbox
                            id={`filter-${feature}`}
                            checked={accessibilityFilters.includes(feature)}
                            onCheckedChange={() => toggleAccessibilityFilter(feature)}
                          />
                          <Label htmlFor={`filter-${feature}`} className="text-sm cursor-pointer">
                            {feature}
                          </Label>
                        </div>
                      ))
                    )}
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
            "Loading events..."
          ) : (
            <>
              Showing {events.length} of {pagination?.total || 0} events
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
            <Button variant="outline" onClick={() => fetchEvents()} className="mt-4">
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
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Events Grid */}
      {!isLoading && !error && (
        <div className="grid gap-4">
          {events.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">
                  No events found matching your criteria. Try adjusting your filters.
                </p>
              </CardContent>
            </Card>
          ) : (
            events.map((event) => (
              <Card key={event.id} className="hover:shadow-md transition-shadow overflow-hidden">
                {/* Event Poster Thumbnail */}
                {event.imageUrl && (
                  <div className="relative w-full h-32 sm:h-40">
                    <img
                      src={event.imageUrl}
                      alt={event.imageAlt || `${event.title} poster`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      {event.isFeatured && (
                        <Badge variant="default" className="bg-yellow-500 text-xs">
                          Featured
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      <CardDescription>
                        {formatDate(event.eventDate)} • {formatTime(event.eventTime)} •{" "}
                        {event.organizerName}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {event.isRegistered && (
                        <Heart
                          className="h-4 w-4 text-red-500 fill-current"
                          aria-label="You are registered for this event"
                        />
                      )}
                      {event.registeredCount >= event.capacity && (
                        <Badge variant="destructive" className="text-xs">
                          FULL
                        </Badge>
                      )}
                      {!event.imageUrl && event.isFeatured && (
                        <Badge variant="default" className="bg-yellow-500">
                          Featured
                        </Badge>
                      )}
                      {getEventTypeIcon(event.eventType)}
                      <Badge variant={event.eventType === "virtual" ? "secondary" : "default"}>
                        {getEventTypeLabel(event.eventType)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {event.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 flex-wrap">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      <span>{event.location || "Virtual"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" aria-hidden="true" />
                      <span>
                        {event.registeredCount}/{event.capacity}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {event.category}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {event.accessibilityFeatures.slice(0, 3).map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {event.accessibilityFeatures.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{event.accessibilityFeatures.length - 3} more
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleViewEvent(event)}>
                      View Details
                    </Button>
                    {event.isRegistered ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWithdrawRequest(event.id)}
                        disabled={isRegistering}
                        aria-label={`Withdraw registration from ${event.title}`}
                        className="border-orange-500 text-orange-600 hover:bg-orange-50"
                      >
                        {isRegistering ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Heart className="h-3 w-3 mr-1 fill-current text-red-500" aria-hidden="true" />
                        )}
                        Withdraw
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleRegister(event.id)}
                        disabled={isRegistering || event.registeredCount >= event.capacity}
                        aria-label={`Register for ${event.title}`}
                      >
                        {isRegistering && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        {event.registeredCount >= event.capacity ? "Full" : "Register"}
                      </Button>
                    )}
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
              <>Load More Events</>
            )}
          </Button>
        </div>
      )}

      {/* Accommodation Notes Dialog */}
      <Dialog open={showAccommodationDialog} onOpenChange={setShowAccommodationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accommodation Needs</DialogTitle>
            <DialogDescription>
              Let the organizers know about any specific accommodations you may need for this event.
              This information helps ensure the event is accessible for you.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="accommodation-notes">Accommodation Notes (Optional)</Label>
            <Textarea
              id="accommodation-notes"
              placeholder="E.g., I need a sign language interpreter, wheelchair-accessible seating, materials in large print..."
              value={accommodationNotes}
              onChange={(e) => setAccommodationNotes(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAccommodationDialog(false)
                setAccommodationNotes("")
                setPendingRegistrationEventId(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (pendingRegistrationEventId) {
                  setAccommodationNotes("")
                  handleRegister(pendingRegistrationEventId)
                }
              }}
              disabled={isRegistering}
            >
              Skip
            </Button>
            <Button
              onClick={() => {
                if (pendingRegistrationEventId) {
                  handleRegister(pendingRegistrationEventId)
                }
              }}
              disabled={isRegistering}
            >
              {isRegistering && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Registration Confirmation Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Registration?</DialogTitle>
            <DialogDescription>
              Are you sure you want to withdraw your registration? Your spot will be freed up for others who may want to attend.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              If you change your mind later, you can register again (subject to availability).
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowWithdrawDialog(false)
                setPendingWithdrawEventId(null)
              }}
            >
              Keep Registration
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingWithdrawEventId) {
                  handleUnregister(pendingWithdrawEventId)
                }
              }}
              disabled={isRegistering}
            >
              {isRegistering && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Withdraw Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
