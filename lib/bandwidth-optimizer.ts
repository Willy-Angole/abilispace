/**
 * Bandwidth Optimizer
 * Utilities for optimizing data transfer in low-bandwidth environments
 */

// Connection quality detection
export type ConnectionQuality = 'offline' | '2g' | '3g' | '4g' | 'unknown';

export function getConnectionQuality(): ConnectionQuality {
  if (typeof navigator === 'undefined') return 'unknown';
  
  if (!navigator.onLine) return 'offline';
  
  // Use Network Information API if available
  const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;
  
  if (connection) {
    const effectiveType = connection.effectiveType;
    if (effectiveType === 'slow-2g' || effectiveType === '2g') return '2g';
    if (effectiveType === '3g') return '3g';
    if (effectiveType === '4g') return '4g';
  }
  
  return 'unknown';
}

// Get recommended settings based on connection quality
export function getDataLoadingSettings(quality: ConnectionQuality) {
  switch (quality) {
    case 'offline':
      return {
        pageSize: 0,
        loadImages: false,
        preloadContent: false,
        syncInterval: null,
      };
    case '2g':
      return {
        pageSize: 5,
        loadImages: false, // Skip images on 2G
        preloadContent: false,
        syncInterval: 120000, // 2 minutes
      };
    case '3g':
      return {
        pageSize: 10,
        loadImages: true, // Load compressed thumbnails
        preloadContent: false,
        syncInterval: 60000, // 1 minute
      };
    case '4g':
    case 'unknown':
    default:
      return {
        pageSize: 20,
        loadImages: true,
        preloadContent: true,
        syncInterval: 30000, // 30 seconds
      };
  }
}

// Check if data saving mode is enabled
export function isDataSaverEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  const connection = (navigator as any).connection;
  return connection?.saveData === true;
}

// Estimate download time for a given size
export function estimateDownloadTime(bytes: number): string {
  const quality = getConnectionQuality();
  
  // Approximate speeds in bytes per second
  const speeds: Record<ConnectionQuality, number> = {
    'offline': 0,
    '2g': 6250,     // ~50 Kbps
    '3g': 93750,    // ~750 Kbps  
    '4g': 1250000,  // ~10 Mbps
    'unknown': 125000, // ~1 Mbps (conservative)
  };
  
  const speed = speeds[quality];
  if (speed === 0) return 'Offline';
  
  const seconds = bytes / speed;
  if (seconds < 1) return 'Less than a second';
  if (seconds < 60) return `~${Math.ceil(seconds)} seconds`;
  return `~${Math.ceil(seconds / 60)} minutes`;
}

// Create a priority queue for sync operations
export interface SyncPriority {
  critical: string[];  // Must sync immediately (e.g., messages)
  high: string[];      // Sync when possible (e.g., event registrations)
  normal: string[];    // Sync in background (e.g., article reads)
  low: string[];       // Sync when idle (e.g., analytics)
}

export function prioritizeSyncQueue(queue: Array<{ type: string; endpoint: string }>): SyncPriority {
  const priority: SyncPriority = {
    critical: [],
    high: [],
    normal: [],
    low: [],
  };
  
  for (const item of queue) {
    if (item.endpoint.includes('/messages') || item.endpoint.includes('/emergency')) {
      priority.critical.push(item.endpoint);
    } else if (item.endpoint.includes('/events/register') || item.endpoint.includes('/auth')) {
      priority.high.push(item.endpoint);
    } else if (item.endpoint.includes('/articles') || item.endpoint.includes('/events')) {
      priority.normal.push(item.endpoint);
    } else {
      priority.low.push(item.endpoint);
    }
  }
  
  return priority;
}
