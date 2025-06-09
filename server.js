// server.js
import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import { GetListByKeyword } from 'youtube-search-api';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));

async function getSpotifyToken(clientId, clientSecret) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Spotify token error: ${data.error_description || data.error}`);
  return data.access_token;
}

function extractPlaylistId(url) {
  const match = url.match(/playlist\/([a-zA-Z0-9]+)/) || url.match(/spotify:playlist:([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

async function getPlaylistTracks(token, playlistId) {
  let tracks = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=items(track(name)),next&limit=100`;

  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error('Failed to fetch playlist tracks');
    const names = data.items.map(item => item.track?.name).filter(Boolean);
    tracks.push(...names);
    url = data.next;
  }
  return tracks;
}

async function getTopYouTubeLink(query) {
  try {
    const result = await GetListByKeyword(query, false, 5);
    if (!result || !result.items || result.items.length === 0) return null;

    const first = result.items.find(item => item.type === 'video');
    return first ? `https://www.youtube.com/watch?v=${first.id}` : null;
  } catch (error) {
    console.error("YT Search Error:", error);
    return null;
  }
}

function createWatchVideosURL(videoIds) {
  if (!Array.isArray(videoIds) || videoIds.length === 0) {
    throw new Error('videoIds must be a non-empty array');
  }
  return 'https://www.youtube.com/watch_videos?video_ids=' + videoIds.join(',');
}

app.get('/api/convert', async (req, res) => {
  const playlistUrl = req.query.url;
  if (!playlistUrl) return res.status(400).json({ error: 'Missing url parameter' });

  const playlistId = extractPlaylistId(playlistUrl);
  if (!playlistId) return res.status(400).json({ error: 'Invalid Spotify URL' });

  try {
    const token = await getSpotifyToken(process.env.SPOTIFY_CLIENT_ID, process.env.SPOTIFY_CLIENT_SECRET);
    const trackNames = await getPlaylistTracks(token, playlistId);

    const youtubeLinks = [];
    for (const name of trackNames) {
      const link = await getTopYouTubeLink(name);
      if (link) youtubeLinks.push(link);
    }

    // Extract video IDs from YouTube links
    const videoIds = youtubeLinks.map(link => {
      const match = link.match(/v=([a-zA-Z0-9_-]{11})/);
      return match ? match[1] : null;
    }).filter(Boolean);

    const playlistUrlYT = createWatchVideosURL(videoIds);
    res.json({ playlistUrl: playlistUrlYT });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to convert playlist' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
