// api/search.js — بحث الأنمي عبر AniList GraphQL (خادم وكيل يتجاوز CORS)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'معامل q مطلوب' });

  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 6) {
        media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
          id
          title { romaji english }
          episodes
          coverImage { large }
          averageScore
        }
      }
    }`;

  const r = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { search: q } }),
  });

  const data = await r.json();
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).json(data.data.Page.media);
}
