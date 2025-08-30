"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, MapPin, Users, Search, Filter, Accessibility, Video, Heart } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Event {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  type: "virtual" | "in-person" | "hybrid"
  category: string
  accessibility: string[]
  capacity: number
  registered: number
  organizer: string
  tags: string[]
  isRegistered?: boolean
}

interface EventDiscoveryProps {
  user: any
}

export function EventDiscovery({ user }: EventDiscoveryProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [accessibilityFilters, setAccessibilityFilters] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const { toast } = useToast()

  // Sample events data
  useEffect(() => {
    const sampleEvents: Event[] = [
      {
        id: "1",
        title: "Accessible Tech Workshop",
        description:
          "Join us for an interactive workshop on the latest assistive technologies. Learn about screen readers, voice recognition software, and adaptive hardware solutions.",
        date: "2025-01-02",
        time: "14:00",
        location: "Community Center, Lagos",
        type: "hybrid",
        category: "Technology",
        accessibility: ["Sign Language", "Live Captions", "Wheelchair Access", "Audio Description"],
        capacity: 50,
        registered: 23,
        organizer: "Tech for All Foundation",
        tags: ["assistive-tech", "workshop", "hands-on"],
      },
      {
        id: "2",
        title: "Employment Rights Discussion Panel",
        description:
          "A comprehensive panel discussion about employment rights for people with disabilities. Expert speakers will cover legal protections, workplace accommodations, and advocacy strategies.",
        date: "2025-01-05",
        time: "10:00",
        location: "Virtual Event",
        type: "virtual",
        category: "Advocacy",
        accessibility: ["Sign Language", "Live Captions", "Screen Reader Compatible"],
        capacity: 200,
        registered: 87,
        organizer: "Disability Rights Coalition",
        tags: ["employment", "rights", "advocacy", "panel"],
      },
      {
        id: "3",
        title: "Adaptive Sports Day",
        description:
          "Come and try various adaptive sports including wheelchair basketball, blind football, and seated volleyball. All skill levels welcome!",
        date: "2025-01-08",
        time: "09:00",
        location: "Sports Complex, Abuja",
        type: "in-person",
        category: "Sports",
        accessibility: ["Wheelchair Access", "Equipment Provided", "Sign Language"],
        capacity: 100,
        registered: 45,
        organizer: "Adaptive Sports Nigeria",
        tags: ["sports", "adaptive", "recreation", "community"],
      },
      {
        id: "4",
        title: "Mental Health Support Group",
        description:
          "A safe space to discuss mental health challenges and coping strategies. Facilitated by licensed counselors with experience in disability-related mental health.",
        date: "2025-01-10",
        time: "18:00",
        location: "Virtual Event",
        type: "virtual",
        category: "Health",
        accessibility: ["Live Captions", "Screen Reader Compatible", "Private Chat Options"],
        capacity: 30,
        registered: 18,
        organizer: "Mental Wellness Hub",
        tags: ["mental-health", "support", "counseling", "peer-support"],
      },
      {
        id: "5",
        title: "Accessible Art Exhibition Opening",
        description:
          "Experience art through multiple senses at our inclusive exhibition featuring tactile sculptures, audio descriptions, and braille information cards.",
        date: "2025-01-12",
        time: "16:00",
        location: "National Gallery, Accra",
        type: "in-person",
        category: "Arts",
        accessibility: ["Audio Description", "Tactile Experience", "Braille Materials", "Wheelchair Access"],
        capacity: 80,
        registered: 34,
        organizer: "Inclusive Arts Collective",
        tags: ["art", "exhibition", "tactile", "inclusive"],
      },
      {
        id: "6",
        title: "Digital Accessibility Training",
        description:
          "Learn how to make websites and digital content accessible. Covers WCAG guidelines, testing tools, and practical implementation strategies.",
        date: "2025-01-15",
        time: "13:00",
        location: "Virtual Event",
        type: "virtual",
        category: "Technology",
        accessibility: ["Live Captions", "Screen Reader Compatible", "Keyboard Navigation Demo"],
        capacity: 150,
        registered: 92,
        organizer: "Digital Inclusion Institute",
        tags: ["web-accessibility", "training", "wcag", "digital-inclusion"],
      },
    ]

    // Load events from localStorage or use sample data
    const savedEvents = localStorage.getItem("accessibleApp_events")
    const loadedEvents = savedEvents ? JSON.parse(savedEvents) : sampleEvents

    // Load user registrations
    const userRegistrations = JSON.parse(localStorage.getItem(`accessibleApp_registrations_${user.id}`) || "[]")
    const eventsWithRegistration = loadedEvents.map((event: Event) => ({
      ...event,
      isRegistered: userRegistrations.includes(event.id),
    }))

    setEvents(eventsWithRegistration)
    setFilteredEvents(eventsWithRegistration)

    // Save sample events if not already saved
    if (!savedEvents) {
      localStorage.setItem("accessibleApp_events", JSON.stringify(sampleEvents))
    }
  }, [user.id])

  // Filter events based on search and filters
  useEffect(() => {
    let filtered = events

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter((event) => event.category === selectedCategory)
    }

    // Type filter
    if (selectedType !== "all") {
      filtered = filtered.filter((event) => event.type === selectedType)
    }

    // Accessibility filters
    if (accessibilityFilters.length > 0) {
      filtered = filtered.filter((event) =>
        accessibilityFilters.every((filter) =>
          event.accessibility.some((acc) => acc.toLowerCase().includes(filter.toLowerCase())),
        ),
      )
    }

    setFilteredEvents(filtered)
  }, [events, searchQuery, selectedCategory, selectedType, accessibilityFilters])

  const handleRegister = (eventId: string) => {
    const userRegistrations = JSON.parse(localStorage.getItem(`accessibleApp_registrations_${user.id}`) || "[]")

    if (!userRegistrations.includes(eventId)) {
      userRegistrations.push(eventId)
      localStorage.setItem(`accessibleApp_registrations_${user.id}`, JSON.stringify(userRegistrations))

      // Update events state
      setEvents((prev) =>
        prev.map((event) =>
          event.id === eventId ? { ...event, isRegistered: true, registered: event.registered + 1 } : event,
        ),
      )

      toast({
        title: "Registration Successful!",
        description: "You have been registered for this event. Check your email for details.",
      })
    }
  }

  const handleUnregister = (eventId: string) => {
    const userRegistrations = JSON.parse(localStorage.getItem(`accessibleApp_registrations_${user.id}`) || "[]")
    const updatedRegistrations = userRegistrations.filter((id: string) => id !== eventId)
    localStorage.setItem(`accessibleApp_registrations_${user.id}`, JSON.stringify(updatedRegistrations))

    // Update events state
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId ? { ...event, isRegistered: false, registered: Math.max(0, event.registered - 1) } : event,
      ),
    )

    toast({
      title: "Unregistered Successfully",
      description: "You have been removed from this event.",
    })
  }

  const toggleAccessibilityFilter = (filter: string) => {
    setAccessibilityFilters((prev) => (prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]))
  }

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case "virtual":
        return <Video className="h-4 w-4" />
      case "in-person":
        return <MapPin className="h-4 w-4" />
      case "hybrid":
        return <Users className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
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

  if (selectedEvent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setSelectedEvent(null)}>
            ← Back to Events
          </Button>
          <h2 className="text-2xl font-bold">Event Details</h2>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-2xl">{selectedEvent.title}</CardTitle>
                <CardDescription className="text-base">Organized by {selectedEvent.organizer}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {getEventTypeIcon(selectedEvent.type)}
                <Badge variant={selectedEvent.type === "virtual" ? "secondary" : "default"}>{selectedEvent.type}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground leading-relaxed">{selectedEvent.description}</p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Date & Time</span>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  {formatDate(selectedEvent.date)} at {selectedEvent.time}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Location</span>
                </div>
                <p className="text-sm text-muted-foreground ml-6">{selectedEvent.location}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Capacity</span>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  {selectedEvent.registered} / {selectedEvent.capacity} registered
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Accessibility className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Accessibility Features</span>
                </div>
                <div className="flex flex-wrap gap-1 ml-6">
                  {selectedEvent.accessibility.map((feature, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              {selectedEvent.isRegistered ? (
                <Button variant="outline" onClick={() => handleUnregister(selectedEvent.id)} className="min-h-12">
                  <Heart className="h-4 w-4 mr-2 fill-current" />
                  Registered - Click to Unregister
                </Button>
              ) : (
                <Button
                  onClick={() => handleRegister(selectedEvent.id)}
                  disabled={selectedEvent.registered >= selectedEvent.capacity}
                  className="min-h-12"
                >
                  {selectedEvent.registered >= selectedEvent.capacity ? "Event Full" : "Register for Event"}
                </Button>
              )}
              <Button variant="outline" className="min-h-12 bg-transparent">
                Share Event
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Discover Events</h2>
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
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Advocacy">Advocacy</SelectItem>
                  <SelectItem value="Sports">Sports</SelectItem>
                  <SelectItem value="Health">Health</SelectItem>
                  <SelectItem value="Arts">Arts</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="virtual">Virtual</SelectItem>
                  <SelectItem value="in-person">In-Person</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
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
                      "Sign Language",
                      "Live Captions",
                      "Wheelchair Access",
                      "Audio Description",
                      "Screen Reader Compatible",
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
          Showing {filteredEvents.length} of {events.length} events
        </span>
        {(searchQuery || selectedCategory !== "all" || selectedType !== "all" || accessibilityFilters.length > 0) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("")
              setSelectedCategory("all")
              setSelectedType("all")
              setAccessibilityFilters([])
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Events Grid */}
      <div className="grid gap-4">
        {filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">
                No events found matching your criteria. Try adjusting your filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredEvents.map((event) => (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <CardDescription>
                      {formatDate(event.date)} • {event.time} • {event.organizer}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {event.isRegistered && <Heart className="h-4 w-4 text-red-500 fill-current" />}
                    {getEventTypeIcon(event.type)}
                    <Badge variant={event.type === "virtual" ? "secondary" : "default"}>{event.type}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{event.description}</p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {event.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {event.registered}/{event.capacity}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {event.category}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {event.accessibility.slice(0, 3).map((feature, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                  {event.accessibility.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{event.accessibility.length - 3} more
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedEvent(event)}>
                    View Details
                  </Button>
                  {event.isRegistered ? (
                    <Button size="sm" variant="outline" onClick={() => handleUnregister(event.id)}>
                      <Heart className="h-3 w-3 mr-1 fill-current" />
                      Registered
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleRegister(event.id)}
                      disabled={event.registered >= event.capacity}
                    >
                      {event.registered >= event.capacity ? "Full" : "Register"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
