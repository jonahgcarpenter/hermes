// Simple Giphy API search utility
// Set VITE_GIPHY_API_KEY in your .env file

const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY;
const GIPHY_SEARCH_URL = 'https://api.giphy.com/v1/gifs/search';

if (!GIPHY_API_KEY) {
  console.warn('VITE_GIPHY_API_KEY is not set. Giphy GIF search will not work.');
}

export async function searchGiphyGifs(query: string, limit = 16) {
  if (!GIPHY_API_KEY) {
    throw new Error('Giphy API key is not configured. Set VITE_GIPHY_API_KEY in your .env file.');
  }
  const params = new URLSearchParams({
    api_key: GIPHY_API_KEY,
    q: query,
    limit: limit.toString(),
    rating: 'pg',
    lang: 'en',
  });
  const res = await fetch(`${GIPHY_SEARCH_URL}?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch GIFs');
  const data = await res.json();
  return data.data || [];
}
