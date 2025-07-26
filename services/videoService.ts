// Video Management Service with YouTube and Vimeo API Integration

export interface VideoProvider {
  id: string;
  name: string;
  type: 'youtube' | 'vimeo' | 'local' | 'url';
  isActive: boolean;
  configuration: {
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    baseUrl?: string;
  };
  quotaUsed: number;
  quotaLimit: number;
  lastSync?: string;
}

export interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  duration: number; // in seconds
  thumbnailUrl: string;
  videoUrl: string;
  embedUrl: string;
  provider: VideoProvider['type'];
  providerId: string;
  quality: 'low' | 'medium' | 'high' | 'hd' | '4k';
  format: string; // mp4, webm, etc.
  size: number; // in bytes
  uploadedAt: string;
  viewCount: number;
  likes: number;
  tags: string[];
  category: string;
  privacy: 'public' | 'private' | 'unlisted';
  isProcessing: boolean;
  processingStatus?: 'uploading' | 'processing' | 'ready' | 'failed';
  isActive: boolean;
  tenantId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseVideo extends VideoMetadata {
  exerciseId: string;
  exerciseName: string;
  muscleGroups: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment: string[];
  instructions: string[];
  cautions: string[];
  variations: string[];
  targetPatients: string[]; // patient IDs
  therapistNotes: string;
  viewAnalytics: {
    totalViews: number;
    uniqueViews: number;
    averageWatchTime: number;
    completionRate: number;
    engagementRate: number;
  };
}

export interface VideoPlaylist {
  id: string;
  name: string;
  description: string;
  thumbnailUrl?: string;
  videos: string[]; // video IDs
  totalDuration: number;
  isPublic: boolean;
  category: 'exercises' | 'education' | 'testimonials' | 'procedures' | 'other';
  targetAudience: 'patients' | 'therapists' | 'interns' | 'all';
  tags: string[];
  createdBy: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  analytics: {
    views: number;
    shares: number;
    favorites: number;
    completionRate: number;
  };
}

export interface VideoAnalytics {
  videoId: string;
  period: 'day' | 'week' | 'month' | 'year';
  date: string;
  views: number;
  uniqueViews: number;
  watchTime: number; // total seconds watched
  averageWatchTime: number;
  completionRate: number;
  engagementEvents: {
    play: number;
    pause: number;
    seek: number;
    fullscreen: number;
    qualityChange: number;
  };
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  geographicData: {
    country: string;
    views: number;
  }[];
  tenantId: string;
}

export interface VideoTranscoding {
  id: string;
  videoId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  quality: VideoMetadata['quality'];
  format: string;
  outputUrl?: string;
  progress: number; // 0-100%
  startedAt?: string;
  completedAt?: string;
  error?: string;
  tenantId: string;
}

class VideoService {
  private providers: VideoProvider[] = [];
  private videos: VideoMetadata[] = [];
  private exerciseVideos: ExerciseVideo[] = [];
  private playlists: VideoPlaylist[] = [];
  private analytics: VideoAnalytics[] = [];
  private transcodings: VideoTranscoding[] = [];

  constructor() {
    this.loadStoredData();
    this.initializeProviders();
  }

  private loadStoredData(): void {
    try {
      const storedProviders = localStorage.getItem('video_providers');
      if (storedProviders) {
        this.providers = JSON.parse(storedProviders);
      }

      const storedVideos = localStorage.getItem('video_metadata');
      if (storedVideos) {
        this.videos = JSON.parse(storedVideos);
      }

      const storedExerciseVideos = localStorage.getItem('exercise_videos');
      if (storedExerciseVideos) {
        this.exerciseVideos = JSON.parse(storedExerciseVideos);
      }

      const storedPlaylists = localStorage.getItem('video_playlists');
      if (storedPlaylists) {
        this.playlists = JSON.parse(storedPlaylists);
      }

      const storedAnalytics = localStorage.getItem('video_analytics');
      if (storedAnalytics) {
        this.analytics = JSON.parse(storedAnalytics);
      }

      const storedTranscodings = localStorage.getItem('video_transcodings');
      if (storedTranscodings) {
        this.transcodings = JSON.parse(storedTranscodings);
      }
    } catch (error) {
      console.error('Error loading video service data:', error);
    }
  }

  private saveData(): void {
    try {
      localStorage.setItem('video_providers', JSON.stringify(this.providers));
      localStorage.setItem('video_metadata', JSON.stringify(this.videos));
      localStorage.setItem('exercise_videos', JSON.stringify(this.exerciseVideos));
      localStorage.setItem('video_playlists', JSON.stringify(this.playlists));
      localStorage.setItem('video_analytics', JSON.stringify(this.analytics));
      localStorage.setItem('video_transcodings', JSON.stringify(this.transcodings));
    } catch (error) {
      console.error('Error saving video service data:', error);
    }
  }

  private initializeProviders(): void {
    if (this.providers.length === 0) {
      this.providers = [
        {
          id: 'youtube',
          name: 'YouTube',
          type: 'youtube',
          isActive: true,
          configuration: {
            apiKey: process.env.VITE_YOUTUBE_API_KEY || '',
            clientId: process.env.VITE_YOUTUBE_CLIENT_ID || '',
            clientSecret: process.env.VITE_YOUTUBE_CLIENT_SECRET || '',
            baseUrl: 'https://www.googleapis.com/youtube/v3'
          },
          quotaUsed: 0,
          quotaLimit: 10000 // Daily quota
        },
        {
          id: 'vimeo',
          name: 'Vimeo',
          type: 'vimeo',
          isActive: true,
          configuration: {
            clientId: process.env.VITE_VIMEO_CLIENT_ID || '',
            clientSecret: process.env.VITE_VIMEO_CLIENT_SECRET || '',
            accessToken: process.env.VITE_VIMEO_ACCESS_TOKEN || '',
            baseUrl: 'https://api.vimeo.com'
          },
          quotaUsed: 0,
          quotaLimit: 1000 // Daily quota
        }
      ];
      this.saveData();
    }
  }

  // YouTube API Integration
  async uploadToYouTube(
    file: File,
    metadata: {
      title: string;
      description: string;
      tags: string[];
      category: string;
      privacy: 'public' | 'private' | 'unlisted';
    },
    tenantId: string,
    createdBy: string
  ): Promise<VideoMetadata> {
    const youtubeProvider = this.providers.find(p => p.type === 'youtube');
    if (!youtubeProvider?.isActive) {
      throw new Error('YouTube provider not configured');
    }

    try {
      // Step 1: Initialize upload
      const initResponse = await fetch(`${youtubeProvider.configuration.baseUrl}/videos?uploadType=resumable&part=snippet,status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${youtubeProvider.configuration.accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Length': file.size.toString(),
          'X-Upload-Content-Type': file.type
        },
        body: JSON.stringify({
          snippet: {
            title: metadata.title,
            description: metadata.description,
            tags: metadata.tags,
            categoryId: this.getYouTubeCategoryId(metadata.category)
          },
          status: {
            privacyStatus: metadata.privacy
          }
        })
      });

      if (!initResponse.ok) {
        throw new Error(`YouTube upload initialization failed: ${initResponse.statusText}`);
      }

      const uploadUrl = initResponse.headers.get('Location');
      if (!uploadUrl) {
        throw new Error('Upload URL not received from YouTube');
      }

      // Step 2: Upload video file
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type
        },
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error(`YouTube video upload failed: ${uploadResponse.statusText}`);
      }

      const uploadResult = await uploadResponse.json();

      // Step 3: Create video metadata
      const videoMetadata: VideoMetadata = {
        id: this.generateId(),
        title: metadata.title,
        description: metadata.description,
        duration: 0, // Will be updated when processing completes
        thumbnailUrl: uploadResult.snippet?.thumbnails?.high?.url || '',
        videoUrl: `https://www.youtube.com/watch?v=${uploadResult.id}`,
        embedUrl: `https://www.youtube.com/embed/${uploadResult.id}`,
        provider: 'youtube',
        providerId: uploadResult.id,
        quality: 'high',
        format: 'mp4',
        size: file.size,
        uploadedAt: new Date().toISOString(),
        viewCount: 0,
        likes: 0,
        tags: metadata.tags,
        category: metadata.category,
        privacy: metadata.privacy,
        isProcessing: true,
        processingStatus: 'processing',
        isActive: true,
        tenantId,
        createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.videos.push(videoMetadata);
      youtubeProvider.quotaUsed += 100; // Approximate quota cost

      this.saveData();

      // Monitor processing status
      this.monitorYouTubeProcessing(videoMetadata.id, uploadResult.id);

      return videoMetadata;

    } catch (error) {
      console.error('YouTube upload error:', error);
      throw error;
    }
  }

  private async monitorYouTubeProcessing(videoId: string, youtubeId: string): Promise<void> {
    const youtubeProvider = this.providers.find(p => p.type === 'youtube');
    if (!youtubeProvider) return;

    const checkStatus = async () => {
      try {
        const response = await fetch(
          `${youtubeProvider.configuration.baseUrl}/videos?part=status,contentDetails,statistics&id=${youtubeId}`,
          {
            headers: {
              'Authorization': `Bearer ${youtubeProvider.configuration.accessToken}`
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          const videoData = data.items?.[0];

          if (videoData) {
            const video = this.videos.find(v => v.id === videoId);
            if (video) {
              video.isProcessing = videoData.status.uploadStatus !== 'processed';
              video.processingStatus = videoData.status.uploadStatus === 'processed' ? 'ready' : 'processing';
              
              if (videoData.contentDetails?.duration) {
                video.duration = this.parseYouTubeDuration(videoData.contentDetails.duration);
              }

              if (videoData.statistics) {
                video.viewCount = parseInt(videoData.statistics.viewCount || '0');
                video.likes = parseInt(videoData.statistics.likeCount || '0');
              }

              video.updatedAt = new Date().toISOString();
              this.saveData();
            }
          }
        }
      } catch (error) {
        console.error('Error checking YouTube processing status:', error);
      }
    };

    // Check status every 30 seconds for up to 10 minutes
    const maxChecks = 20;
    let checkCount = 0;

    const statusInterval = setInterval(async () => {
      checkCount++;
      await checkStatus();

      const video = this.videos.find(v => v.id === videoId);
      if (!video?.isProcessing || checkCount >= maxChecks) {
        clearInterval(statusInterval);
      }
    }, 30000);
  }

  private parseYouTubeDuration(duration: string): number {
    // Parse ISO 8601 duration format (PT4M13S -> 253 seconds)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return (hours * 3600) + (minutes * 60) + seconds;
  }

  private getYouTubeCategoryId(category: string): string {
    const categoryMap: Record<string, string> = {
      'education': '27',
      'howto': '26',
      'sports': '17',
      'health': '26',
      'wellness': '26',
      'fitness': '17'
    };
    
    return categoryMap[category.toLowerCase()] || '26'; // Default to Howto & Style
  }

  // Vimeo API Integration
  async uploadToVimeo(
    file: File,
    metadata: {
      title: string;
      description: string;
      tags: string[];
      privacy: 'public' | 'private' | 'unlisted';
    },
    tenantId: string,
    createdBy: string
  ): Promise<VideoMetadata> {
    const vimeoProvider = this.providers.find(p => p.type === 'vimeo');
    if (!vimeoProvider?.isActive) {
      throw new Error('Vimeo provider not configured');
    }

    try {
      // Step 1: Create video object
      const createResponse = await fetch(`${vimeoProvider.configuration.baseUrl}/me/videos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vimeoProvider.configuration.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: metadata.title,
          description: metadata.description,
          privacy: {
            view: metadata.privacy === 'unlisted' ? 'unlisted' : 
                  metadata.privacy === 'private' ? 'password' : 'anybody'
          },
          upload: {
            approach: 'tus',
            size: file.size
          }
        })
      });

      if (!createResponse.ok) {
        throw new Error(`Vimeo video creation failed: ${createResponse.statusText}`);
      }

      const createResult = await createResponse.json();
      const uploadLink = createResult.upload?.upload_link;
      const vimeoUri = createResult.uri;
      const vimeoId = vimeoUri.split('/').pop();

      if (!uploadLink) {
        throw new Error('Upload link not received from Vimeo');
      }

      // Step 2: Upload video file using TUS protocol
      await this.uploadToVimeoTus(uploadLink, file);

      // Step 3: Complete upload and set metadata
      await fetch(`${vimeoProvider.configuration.baseUrl}${vimeoUri}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${vimeoProvider.configuration.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: metadata.title,
          description: metadata.description,
          tags: metadata.tags.map(tag => ({ name: tag }))
        })
      });

      // Step 4: Create video metadata
      const videoMetadata: VideoMetadata = {
        id: this.generateId(),
        title: metadata.title,
        description: metadata.description,
        duration: 0, // Will be updated when processing completes
        thumbnailUrl: '', // Will be updated when processing completes
        videoUrl: `https://vimeo.com/${vimeoId}`,
        embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
        provider: 'vimeo',
        providerId: vimeoId!,
        quality: 'high',
        format: 'mp4',
        size: file.size,
        uploadedAt: new Date().toISOString(),
        viewCount: 0,
        likes: 0,
        tags: metadata.tags,
        category: 'education',
        privacy: metadata.privacy,
        isProcessing: true,
        processingStatus: 'processing',
        isActive: true,
        tenantId,
        createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.videos.push(videoMetadata);
      vimeoProvider.quotaUsed += 1;

      this.saveData();

      // Monitor processing status
      this.monitorVimeoProcessing(videoMetadata.id, vimeoUri);

      return videoMetadata;

    } catch (error) {
      console.error('Vimeo upload error:', error);
      throw error;
    }
  }

  private async uploadToVimeoTus(uploadUrl: string, file: File): Promise<void> {
    // Simplified TUS upload implementation
    const chunkSize = 1024 * 1024; // 1MB chunks
    const totalSize = file.size;
    let uploadedBytes = 0;

    while (uploadedBytes < totalSize) {
      const chunk = file.slice(uploadedBytes, Math.min(uploadedBytes + chunkSize, totalSize));
      
      const response = await fetch(uploadUrl, {
        method: 'PATCH',
        headers: {
          'Tus-Resumable': '1.0.0',
          'Upload-Offset': uploadedBytes.toString(),
          'Content-Type': 'application/offset+octet-stream'
        },
        body: chunk
      });

      if (!response.ok) {
        throw new Error(`Vimeo chunk upload failed: ${response.statusText}`);
      }

      uploadedBytes += chunk.size;
    }
  }

  private async monitorVimeoProcessing(videoId: string, vimeoUri: string): Promise<void> {
    const vimeoProvider = this.providers.find(p => p.type === 'vimeo');
    if (!vimeoProvider) return;

    const checkStatus = async () => {
      try {
        const response = await fetch(
          `${vimeoProvider.configuration.baseUrl}${vimeoUri}?fields=status,duration,pictures,stats`,
          {
            headers: {
              'Authorization': `Bearer ${vimeoProvider.configuration.accessToken}`
            }
          }
        );

        if (response.ok) {
          const videoData = await response.json();
          const video = this.videos.find(v => v.id === videoId);
          
          if (video) {
            video.isProcessing = videoData.status !== 'available';
            video.processingStatus = videoData.status === 'available' ? 'ready' : 'processing';
            
            if (videoData.duration) {
              video.duration = videoData.duration;
            }

            if (videoData.pictures?.sizes) {
              const thumbnail = videoData.pictures.sizes.find((size: any) => size.width >= 640);
              if (thumbnail) {
                video.thumbnailUrl = thumbnail.link;
              }
            }

            if (videoData.stats) {
              video.viewCount = videoData.stats.plays || 0;
            }

            video.updatedAt = new Date().toISOString();
            this.saveData();
          }
        }
      } catch (error) {
        console.error('Error checking Vimeo processing status:', error);
      }
    };

    // Check status every 30 seconds for up to 10 minutes
    const maxChecks = 20;
    let checkCount = 0;

    const statusInterval = setInterval(async () => {
      checkCount++;
      await checkStatus();

      const video = this.videos.find(v => v.id === videoId);
      if (!video?.isProcessing || checkCount >= maxChecks) {
        clearInterval(statusInterval);
      }
    }, 30000);
  }

  // Exercise Video Management
  async createExerciseVideo(
    videoId: string,
    exerciseData: {
      exerciseId: string;
      exerciseName: string;
      muscleGroups: string[];
      difficulty: ExerciseVideo['difficulty'];
      equipment: string[];
      instructions: string[];
      cautions: string[];
      variations: string[];
      targetPatients: string[];
      therapistNotes: string;
    }
  ): Promise<ExerciseVideo> {
    const baseVideo = this.videos.find(v => v.id === videoId);
    if (!baseVideo) {
      throw new Error('Base video not found');
    }

    const exerciseVideo: ExerciseVideo = {
      ...baseVideo,
      ...exerciseData,
      viewAnalytics: {
        totalViews: 0,
        uniqueViews: 0,
        averageWatchTime: 0,
        completionRate: 0,
        engagementRate: 0
      }
    };

    this.exerciseVideos.push(exerciseVideo);
    this.saveData();

    return exerciseVideo;
  }

  // Playlist Management
  async createPlaylist(
    name: string,
    description: string,
    videoIds: string[],
    category: VideoPlaylist['category'],
    targetAudience: VideoPlaylist['targetAudience'],
    isPublic: boolean,
    tenantId: string,
    createdBy: string
  ): Promise<VideoPlaylist> {
    // Calculate total duration
    const playlistVideos = this.videos.filter(v => videoIds.includes(v.id));
    const totalDuration = playlistVideos.reduce((sum, video) => sum + video.duration, 0);

    // Generate thumbnail from first video
    const thumbnailUrl = playlistVideos[0]?.thumbnailUrl || '';

    const playlist: VideoPlaylist = {
      id: this.generateId(),
      name,
      description,
      thumbnailUrl,
      videos: videoIds,
      totalDuration,
      isPublic,
      category,
      targetAudience,
      tags: [],
      createdBy,
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      analytics: {
        views: 0,
        shares: 0,
        favorites: 0,
        completionRate: 0
      }
    };

    this.playlists.push(playlist);
    this.saveData();

    return playlist;
  }

  // Video Analytics
  async trackVideoView(
    videoId: string,
    watchTime: number,
    completed: boolean,
    device: 'desktop' | 'mobile' | 'tablet',
    country: string,
    tenantId: string
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    let analytics = this.analytics.find(a => 
      a.videoId === videoId && 
      a.date === today && 
      a.period === 'day' &&
      a.tenantId === tenantId
    );

    if (!analytics) {
      analytics = {
        videoId,
        period: 'day',
        date: today,
        views: 0,
        uniqueViews: 0,
        watchTime: 0,
        averageWatchTime: 0,
        completionRate: 0,
        engagementEvents: {
          play: 0,
          pause: 0,
          seek: 0,
          fullscreen: 0,
          qualityChange: 0
        },
        deviceBreakdown: {
          desktop: 0,
          mobile: 0,
          tablet: 0
        },
        geographicData: [],
        tenantId
      };
      this.analytics.push(analytics);
    }

    // Update analytics
    analytics.views++;
    analytics.watchTime += watchTime;
    analytics.averageWatchTime = analytics.watchTime / analytics.views;
    
    if (completed) {
      analytics.completionRate = ((analytics.completionRate * (analytics.views - 1)) + 100) / analytics.views;
    }

    analytics.deviceBreakdown[device]++;
    analytics.engagementEvents.play++;

    // Update geographic data
    const countryData = analytics.geographicData.find(g => g.country === country);
    if (countryData) {
      countryData.views++;
    } else {
      analytics.geographicData.push({ country, views: 1 });
    }

    this.saveData();
  }

  async trackEngagementEvent(
    videoId: string,
    eventType: keyof VideoAnalytics['engagementEvents'],
    tenantId: string
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    const analytics = this.analytics.find(a => 
      a.videoId === videoId && 
      a.date === today && 
      a.period === 'day' &&
      a.tenantId === tenantId
    );

    if (analytics) {
      analytics.engagementEvents[eventType]++;
      this.saveData();
    }
  }

  // Search and Discovery
  async searchVideos(
    query: string,
    filters: {
      provider?: VideoProvider['type'];
      category?: string;
      duration?: { min?: number; max?: number };
      quality?: VideoMetadata['quality'];
      tags?: string[];
    },
    tenantId: string
  ): Promise<VideoMetadata[]> {
    let results = this.videos.filter(v => 
      v.tenantId === tenantId && 
      v.isActive &&
      !v.isProcessing
    );

    // Text search
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(v => 
        v.title.toLowerCase().includes(lowerQuery) ||
        v.description.toLowerCase().includes(lowerQuery) ||
        v.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }

    // Apply filters
    if (filters.provider) {
      results = results.filter(v => v.provider === filters.provider);
    }

    if (filters.category) {
      results = results.filter(v => v.category === filters.category);
    }

    if (filters.duration) {
      results = results.filter(v => {
        if (filters.duration!.min && v.duration < filters.duration!.min) return false;
        if (filters.duration!.max && v.duration > filters.duration!.max) return false;
        return true;
      });
    }

    if (filters.quality) {
      results = results.filter(v => v.quality === filters.quality);
    }

    if (filters.tags?.length) {
      results = results.filter(v => 
        filters.tags!.some(tag => 
          v.tags.some(vTag => vTag.toLowerCase().includes(tag.toLowerCase()))
        )
      );
    }

    // Sort by relevance (view count, upload date, etc.)
    results.sort((a, b) => {
      const scoreA = (a.viewCount * 0.5) + (new Date(a.uploadedAt).getTime() * 0.3) + (a.likes * 0.2);
      const scoreB = (b.viewCount * 0.5) + (new Date(b.uploadedAt).getTime() * 0.3) + (b.likes * 0.2);
      return scoreB - scoreA;
    });

    return results;
  }

  // Video Processing and Transcoding
  async requestTranscoding(
    videoId: string,
    targetQuality: VideoMetadata['quality'],
    targetFormat: string
  ): Promise<VideoTranscoding> {
    const video = this.videos.find(v => v.id === videoId);
    if (!video) {
      throw new Error('Video not found');
    }

    const transcoding: VideoTranscoding = {
      id: this.generateId(),
      videoId,
      status: 'queued',
      quality: targetQuality,
      format: targetFormat,
      progress: 0,
      tenantId: video.tenantId
    };

    this.transcodings.push(transcoding);
    this.saveData();

    // Simulate transcoding process
    this.simulateTranscoding(transcoding.id);

    return transcoding;
  }

  private async simulateTranscoding(transcodingId: string): Promise<void> {
    const transcoding = this.transcodings.find(t => t.id === transcodingId);
    if (!transcoding) return;

    transcoding.status = 'processing';
    transcoding.startedAt = new Date().toISOString();

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      transcoding.progress += Math.random() * 15;
      
      if (transcoding.progress >= 100) {
        transcoding.progress = 100;
        transcoding.status = Math.random() > 0.1 ? 'completed' : 'failed';
        transcoding.completedAt = new Date().toISOString();
        
        if (transcoding.status === 'completed') {
          transcoding.outputUrl = `https://cdn.fisioflow.com/videos/${transcoding.videoId}_${transcoding.quality}.${transcoding.format}`;
        } else {
          transcoding.error = 'Transcoding failed due to unsupported format';
        }

        clearInterval(progressInterval);
      }

      this.saveData();
    }, 2000);
  }

  private generateId(): string {
    return `VID_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API Methods
  getVideos(tenantId: string): VideoMetadata[] {
    return this.videos.filter(v => v.tenantId === tenantId);
  }

  getExerciseVideos(tenantId: string): ExerciseVideo[] {
    return this.exerciseVideos.filter(v => v.tenantId === tenantId);
  }

  getPlaylists(tenantId: string): VideoPlaylist[] {
    return this.playlists.filter(p => p.tenantId === tenantId);
  }

  getVideoAnalytics(videoId: string, period: VideoAnalytics['period'], tenantId: string): VideoAnalytics[] {
    return this.analytics.filter(a => 
      a.videoId === videoId && 
      a.period === period && 
      a.tenantId === tenantId
    );
  }

  getTranscodings(tenantId: string): VideoTranscoding[] {
    return this.transcodings.filter(t => t.tenantId === tenantId);
  }

  getProviders(): VideoProvider[] {
    return this.providers;
  }

  async updateProvider(id: string, updates: Partial<VideoProvider>): Promise<VideoProvider | undefined> {
    const providerIndex = this.providers.findIndex(p => p.id === id);
    if (providerIndex === -1) return undefined;

    this.providers[providerIndex] = { ...this.providers[providerIndex], ...updates };
    this.saveData();

    return this.providers[providerIndex];
  }

  async deleteVideo(videoId: string): Promise<boolean> {
    const initialLength = this.videos.length;
    this.videos = this.videos.filter(v => v.id !== videoId);
    this.exerciseVideos = this.exerciseVideos.filter(v => v.id !== videoId);
    
    // Remove from playlists
    this.playlists.forEach(playlist => {
      playlist.videos = playlist.videos.filter(id => id !== videoId);
    });

    if (this.videos.length < initialLength) {
      this.saveData();
      return true;
    }
    return false;
  }

  async updateVideo(videoId: string, updates: Partial<VideoMetadata>): Promise<VideoMetadata | undefined> {
    const videoIndex = this.videos.findIndex(v => v.id === videoId);
    if (videoIndex === -1) return undefined;

    this.videos[videoIndex] = { 
      ...this.videos[videoIndex], 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };
    
    this.saveData();
    return this.videos[videoIndex];
  }

  // Batch operations
  async batchUpload(
    files: File[],
    metadata: {
      category: string;
      tags: string[];
      privacy: VideoMetadata['privacy'];
      provider: VideoProvider['type'];
    },
    tenantId: string,
    createdBy: string
  ): Promise<VideoMetadata[]> {
    const results: VideoMetadata[] = [];

    for (const file of files) {
      try {
        const videoMetadata = {
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          description: `Uploaded video: ${file.name}`,
          tags: metadata.tags,
          category: metadata.category,
          privacy: metadata.privacy
        };

        let uploadedVideo: VideoMetadata;

        if (metadata.provider === 'youtube') {
          uploadedVideo = await this.uploadToYouTube(file, videoMetadata, tenantId, createdBy);
        } else if (metadata.provider === 'vimeo') {
          uploadedVideo = await this.uploadToVimeo(file, videoMetadata, tenantId, createdBy);
        } else {
          throw new Error(`Unsupported provider: ${metadata.provider}`);
        }

        results.push(uploadedVideo);
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
      }
    }

    return results;
  }
}

export const videoService = new VideoService();

// React Hook for Video Management
export const useVideoService = () => {
  const uploadToYouTube = (file: File, metadata: any, tenantId: string, createdBy: string) =>
    videoService.uploadToYouTube(file, metadata, tenantId, createdBy);

  const uploadToVimeo = (file: File, metadata: any, tenantId: string, createdBy: string) =>
    videoService.uploadToVimeo(file, metadata, tenantId, createdBy);

  const createExerciseVideo = (videoId: string, exerciseData: any) =>
    videoService.createExerciseVideo(videoId, exerciseData);

  const createPlaylist = (name: string, description: string, videoIds: string[], category: any, targetAudience: any, isPublic: boolean, tenantId: string, createdBy: string) =>
    videoService.createPlaylist(name, description, videoIds, category, targetAudience, isPublic, tenantId, createdBy);

  const searchVideos = (query: string, filters: any, tenantId: string) =>
    videoService.searchVideos(query, filters, tenantId);

  const trackVideoView = (videoId: string, watchTime: number, completed: boolean, device: any, country: string, tenantId: string) =>
    videoService.trackVideoView(videoId, watchTime, completed, device, country, tenantId);

  const trackEngagementEvent = (videoId: string, eventType: any, tenantId: string) =>
    videoService.trackEngagementEvent(videoId, eventType, tenantId);

  const requestTranscoding = (videoId: string, targetQuality: any, targetFormat: string) =>
    videoService.requestTranscoding(videoId, targetQuality, targetFormat);

  const batchUpload = (files: File[], metadata: any, tenantId: string, createdBy: string) =>
    videoService.batchUpload(files, metadata, tenantId, createdBy);

  const getVideos = (tenantId: string) => videoService.getVideos(tenantId);
  const getExerciseVideos = (tenantId: string) => videoService.getExerciseVideos(tenantId);
  const getPlaylists = (tenantId: string) => videoService.getPlaylists(tenantId);
  const getVideoAnalytics = (videoId: string, period: any, tenantId: string) => 
    videoService.getVideoAnalytics(videoId, period, tenantId);
  const getTranscodings = (tenantId: string) => videoService.getTranscodings(tenantId);
  const getProviders = () => videoService.getProviders();
  const updateProvider = (id: string, updates: any) => videoService.updateProvider(id, updates);
  const deleteVideo = (videoId: string) => videoService.deleteVideo(videoId);
  const updateVideo = (videoId: string, updates: any) => videoService.updateVideo(videoId, updates);

  return {
    uploadToYouTube,
    uploadToVimeo,
    createExerciseVideo,
    createPlaylist,
    searchVideos,
    trackVideoView,
    trackEngagementEvent,
    requestTranscoding,
    batchUpload,
    getVideos,
    getExerciseVideos,
    getPlaylists,
    getVideoAnalytics,
    getTranscodings,
    getProviders,
    updateProvider,
    deleteVideo,
    updateVideo
  };
};