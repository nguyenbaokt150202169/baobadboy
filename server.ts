import express from 'express';
import { createServer as createViteServer } from 'vite';
import youtubedl from 'youtube-dl-exec';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/video-info', async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      const output = await youtubedl(url, {
        dumpJson: true,
        noWarnings: true,
        noCallHome: true,
        noCheckCertificate: true,
        preferFreeFormats: true,
        youtubeSkipDashManifest: true,
      });

      res.json(output);
    } catch (error: any) {
      console.error('Error fetching video info:', error);
      res.status(500).json({ error: 'Failed to fetch video info', details: error.message });
    }
  });

  app.get('/api/download', (req, res) => {
    const url = req.query.url as string;
    const format = req.query.format as string || 'best';
    const ext = req.query.ext as string || 'mp4';
    const title = req.query.title as string || 'video';

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Sanitize filename
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${safeTitle}.${ext}`;

    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.header('Content-Type', 'application/octet-stream');

    const subprocess = youtubedl.exec(url, {
      format: format,
      output: '-', // Stream to stdout
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      youtubeSkipDashManifest: true,
    });

    if (subprocess.stdout) {
      subprocess.stdout.pipe(res);
    } else {
      res.status(500).json({ error: 'Failed to start download stream' });
    }

    subprocess.on('error', (err) => {
      console.error('Download error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download failed' });
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    import('path').then((path) => {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
