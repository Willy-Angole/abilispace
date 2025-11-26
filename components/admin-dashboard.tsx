'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Calendar,
  FileText,
  MessageSquare,
  AlertTriangle,
  Activity,
  TrendingUp,
  UserCheck,
  Settings,
  Shield,
  LogOut,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  Star,
  StarOff,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  Clock,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import * as adminApi from '@/lib/admin';

// =============================================================================
// TYPES
// =============================================================================

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  onlineUsers: number;
  newUsersToday: number;
  totalEvents: number;
  upcomingEvents: number;
  totalRegistrations: number;
  totalArticles: number;
  totalMessages: number;
  pendingReports: number;
}

interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  loading,
}: {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ElementType;
  trend?: { value: number; positive: boolean };
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <p className={`text-xs ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.positive ? '+' : ''}{trend.value}% from last period
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// OVERVIEW TAB
// =============================================================================

function OverviewTab({
  stats,
  onlineUsers,
  loading,
  onRefresh,
}: {
  stats: DashboardStats | null;
  onlineUsers: any[];
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          description={`${stats?.newUsersToday || 0} new today`}
          icon={Users}
          loading={loading}
        />
        <StatCard
          title="Online Now"
          value={stats?.onlineUsers || 0}
          description="Active in last 15 minutes"
          icon={Activity}
          loading={loading}
        />
        <StatCard
          title="Total Events"
          value={stats?.totalEvents || 0}
          description={`${stats?.upcomingEvents || 0} upcoming`}
          icon={Calendar}
          loading={loading}
        />
        <StatCard
          title="Event Registrations"
          value={stats?.totalRegistrations || 0}
          icon={UserCheck}
          loading={loading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Articles"
          value={stats?.totalArticles || 0}
          icon={FileText}
          loading={loading}
        />
        <StatCard
          title="Messages"
          value={stats?.totalMessages || 0}
          icon={MessageSquare}
          loading={loading}
        />
        <StatCard
          title="Active Users"
          value={stats?.activeUsers || 0}
          description="Last 30 days"
          icon={TrendingUp}
          loading={loading}
        />
        <StatCard
          title="Pending Reports"
          value={stats?.pendingReports || 0}
          icon={AlertTriangle}
          loading={loading}
        />
      </div>

      {/* Online Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              Online Users
            </CardTitle>
            <CardDescription>
              Users currently active on the platform
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {onlineUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No users currently online
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {onlineUsers.slice(0, 10).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.device_type || 'Unknown'}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.last_activity_at).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {onlineUsers.length > 10 && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              And {onlineUsers.length - 10} more users online...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// USERS TAB
// =============================================================================

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.getUsers({ page, limit: 20, search });
      setUsers(result.users);
      setTotalPages(result.totalPages);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await adminApi.toggleUserStatus(userId, !currentStatus);
      toast({
        title: 'Success',
        description: `User ${currentStatus ? 'deactivated' : 'activated'} successfully`,
      });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user status',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await adminApi.deleteUser(selectedUser.id);
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
      setShowDeleteDialog(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>View and manage platform users</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={fetchUsers}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'default' : 'secondary'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.events_registered}</TableCell>
                    <TableCell>{user.messages_sent}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(user.id, user.is_active)}
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {user.is_active ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteDialog(true);
                          }}
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>{selectedUser?.first_name} {selectedUser?.last_name}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// =============================================================================
// EVENTS TAB
// =============================================================================

function EventsTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [showRegistrationsDialog, setShowRegistrationsDialog] = useState(false);
  const { toast } = useToast();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.getEvents({
        page,
        limit: 20,
        search,
        status: statusFilter as any,
      });
      setEvents(result.events);
      setTotalPages(result.totalPages);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleViewRegistrations = async (event: any) => {
    setSelectedEvent(event);
    try {
      const result = await adminApi.getEventRegistrations(event.id);
      setRegistrations(result.registrations);
      setShowRegistrationsDialog(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch registrations',
        variant: 'destructive',
      });
    }
  };

  const handleTogglePublish = async (eventId: string, isPublished: boolean) => {
    try {
      await adminApi.toggleEventPublished(eventId, !isPublished);
      toast({
        title: 'Success',
        description: `Event ${isPublished ? 'unpublished' : 'published'} successfully`,
      });
      fetchEvents();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update event',
        variant: 'destructive',
      });
    }
  };

  const handleToggleFeatured = async (eventId: string, isFeatured: boolean) => {
    try {
      await adminApi.toggleEventFeatured(eventId, !isFeatured);
      toast({
        title: 'Success',
        description: `Event ${isFeatured ? 'unfeatured' : 'featured'} successfully`,
      });
      fetchEvents();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update event',
        variant: 'destructive',
      });
    }
  };

  const exportRegistrations = () => {
    if (!selectedEvent || registrations.length === 0) return;
    
    const csv = [
      ['Name', 'Email', 'Registered At', 'Status'],
      ...registrations.map((r) => [
        `${r.first_name} ${r.last_name}`,
        r.user_email,
        new Date(r.registered_at).toLocaleString(),
        r.attendance_status || 'registered',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedEvent.title}-registrations.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Event Management</CardTitle>
          <CardDescription>View and manage platform events</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="past">Past</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchEvents}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Organizer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No events found
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="font-medium">{event.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {event.location}
                        </div>
                      </TableCell>
                      <TableCell>{event.organizer_name || 'Unknown'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(event.start_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {event.registration_count || 0}
                        </span>
                        <span className="text-muted-foreground">
                          /{event.capacity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge variant={event.is_published ? 'default' : 'secondary'}>
                            {event.is_published ? 'Published' : 'Draft'}
                          </Badge>
                          {event.is_featured && (
                            <Badge variant="outline" className="text-yellow-600">
                              Featured
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewRegistrations(event)}
                            title="View registrations"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTogglePublish(event.id, event.is_published)}
                            title={event.is_published ? 'Unpublish' : 'Publish'}
                          >
                            {event.is_published ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleFeatured(event.id, event.is_featured)}
                            title={event.is_featured ? 'Unfeature' : 'Feature'}
                          >
                            {event.is_featured ? (
                              <StarOff className="h-4 w-4" />
                            ) : (
                              <Star className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registrations Dialog */}
      <Dialog open={showRegistrationsDialog} onOpenChange={setShowRegistrationsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Event Registrations</DialogTitle>
            <DialogDescription>
              {selectedEvent?.title} - {registrations.length} registrations
            </DialogDescription>
          </DialogHeader>
          
          {registrations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No registrations for this event
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((reg) => (
                  <TableRow key={reg.user_id}>
                    <TableCell className="font-medium">
                      {reg.first_name} {reg.last_name}
                    </TableCell>
                    <TableCell>{reg.user_email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(reg.registered_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {reg.attendance_status || 'registered'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegistrationsDialog(false)}>
              Close
            </Button>
            {registrations.length > 0 && (
              <Button onClick={exportRegistrations}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// =============================================================================
// ANALYTICS TAB
// =============================================================================

function AnalyticsTab() {
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [topEvents, setTopEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsResult, eventsResult] = await Promise.all([
          adminApi.getDailyStats(30),
          adminApi.getTopEvents(5),
        ]);
        setDailyStats(statsResult);
        setTopEvents(eventsResult);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to fetch analytics',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Daily Stats Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Daily Statistics (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyStats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No statistics available yet
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">New Users</TableHead>
                    <TableHead className="text-right">Active Users</TableHead>
                    <TableHead className="text-right">New Events</TableHead>
                    <TableHead className="text-right">Registrations</TableHead>
                    <TableHead className="text-right">Messages</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyStats.slice(0, 10).map((stat) => (
                    <TableRow key={stat.stat_date}>
                      <TableCell>
                        {new Date(stat.stat_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">{stat.new_users}</TableCell>
                      <TableCell className="text-right">{stat.active_users}</TableCell>
                      <TableCell className="text-right">{stat.new_events}</TableCell>
                      <TableCell className="text-right">{stat.event_registrations}</TableCell>
                      <TableCell className="text-right">{stat.new_messages}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Events by Registrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topEvents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No events available
            </p>
          ) : (
            <div className="space-y-4">
              {topEvents.map((event, index) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-muted-foreground">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(event.start_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      {event.registered_count}/{event.capacity}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {event.fill_rate || 0}% filled
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// SETTINGS TAB
// =============================================================================

function SettingsTab({ admin }: { admin: AdminUser | null }) {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSetting, setEditingSetting] = useState<any>(null);
  const [editValue, setEditValue] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    async function fetchSettings() {
      try {
        const result = await adminApi.getPlatformSettings();
        setSettings(result);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to fetch settings',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [toast]);

  const handleSave = async () => {
    if (!editingSetting) return;
    try {
      await adminApi.updatePlatformSetting(editingSetting.setting_key, editValue);
      toast({
        title: 'Success',
        description: 'Setting updated successfully',
      });
      setSettings((prev) =>
        prev.map((s) =>
          s.setting_key === editingSetting.setting_key
            ? { ...s, setting_value: editValue }
            : s
        )
      );
      setEditingSetting(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update setting',
        variant: 'destructive',
      });
    }
  };

  const isSuperAdmin = admin?.role === 'super_admin';

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Platform Settings
        </CardTitle>
        <CardDescription>
          {isSuperAdmin
            ? 'Manage platform configuration'
            : 'View platform configuration (read-only)'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setting</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.map((setting) => (
                <TableRow key={setting.setting_key}>
                  <TableCell className="font-medium font-mono text-sm">
                    {setting.setting_key}
                  </TableCell>
                  <TableCell>
                    {editingSetting?.setting_key === setting.setting_key ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="max-w-xs"
                      />
                    ) : (
                      <Badge variant="outline">{setting.setting_value}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{setting.setting_type}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {setting.description}
                  </TableCell>
                  {isSuperAdmin && (
                    <TableCell className="text-right">
                      {editingSetting?.setting_key === setting.setting_key ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={handleSave}>
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSetting(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingSetting(setting);
                            setEditValue(setting.setting_value);
                          }}
                        >
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN ADMIN DASHBOARD COMPONENT
// =============================================================================

export function AdminDashboard() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Dashboard state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  
  const { toast } = useToast();

  // Check auth on mount
  useEffect(() => {
    async function checkAuth() {
      if (adminApi.isAdminAuthenticated()) {
        try {
          const profile = await adminApi.getAdminProfile();
          setAdmin(profile as any);
          setIsAuthenticated(true);
        } catch {
          // Token invalid, will show login
        }
      }
      setInitialLoading(false);
    }
    checkAuth();
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!isAuthenticated) return;
    setStatsLoading(true);
    try {
      const [statsResult, onlineResult] = await Promise.all([
        adminApi.getDashboardStats(),
        adminApi.getOnlineUsers(),
      ]);
      setStats(statsResult);
      setOnlineUsers(onlineResult);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch dashboard data',
        variant: 'destructive',
      });
    } finally {
      setStatsLoading(false);
    }
  }, [isAuthenticated, toast]);

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const result = await adminApi.adminLogin(email, password);
      setAdmin(result.admin as any);
      setIsAuthenticated(true);
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${result.admin.first_name}`,
      });
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid credentials',
        variant: 'destructive',
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await adminApi.adminLogout();
    } finally {
      setAdmin(null);
      setIsAuthenticated(false);
      setStats(null);
      setOnlineUsers([]);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle>Admin Dashboard</CardTitle>
            <CardDescription>
              Sign in to access the Shiriki admin panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@shiriki.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Shiriki Admin</h1>
              <p className="text-sm text-muted-foreground">
                {admin?.first_name} {admin?.last_name}
                <Badge variant="outline" className="ml-2">
                  {admin?.role?.replace('_', ' ')}
                </Badge>
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-xl grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab
              stats={stats}
              onlineUsers={onlineUsers}
              loading={statsLoading}
              onRefresh={fetchDashboardData}
            />
          </TabsContent>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          <TabsContent value="events">
            <EventsTab />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab admin={admin} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Shiriki Admin Dashboard • Last refresh: {new Date().toLocaleTimeString()}</p>
        </div>
      </footer>
    </div>
  );
}

export default AdminDashboard;
