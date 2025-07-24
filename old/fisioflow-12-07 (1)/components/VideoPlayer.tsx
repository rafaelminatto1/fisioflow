import React from 'react';
import Plyr from 'plyr-react';
import { Exercise } from '../types';

interface VideoPlayerProps {
    exercise: Exercise;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ exercise }) => {
    const isYouTube = exercise.videoUrl.includes('youtube.com/embed');

    if (isYouTube) {
        // For YouTube videos, use a standard iframe to avoid cross-origin errors
        // that can occur with player libraries in some sandboxed environments.
        // We'll construct a URL that is more robust.
        let videoUrl = exercise.videoUrl;
        try {
            const url = new URL(videoUrl);
            if (!url.searchParams.has('origin')) {
                // The origin needs to be set for YouTube's JS API to work in iframes.
                 url.searchParams.set('origin', window.location.origin);
            }
            videoUrl = url.toString();
        } catch(e) {
            // Ignore if URL is malformed, just use it as is.
        }
        
        return (
            <div className="aspect-video w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                <iframe
                    src={videoUrl}
                    className="w-full h-full"
                    title={exercise.name}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            </div>
        );
    }
    
    // For other videos (e.g., local blobs), use Plyr.
    const sourceInfo: Plyr.SourceInfo = {
        type: 'video',
        sources: [
            {
                src: exercise.videoUrl,
                type: 'video/mp4', // Assuming mp4 for blobs, but browser is smart.
            },
        ],
    };

    return (
        <div className="aspect-video w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700 plyr__video-embed">
             <Plyr source={sourceInfo} />
        </div>
    );
};

export default VideoPlayer;
