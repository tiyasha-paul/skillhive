// YouTube Data API service

// Read API key from Vite env. You must set VITE_YOUTUBE_API_KEY in your .env file.
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

// Parse YouTube error response safely
function parseYouTubeError(body: unknown): { reason?: string; message?: string } {
  try {
    if (!body || typeof body !== 'object') return {};
    const b = body as Record<string, unknown>;
    const err = (b.error as Record<string, unknown> | undefined) ?? undefined;
    const errors = err ? (err.errors as Array<Record<string, unknown>> | undefined) : undefined;
    const reason = errors && errors[0] && typeof errors[0].reason === 'string' ? (errors[0].reason as string) : undefined;
    const message = err && typeof err.message === 'string' ? (err.message as string) : undefined;
    return { reason, message };
  } catch {
    return {};
  }
}
// Cache configuration
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CACHE_KEY_PREFIX = 'youtube_videos_cache_';

interface CachedVideoData {
  videos: YouTubeVideo[];
  timestamp: number;
  query: string;
}

// Cache helper functions
function getCacheKey(query: string, maxResults: number): string {
  return `${CACHE_KEY_PREFIX}${btoa(query)}_${maxResults}`;
}

function getCachedVideos(query: string, maxResults: number, allowExpired: boolean = false): YouTubeVideo[] | null {
  try {
    const cacheKey = getCacheKey(query, maxResults);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const data: CachedVideoData = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - data.timestamp < CACHE_DURATION) {
      console.log(`Using cached YouTube videos for: ${query}`);
      return data.videos;
    }

    // Cache expired
    if (allowExpired) {
      console.log(`Using expired cached YouTube videos for: ${query}`);
      return data.videos;
    }

    // Cache expired and not allowed, remove it
    localStorage.removeItem(cacheKey);
    return null;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

function setCachedVideos(query: string, maxResults: number, videos: YouTubeVideo[]): void {
  try {
    const cacheKey = getCacheKey(query, maxResults);
    const data: CachedVideoData = {
      videos,
      timestamp: Date.now(),
      query,
    };
    localStorage.setItem(cacheKey, JSON.stringify(data));
    console.log(`Cached YouTube videos for: ${query}`);
  } catch (error) {
    console.error('Error caching videos:', error);
    // If storage is full, try to clear old cache entries
    clearOldCacheEntries();
  }
}

function clearOldCacheEntries(): void {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    let cleared = 0;

    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const data: CachedVideoData = JSON.parse(cached);
            if (now - data.timestamp >= CACHE_DURATION) {
              localStorage.removeItem(key);
              cleared++;
            }
          }
        } catch (e) {
          // Invalid cache entry, remove it
          localStorage.removeItem(key);
          cleared++;
        }
      }
    });

    if (cleared > 0) {
      console.log(`Cleared ${cleared} old cache entries`);
    }
  } catch (error) {
    console.error('Error clearing old cache:', error);
  }
}

export interface YouTubeVideo {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    thumbnails: {
      medium: {
        url: string;
      };
      high: {
        url: string;
      };
    };
  };
  contentDetails?: {
    duration: string;
  };
}

export interface YouTubeSearchResponse {
  items: YouTubeVideo[];
}

export async function searchYouTubeVideos(
  subjectName: string,
  maxResults: number = 10,
  channelId?: string
): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) {
    console.warn('YouTube API key is not configured. Please set VITE_YOUTUBE_API_KEY in your .env file.');
    return [];
  }

  // Clean subject name and add educational keywords
  const searchQuery = `${subjectName} lecture tutorial engineering competitive exam`;

  // Check cache first
  const cachedVideos = getCachedVideos(searchQuery, maxResults);
  if (cachedVideos) {
    return cachedVideos;
  }

  try {
    const url = new URL(YOUTUBE_API_URL);
    url.searchParams.append('part', 'snippet');
    url.searchParams.append('q', searchQuery);
    url.searchParams.append('type', 'video');
    url.searchParams.append('maxResults', maxResults.toString());
    url.searchParams.append('key', YOUTUBE_API_KEY);
    url.searchParams.append('order', 'viewCount');
    url.searchParams.append('safeSearch', 'strict');
    // If you want videos from a single channel (e.g. your own channel), pass channelId
    if (channelId) {
      url.searchParams.append('channelId', channelId);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      // Try to parse JSON error from YouTube to get more details
      let errBody: unknown;
      try {
        errBody = await response.json();
      } catch (e) {
        // fallback to text
        const text = await response.text();
        console.error('YouTube API error (non-json):', response.status, text);

        // Try to return cached data if available (even if expired)
        const expiredCache = getCachedVideos(searchQuery, maxResults, true);
        if (expiredCache) {
          console.warn('Using expired cache due to API error');
          return expiredCache;
        }

        throw new Error(`YouTube API error: ${response.status} - ${text}`);
      }

      const parsed = parseYouTubeError(errBody);
      const reason = parsed.reason;
      const message = parsed.message || JSON.stringify(errBody);
      console.error('YouTube API error:', response.status, reason || message);

      if (reason === 'quotaExceeded') {
        console.warn('YouTube API quota exceeded. Attempting to use cached data...');

        // Try to get any cached data (even expired)
        const expiredCache = getCachedVideos(searchQuery, maxResults, true);
        if (expiredCache && expiredCache.length > 0) {
          console.log('Returning cached videos due to quota exceeded');
          return expiredCache;
        }

        // No cache available, return empty with helpful message
        console.error('No cached videos available. YouTube API quota exceeded.');
        return [];
      }

      const expiredCache = getCachedVideos(searchQuery, maxResults, true);
      if (expiredCache) {
        console.warn('Using expired cache due to API error');
        return expiredCache;
      }

      throw new Error(`YouTube API error: ${response.status} - ${message}`);
    }

    const data: YouTubeSearchResponse = await response.json();
    const videos = data.items || [];

    // Cache the results
    if (videos.length > 0) {
      setCachedVideos(searchQuery, maxResults, videos);
    }

    return videos;
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);

    // Last resort: try to get any cached data (even expired)
    const cached = getCachedVideos(searchQuery, maxResults, true);
    if (cached) {
      console.warn('Using cached data as fallback');
      return cached;
    }

    return [];
  }
}

// --- Channel-based helpers (cheaper than repeated search requests) ---
// Using the channel's uploads playlist is an efficient way to list all videos
// from a specific channel and typically uses fewer quota units than search.

async function getUploadsPlaylistId(channelId: string): Promise<string | null> {
  const url = new URL('https://www.googleapis.com/youtube/v3/channels');
  url.searchParams.append('part', 'contentDetails');
  url.searchParams.append('id', channelId);
  url.searchParams.append('key', YOUTUBE_API_KEY as string);

  const response = await fetch(url.toString());
  if (!response.ok) {
    console.error('Error getting channel details:', response.status, await response.text());
    return null;
  }

  const data = await response.json();
  const uploads = data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  return uploads ?? null;
}

export async function getVideosFromChannel(
  channelId: string,
  maxResults: number = 12
): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) {
    console.warn('YouTube API key is not configured. Please set VITE_YOUTUBE_API_KEY in your .env file.');
    return [];
  }

  try {
    const uploadsPlaylistId = await getUploadsPlaylistId(channelId);
    if (!uploadsPlaylistId) {
      console.warn('Could not get uploads playlist for channel:', channelId);
      return [];
    }

    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    url.searchParams.append('part', 'snippet');
    url.searchParams.append('playlistId', uploadsPlaylistId);
    url.searchParams.append('maxResults', Math.min(maxResults, 50).toString());
    url.searchParams.append('key', YOUTUBE_API_KEY as string);

    const response = await fetch(url.toString());
    if (!response.ok) {
      const txt = await response.text();
      console.error('YouTube playlistItems error:', response.status, txt);
      return [];
    }

    const data = await response.json();
    // playlistItems items have a similar snippet structure
    return data.items || [];
  } catch (e) {
    console.error('Error fetching videos from channel:', e);
    return [];
  }
}

/**
 * Search YouTube videos for specific topics (for weak areas)
 * This function is optimized to find the best educational videos for improving weak points
 */
export async function searchVideosForTopic(
  topic: string,
  subject?: string,
  maxResults: number = 5
): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) {
    console.warn('YouTube API key is not configured. Please set VITE_YOUTUBE_API_KEY in your .env file.');
    return [];
  }

  // Build optimized search query for weak areas
  let searchQuery = '';

  if (subject) {
    searchQuery = `${topic} ${subject}`;
  } else {
    searchQuery = topic;
  }

  // Removed extra keywords as per requirement to "lookup only the topic name"
  // searchQuery += ' engineering competitive exam preparation';

  // Check cache first
  const cachedVideos = getCachedVideos(searchQuery, maxResults);
  if (cachedVideos) {
    return cachedVideos;
  }

  try {
    const url = new URL(YOUTUBE_API_URL);
    url.searchParams.append('part', 'snippet');
    url.searchParams.append('q', searchQuery);
    url.searchParams.append('type', 'video');
    url.searchParams.append('maxResults', maxResults.toString());
    url.searchParams.append('key', YOUTUBE_API_KEY);
    url.searchParams.append('order', 'viewCount');
    url.searchParams.append('safeSearch', 'strict');
    url.searchParams.append('videoEmbeddable', 'true');

    const response = await fetch(url.toString());

    if (!response.ok) {
      let errBody: unknown;
      try {
        errBody = await response.json();
      } catch (e) {
        const errorText = await response.text();
        console.error('YouTube API error:', response.status, errorText);

        // Try expired cache
        const expiredCache = getCachedVideos(searchQuery, maxResults, true);
        if (expiredCache) {
          return expiredCache;
        }
        return [];
      }

      const parsed = parseYouTubeError(errBody);
      const reason = parsed.reason;

      if (reason === 'quotaExceeded') {
        console.warn('YouTube API quota exceeded. Using cached data if available...');
        const expiredCache = getCachedVideos(searchQuery, maxResults, true);
        if (expiredCache && expiredCache.length > 0) {
          return expiredCache;
        }
        return [];
      }

      // Try expired cache for other errors
      const expiredCache = getCachedVideos(searchQuery, maxResults);
      if (expiredCache) {
        return expiredCache;
      }

      return [];
    }

    const data: YouTubeSearchResponse = await response.json();
    const videos = data.items || [];

    if (videos.length === 0) {
      console.warn(`No YouTube videos found for topic: ${topic}${subject ? ` (${subject})` : ''}`);
      return [];
    }

    // Cache the results
    if (videos.length > 0) {
      setCachedVideos(searchQuery, maxResults, videos);
      console.log(`Found ${videos.length} YouTube videos for ${topic}`);
      return videos;
    } else {
      console.warn(`No YouTube videos found for complex query: ${searchQuery}. Trying fallback...`);

      // FALLBACK: Try a simpler query
      const fallbackQuery = `${subject ? subject + ' ' : ''}${topic} tutorial`;

      // Check cache for fallback
      const cachedFallback = getCachedVideos(fallbackQuery, maxResults);
      if (cachedFallback) return cachedFallback;

      const fallbackUrl = new URL(YOUTUBE_API_URL);
      fallbackUrl.searchParams.append('part', 'snippet');
      fallbackUrl.searchParams.append('q', fallbackQuery);
      fallbackUrl.searchParams.append('type', 'video');
      fallbackUrl.searchParams.append('maxResults', maxResults.toString());
      fallbackUrl.searchParams.append('key', YOUTUBE_API_KEY);
      fallbackUrl.searchParams.append('order', 'relevance'); // Relevance might be better for shorter queries
      fallbackUrl.searchParams.append('safeSearch', 'strict');
      fallbackUrl.searchParams.append('videoEmbeddable', 'true');

      const fallbackResponse = await fetch(fallbackUrl.toString());
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        const fallbackVideos = fallbackData.items || [];
        if (fallbackVideos.length > 0) {
          setCachedVideos(fallbackQuery, maxResults, fallbackVideos);
          console.log(`Found ${fallbackVideos.length} YouTube videos for fallback: ${fallbackQuery}`);
          return fallbackVideos;
        }
      }

      return [];
    }
  } catch (error) {
    console.error('Error fetching YouTube videos for topic:', error);

    // Try to get cached data
    const cached = getCachedVideos(searchQuery, maxResults);
    if (cached) {
      return cached;
    }

    return [];
  }
}

// Helper function to format duration (if available from video details API)
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Get embed URL for YouTube video
export function getEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

// Extract video ID from various YouTube URL formats
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Just the video ID itself
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// Fetch video details by video ID
export async function getVideoById(videoId: string): Promise<YouTubeVideo | null> {
  if (!YOUTUBE_API_KEY) {
    console.warn('YouTube API key is not configured. Please set VITE_YOUTUBE_API_KEY in your .env file.');
    return null;
  }

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.append('part', 'snippet');
    url.searchParams.append('id', videoId);
    url.searchParams.append('key', YOUTUBE_API_KEY);

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error('YouTube API error fetching video:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      console.warn('Video not found:', videoId);
      return null;
    }

    const item = data.items[0];
    // Convert to YouTubeVideo format
    const video: YouTubeVideo = {
      id: { videoId: item.id },
      snippet: {
        title: item.snippet.title,
        description: item.snippet.description,
        channelTitle: item.snippet.channelTitle,
        thumbnails: {
          medium: { url: item.snippet.thumbnails?.medium?.url || '' },
          high: { url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '' },
        },
      },
    };

    return video;
  } catch (error) {
    console.error('Error fetching video by ID:', error);
    return null;
  }
}

// Search YouTube videos for competitive exam preparation
export async function searchCompetitiveExamVideos(
  searchKeywords: string[],
  maxResults: number = 12
): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) {
    console.warn('YouTube API key is not configured. Please set VITE_YOUTUBE_API_KEY in your .env file.');
    return [];
  }

  // Combine keywords and add exam preparation context
  const searchQuery = searchKeywords.join(' ') + ' preparation exam';

  // Check cache first
  const cachedVideos = getCachedVideos(searchQuery, maxResults);
  if (cachedVideos) {
    return cachedVideos;
  }

  try {
    const url = new URL(YOUTUBE_API_URL);
    url.searchParams.append('part', 'snippet');
    url.searchParams.append('q', searchQuery);
    url.searchParams.append('type', 'video');
    url.searchParams.append('maxResults', maxResults.toString());
    url.searchParams.append('key', YOUTUBE_API_KEY);
    url.searchParams.append('order', 'viewCount');
    url.searchParams.append('safeSearch', 'strict');

    const response = await fetch(url.toString());

    if (!response.ok) {
      let errBody: unknown;
      try {
        errBody = await response.json();
      } catch (e) {
        const errorText = await response.text();
        console.error('YouTube API error:', response.status, errorText);

        // Try expired cache
        const expiredCache = getCachedVideos(searchQuery, maxResults, true);
        if (expiredCache) {
          return expiredCache;
        }
        return [];
      }

      const parsed = parseYouTubeError(errBody);
      const reason = parsed.reason;

      if (reason === 'quotaExceeded') {
        console.warn('YouTube API quota exceeded. Using cached data if available...');
        const expiredCache = getCachedVideos(searchQuery, maxResults, true);
        if (expiredCache && expiredCache.length > 0) {
          return expiredCache;
        }
        return [];
      }

      // Try expired cache for other errors
      const expiredCache = getCachedVideos(searchQuery, maxResults);
      if (expiredCache) {
        return expiredCache;
      }

      return [];
    }

    const data: YouTubeSearchResponse = await response.json();
    const videos = data.items || [];

    // Cache the results
    if (videos.length > 0) {
      setCachedVideos(searchQuery, maxResults, videos);
    }

    return videos;
  } catch (error) {
    console.error('Error fetching competitive exam videos:', error);

    // Try to get cached data
    const cached = getCachedVideos(searchQuery, maxResults);
    if (cached) {
      return cached;
    }

    return [];
  }
}

