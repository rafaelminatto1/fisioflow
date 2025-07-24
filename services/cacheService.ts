import { Exercise, ExerciseVideo, ExerciseImage } from '../types';

export interface CachedExercise {
  exercise: Exercise;
  videos: ExerciseVideo[];
  images: ExerciseImage[];
  cachedAt: string;
  expiresAt: string;
}

export interface CacheManifest {
  version: string;
  exercises: string[];
  lastUpdated: string;
}

class CacheService {
  private readonly CACHE_PREFIX = 'fisioflow-cache-';
  private readonly MANIFEST_KEY = 'fisioflow-cache-manifest';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly MAX_CACHE_SIZE = 50; // Maximum number of cached exercises

  /**
   * Cache exercise data for offline access
   */
  cacheExercise(
    exercise: Exercise,
    videos: ExerciseVideo[],
    images: ExerciseImage[]
  ): void {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.CACHE_DURATION);

      const cachedData: CachedExercise = {
        exercise,
        videos,
        images,
        cachedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      const cacheKey = this.getCacheKey(exercise.id);
      localStorage.setItem(cacheKey, JSON.stringify(cachedData));

      // Update manifest
      this.updateManifest(exercise.id);
      
      // Clean old cache entries
      this.cleanExpiredCache();

      console.log(`Exercise ${exercise.name} cached successfully`);
    } catch (error) {
      console.error('Failed to cache exercise:', error);
    }
  }

  /**
   * Retrieve cached exercise data
   */
  getCachedExercise(exerciseId: string): CachedExercise | null {
    try {
      const cacheKey = this.getCacheKey(exerciseId);
      const cachedData = localStorage.getItem(cacheKey);

      if (!cachedData) {
        return null;
      }

      const parsed: CachedExercise = JSON.parse(cachedData);
      
      // Check if cache is expired
      if (new Date() > new Date(parsed.expiresAt)) {
        this.removeCachedExercise(exerciseId);
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('Failed to retrieve cached exercise:', error);
      return null;
    }
  }

  /**
   * Check if exercise is cached and valid
   */
  isExerciseCached(exerciseId: string): boolean {
    return this.getCachedExercise(exerciseId) !== null;
  }

  /**
   * Remove cached exercise
   */
  removeCachedExercise(exerciseId: string): void {
    try {
      const cacheKey = this.getCacheKey(exerciseId);
      localStorage.removeItem(cacheKey);
      
      // Update manifest
      this.removeFromManifest(exerciseId);
      
      console.log(`Cached exercise ${exerciseId} removed`);
    } catch (error) {
      console.error('Failed to remove cached exercise:', error);
    }
  }

  /**
   * Pre-cache multiple exercises for offline access
   */
  async preCacheExercises(
    exercises: Exercise[],
    getVideosFunc: (id: string) => ExerciseVideo[],
    getImagesFunc: (id: string) => ExerciseImage[],
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    console.log(`Pre-caching ${exercises.length} exercises...`);
    
    for (let i = 0; i < exercises.length; i++) {
      const exercise = exercises[i];
      
      // Skip if already cached and not expired
      if (this.isExerciseCached(exercise.id)) {
        continue;
      }

      const videos = getVideosFunc(exercise.id);
      const images = getImagesFunc(exercise.id);

      this.cacheExercise(exercise, videos, images);

      if (onProgress) {
        onProgress(i + 1, exercises.length);
      }

      // Small delay to prevent blocking the UI
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    console.log('Pre-caching completed');
  }

  /**
   * Get all cached exercises
   */
  getAllCachedExercises(): CachedExercise[] {
    try {
      const manifest = this.getManifest();
      const cachedExercises: CachedExercise[] = [];

      manifest.exercises.forEach(exerciseId => {
        const cached = this.getCachedExercise(exerciseId);
        if (cached) {
          cachedExercises.push(cached);
        }
      });

      return cachedExercises.sort((a, b) => 
        new Date(b.cachedAt).getTime() - new Date(a.cachedAt).getTime()
      );
    } catch (error) {
      console.error('Failed to get cached exercises:', error);
      return [];
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalCached: number;
    totalSize: string;
    oldestCache: string | null;
    newestCache: string | null;
  } {
    try {
      const cachedExercises = this.getAllCachedExercises();
      
      let totalSize = 0;
      cachedExercises.forEach(cached => {
        const dataSize = JSON.stringify(cached).length;
        totalSize += dataSize;
      });

      const oldestCache = cachedExercises.length > 0 
        ? cachedExercises[cachedExercises.length - 1].cachedAt
        : null;
      
      const newestCache = cachedExercises.length > 0 
        ? cachedExercises[0].cachedAt
        : null;

      return {
        totalCached: cachedExercises.length,
        totalSize: this.formatBytes(totalSize),
        oldestCache,
        newestCache,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalCached: 0,
        totalSize: '0 B',
        oldestCache: null,
        newestCache: null,
      };
    }
  }

  /**
   * Clear all cached data
   */
  clearAllCache(): void {
    try {
      const manifest = this.getManifest();
      
      manifest.exercises.forEach(exerciseId => {
        const cacheKey = this.getCacheKey(exerciseId);
        localStorage.removeItem(cacheKey);
      });

      localStorage.removeItem(this.MANIFEST_KEY);
      
      console.log('All cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Download exercise content for offline access
   */
  async downloadForOffline(
    exercise: Exercise,
    videos: ExerciseVideo[],
    images: ExerciseImage[]
  ): Promise<void> {
    try {
      // Pre-load video thumbnails
      const videoPromises = videos.map(video => {
        if (video.thumbnailUrl) {
          return this.preloadImage(video.thumbnailUrl);
        }
        return Promise.resolve();
      });

      // Pre-load images
      const imagePromises = images.map(image => {
        return this.preloadImage(image.imageUrl);
      });

      await Promise.all([...videoPromises, ...imagePromises]);
      
      // Cache the exercise data
      this.cacheExercise(exercise, videos, images);
      
      console.log(`Exercise ${exercise.name} downloaded for offline access`);
    } catch (error) {
      console.error('Failed to download exercise for offline:', error);
      throw error;
    }
  }

  /**
   * Check if device is online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Set up offline event listeners
   */
  setupOfflineListeners(
    onOnline: () => void,
    onOffline: () => void
  ): () => void {
    const handleOnline = () => {
      console.log('Device is online');
      onOnline();
    };

    const handleOffline = () => {
      console.log('Device is offline');
      onOffline();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Return cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  // Private methods

  private getCacheKey(exerciseId: string): string {
    return `${this.CACHE_PREFIX}${exerciseId}`;
  }

  private getManifest(): CacheManifest {
    try {
      const manifestData = localStorage.getItem(this.MANIFEST_KEY);
      if (manifestData) {
        return JSON.parse(manifestData);
      }
    } catch (error) {
      console.error('Failed to load cache manifest:', error);
    }

    // Return default manifest
    return {
      version: '1.0.0',
      exercises: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  private updateManifest(exerciseId: string): void {
    try {
      const manifest = this.getManifest();
      
      if (!manifest.exercises.includes(exerciseId)) {
        manifest.exercises.push(exerciseId);
        
        // Maintain max cache size
        if (manifest.exercises.length > this.MAX_CACHE_SIZE) {
          const toRemove = manifest.exercises.shift();
          if (toRemove) {
            this.removeCachedExercise(toRemove);
          }
        }
      }

      manifest.lastUpdated = new Date().toISOString();
      localStorage.setItem(this.MANIFEST_KEY, JSON.stringify(manifest));
    } catch (error) {
      console.error('Failed to update cache manifest:', error);
    }
  }

  private removeFromManifest(exerciseId: string): void {
    try {
      const manifest = this.getManifest();
      manifest.exercises = manifest.exercises.filter(id => id !== exerciseId);
      manifest.lastUpdated = new Date().toISOString();
      localStorage.setItem(this.MANIFEST_KEY, JSON.stringify(manifest));
    } catch (error) {
      console.error('Failed to remove from cache manifest:', error);
    }
  }

  private cleanExpiredCache(): void {
    try {
      const manifest = this.getManifest();
      const validExercises: string[] = [];

      manifest.exercises.forEach(exerciseId => {
        const cached = this.getCachedExercise(exerciseId);
        if (cached) {
          validExercises.push(exerciseId);
        } else {
          // Remove invalid cache entry
          const cacheKey = this.getCacheKey(exerciseId);
          localStorage.removeItem(cacheKey);
        }
      });

      // Update manifest with only valid exercises
      if (validExercises.length !== manifest.exercises.length) {
        manifest.exercises = validExercises;
        manifest.lastUpdated = new Date().toISOString();
        localStorage.setItem(this.MANIFEST_KEY, JSON.stringify(manifest));
      }
    } catch (error) {
      console.error('Failed to clean expired cache:', error);
    }
  }

  private async preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
      
      // Timeout after 10 seconds
      setTimeout(() => reject(new Error(`Timeout loading image: ${url}`)), 10000);
    });
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i)) + ' ' + sizes[i];
  }
}

export const cacheService = new CacheService();