import { useState } from 'react';
import { Download, Loader2, Video, Music, AlertCircle, Trash2, X, DownloadCloud } from 'lucide-react';

type VideoData = {
  id: string;
  url: string;
  status: 'fetching' | 'success' | 'error';
  info?: any;
  error?: string;
};

export default function App() {
  const [inputUrls, setInputUrls] = useState('');
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  const handleFetch = async () => {
    const urls = inputUrls.split('\n').map(u => u.trim()).filter(u => u);
    if (urls.length === 0) return;

    setInputUrls('');
    setIsFetching(true);

    const newVideos: VideoData[] = urls.map(url => ({
      id: Math.random().toString(36).substring(7),
      url,
      status: 'fetching'
    }));

    setVideos(prev => [...newVideos, ...prev]);

    // Process sequentially to avoid throwing generic fetch errors on heavy concurrent loads
    for (const v of newVideos) {
      try {
        const res = await fetch(`/api/video-info?url=${encodeURIComponent(v.url)}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to fetch video info');
        }
        const data = await res.json();
        setVideos(prev => prev.map(item => item.id === v.id ? { ...item, status: 'success', info: data } : item));
      } catch (err: any) {
        setVideos(prev => prev.map(item => item.id === v.id ? { ...item, status: 'error', error: err.message } : item));
      }
    }

    setIsFetching(false);
  };

  const handleDownload = (url: string, formatId: string, ext: string, title: string) => {
    const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&format=${formatId}&ext=${ext}&title=${encodeURIComponent(title)}`;
    window.open(downloadUrl, '_blank');
  };

  const getBestFormat = (formats: any[]) => {
    if (!formats) return null;
    const valid = formats.filter(f => f.ext !== 'mhtml' && f.protocol !== 'm3u8_native');
    const both = valid.filter(f => f.vcodec !== 'none' && f.acodec !== 'none');
    if (both.length > 0) return both.sort((a,b) => (b.height||0) - (a.height||0))[0];
    const video = valid.filter(f => f.vcodec !== 'none');
    if (video.length > 0) return video.sort((a,b) => (b.height||0) - (a.height||0))[0];
    return valid[0] || null;
  };

  const handleDownloadAll = () => {
    const successfulVideos = videos.filter(v => v.status === 'success' && v.info);
    
    successfulVideos.forEach((video, index) => {
      // Stagger downloads by 1 second to avoid browser popup blockers blocking multiple window.open()
      setTimeout(() => {
        const best = getBestFormat(video.info.formats);
        if (best) {
          handleDownload(video.url, best.format_id, best.ext, video.info.title);
        }
      }, index * 1000); 
    });
  };

  const removeVideo = (id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id));
  };
  
  const clearAll = () => setVideos([]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4 flex flex-col items-center">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-inner border border-indigo-200">
            <DownloadCloud className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900">Batch Video Downloader</h1>
            <p className="text-zinc-500">Download multiple videos from YouTube, TikTok, Facebook, and more.</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 space-y-4">
          <textarea
            placeholder="Paste video URLs here... (one URL per line)"
            className="w-full px-4 py-3 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm resize-y"
            rows={4}
            value={inputUrls}
            onChange={(e) => setInputUrls(e.target.value)}
          />
          <div className="flex justify-end">
            <button
              onClick={handleFetch}
              disabled={isFetching || !inputUrls.trim()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
            >
              {isFetching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              Fetch Videos
            </button>
          </div>
        </div>

        {videos.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-zinc-100 p-4 rounded-xl border border-zinc-200 gap-4">
              <div className="font-medium text-zinc-700">
                {videos.length} video{videos.length > 1 ? 's' : ''} in queue ({videos.filter(v => v.status === 'success').length} ready)
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDownloadAll}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download All
                </button>
                <button
                  onClick={clearAll}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {videos.map(video => (
                <div key={video.id} className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 relative">
                  <button 
                    onClick={() => removeVideo(video.id)}
                    className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  {video.status === 'fetching' && (
                    <div className="flex items-center gap-4 py-4 text-zinc-500">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                      <div>
                        <p className="font-medium text-zinc-900">Fetching information...</p>
                        <p className="text-sm truncate w-64 md:w-96 text-zinc-500">{video.url}</p>
                      </div>
                    </div>
                  )}

                  {video.status === 'error' && (
                    <div className="flex items-start gap-4 py-4 text-red-700 pr-8">
                      <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">Failed to fetch video</p>
                        <p className="text-sm truncate opacity-80">{video.url}</p>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{video.error}</p>
                      </div>
                    </div>
                  )}

                  {video.status === 'success' && video.info && (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row gap-6 pr-8">
                        {video.info.thumbnail ? (
                          <img
                            src={video.info.thumbnail}
                            alt={video.info.title}
                            className="w-full md:w-48 h-32 rounded-xl object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full md:w-48 h-32 rounded-xl bg-zinc-100 flex items-center justify-center">
                            <Video className="w-8 h-8 text-zinc-300" />
                          </div>
                        )}
                        <div className="space-y-2 flex-1 min-w-0">
                          <h2 className="text-xl font-semibold line-clamp-2">{video.info.title}</h2>
                          <p className="text-zinc-500 text-sm truncate">{video.url}</p>
                          <p className="text-zinc-500 text-sm">
                            {video.info.duration ? `${Math.floor(video.info.duration / 60)}:${(video.info.duration % 60).toString().padStart(2, '0')}` : 'Unknown duration'}
                            {video.info.uploader && ` • ${video.info.uploader}`}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 pb-2">Available Formats</h3>
                        <div className="grid gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                          {video.info.formats
                            ?.filter((f: any) => f.ext !== 'mhtml' && f.protocol !== 'm3u8_native')
                            .sort((a: any, b: any) => (b.height || 0) - (a.height || 0))
                            .map((format: any) => {
                              const isVideo = format.vcodec !== 'none';
                              const isAudio = format.acodec !== 'none';
                              const isVideoOnly = isVideo && !isAudio;
                              const isAudioOnly = !isVideo && isAudio;

                              if (!isVideo && !isAudio) return null;

                              return (
                                <div key={format.format_id} className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-colors">
                                  <div className="flex items-center gap-3">
                                    {isVideo ? <Video className="w-5 h-5 text-zinc-400" /> : <Music className="w-5 h-5 text-zinc-400" />}
                                    <div>
                                      <p className="font-medium text-zinc-900 leading-tight">
                                        {format.resolution || (isAudioOnly ? 'Audio Only' : 'Unknown')}
                                        {format.format_note && <span className="text-zinc-500 font-normal ml-2">({format.format_note})</span>}
                                      </p>
                                      <p className="text-xs text-zinc-500 uppercase mt-0.5">
                                        {format.ext} • {format.vcodec !== 'none' ? format.vcodec : ''} {format.acodec !== 'none' ? `• ${format.acodec}` : ''}
                                        {format.filesize ? ` • ${(format.filesize / 1024 / 1024).toFixed(1)} MB` : ''}
                                        {isVideoOnly && <span className="text-amber-600 ml-2 font-medium">No Audio</span>}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDownload(video.url, format.format_id, format.ext, video.info.title)}
                                    className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
                                  >
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline">Download</span>
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
