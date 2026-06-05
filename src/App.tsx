/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Download, Loader2, Video, Music, AlertCircle } from 'lucide-react';

export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videoInfo, setVideoInfo] = useState<any>(null);

  const fetchVideoInfo = async () => {
    if (!url) return;
    setLoading(true);
    setError('');
    setVideoInfo(null);

    try {
      const res = await fetch(`/api/video-info?url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch video info');
      }
      const data = await res.json();
      setVideoInfo(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (formatId: string, ext: string) => {
    if (!videoInfo) return;
    const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&format=${formatId}&ext=${ext}&title=${encodeURIComponent(videoInfo.title)}`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 p-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900">Video Downloader</h1>
          <p className="text-zinc-500">Download videos from YouTube, TikTok, Facebook, and more.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 space-y-4">
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="Paste video URL here..."
              className="flex-1 px-4 py-3 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchVideoInfo()}
            />
            <button
              onClick={fetchVideoInfo}
              disabled={loading || !url}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              Fetch
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {videoInfo && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              {videoInfo.thumbnail && (
                <img
                  src={videoInfo.thumbnail}
                  alt={videoInfo.title}
                  className="w-full md:w-64 h-auto rounded-xl object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="space-y-2 flex-1">
                <h2 className="text-xl font-semibold line-clamp-2">{videoInfo.title}</h2>
                <p className="text-zinc-500 text-sm">
                  {videoInfo.duration ? `${Math.floor(videoInfo.duration / 60)}:${(videoInfo.duration % 60).toString().padStart(2, '0')}` : 'Unknown duration'}
                  {videoInfo.uploader && ` • ${videoInfo.uploader}`}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Available Formats</h3>
              <div className="grid gap-3">
                {videoInfo.formats
                  ?.filter((f: any) => f.ext !== 'mhtml' && f.protocol !== 'm3u8_native')
                  .sort((a: any, b: any) => (b.height || 0) - (a.height || 0))
                  .map((format: any) => {
                    const isVideo = format.vcodec !== 'none';
                    const isAudio = format.acodec !== 'none';
                    const isVideoOnly = isVideo && !isAudio;
                    const isAudioOnly = !isVideo && isAudio;

                    // Skip weird formats
                    if (!isVideo && !isAudio) return null;

                    return (
                      <div key={format.format_id} className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-colors">
                        <div className="flex items-center gap-3">
                          {isVideo ? <Video className="w-5 h-5 text-zinc-400" /> : <Music className="w-5 h-5 text-zinc-400" />}
                          <div>
                            <p className="font-medium text-zinc-900">
                              {format.resolution || (isAudioOnly ? 'Audio Only' : 'Unknown')}
                              {format.format_note && <span className="text-zinc-500 font-normal ml-2">({format.format_note})</span>}
                            </p>
                            <p className="text-xs text-zinc-500 uppercase">
                              {format.ext} • {format.vcodec !== 'none' ? format.vcodec : ''} {format.acodec !== 'none' ? `• ${format.acodec}` : ''}
                              {format.filesize ? ` • ${(format.filesize / 1024 / 1024).toFixed(1)} MB` : ''}
                              {isVideoOnly && <span className="text-amber-600 ml-2">No Audio</span>}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownload(format.format_id, format.ext)}
                          className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
