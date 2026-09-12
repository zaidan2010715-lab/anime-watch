import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CANDIDATES = [
  path.join(process.cwd(), 'data', 'episodes.json'),
  path.join(__dirname, '..', 'data', 'episodes.json'),
];
const FALLBACK_TEMPLATES = [];

function loadData() {
  for (const p of CANDIDATES) {
    try { return JSON.parse(readFileSync(p, 'utf8')); }
    catch (e) {}
  }
  return { anime: {}, templates: [], subtitles: [] };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');

  const id = String(req.query.id || '').trim();
  const mal = String(req.query.mal || id).trim(); // استخراج MAL ID
  const ep = String(req.query.ep || '').trim();
  const title = String(req.query.title || '').trim();
  
  if (!id || !ep) {
    return res.status(400).json({ error: 'المعاملان id و ep مطلوبان' });
  }

  const data = loadData();
  let show = data.anime?.[id] || null;
  if (!show && title && data.anime) {
    const t = title.toLowerCase();
    show = Object.values(data.anime).find(a => String(a.title || '').toLowerCase() === t) || null;
  }
  show = show || {};

  // هنا أضفنا {mal} ليتم استبداله في قوالب السيرفرات
  const fill = u => String(u)
    .replaceAll('{id}', encodeURIComponent(id))
    .replaceAll('{mal}', encodeURIComponent(mal))
    .replaceAll('{ep}', encodeURIComponent(ep))
    .replaceAll('{title}', encodeURIComponent(title));

  const servers = [];
  const push = s => {
    if (!s?.url) return;
    const srv = { name: s.name || 'سيرفر', url: fill(s.url), type: s.type === 'embed' ? 'embed' : (s.type || 'm3u8') };
    if (!servers.some(x => x.url === srv.url)) servers.push(srv);
  };

  (show.servers || []).forEach(push);
  const epData = show.episodes?.[ep] || show.episodes?.['*'] || {};
  (epData.servers || []).forEach(push);

  const hasDirect = servers.some(s => s.type !== 'embed');
  const templates = [...(data.templates || []), ...(show.directOnly ? [] : FALLBACK_TEMPLATES)];
  templates.forEach(t => push({ name: t.name || 'سيرفر تضمين', url: t.url, type: 'embed' }));

  const subtitles = epData.subtitles || show.subtitles || data.subtitles || [];

  return res.status(200).json({
    id, ep: Number(ep) || ep, title, direct: hasDirect, servers, subtitles,
  });
}
