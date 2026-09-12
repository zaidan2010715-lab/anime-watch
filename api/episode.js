// api/episode.js — جلب سيرفرات حلقة بأولوية: روابطك المباشرة ← قوالب التضمين الاحتياطية
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// مسارات محتملة للملف (Vercel قد يضع الملفات المرفقة بمسار مختلف قليلاً)
const CANDIDATES = [
  path.join(process.cwd(), 'data', 'episodes.json'),
  path.join(__dirname, '..', 'data', 'episodes.json'),
];

// قوالب تضمين احتياطية عامة — املأها بمصادرك القانونية فقط.
// المتاح في القالب: {id} = معرف الأنمي، {ep} = رقم الحلقة، {title} = العنوان (مُرمَّز تلقائياً)
const FALLBACK_TEMPLATES = [
  // مثال على الشكل (استبدله بسيرفر تملكه أو مصدر قانوني):
  // { name: 'مشغّلي الخاص', type: 'embed', url: 'https://player.mydomain.com/embed/{id}/{ep}' }
];

function loadData() {
  for (const p of CANDIDATES) {
    try { return JSON.parse(readFileSync(p, 'utf8')); }
    catch (e) { /* جرّب المسار التالي */ }
  }
  return { anime: {}, templates: [], subtitles: [] };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');

  const id = String(req.query.id || '').trim();
  const ep = String(req.query.ep || '').trim();
  const title = String(req.query.title || '').trim();
  if (!id || !ep) {
    return res.status(400).json({ error: 'المعاملان id و ep مطلوبان' });
  }

  const data = loadData();

  // ابحث عن الأنمي بالمعرف أولاً، ثم بالعنوان (تطابق غير حساس لحالة الأحرف)
  let show = data.anime?.[id] || null;
  if (!show && title && data.anime) {
    const t = title.toLowerCase();
    show = Object.values(data.anime).find(a =>
      String(a.title || '').toLowerCase() === t) || null;
  }
  show = show || {};

  const fill = u => String(u)
    .replaceAll('{id}', encodeURIComponent(id))
    .replaceAll('{ep}', encodeURIComponent(ep))
    .replaceAll('{title}', encodeURIComponent(title));

  const servers = [];
  const push = s => {
    if (!s?.url) return;
    const srv = { name: s.name || 'سيرفر', url: fill(s.url), type: s.type === 'embed' ? 'embed' : (s.type || 'm3u8') };
    if (!servers.some(x => x.url === srv.url)) servers.push(srv);
  };

  // 1) روابطك المخصصة: على مستوى العرض ← ثم الحلقة ← ثم البدل العام "*"
  (show.servers || []).forEach(push);
  const epData = show.episodes?.[ep] || show.episodes?.['*'] || {};
  (epData.servers || []).forEach(push);

  const hasDirect = servers.some(s => s.type !== 'embed');

  // 2) قوالب التضمين الاحتياطية (من الملف + القوالب العامة)
  const templates = [...(data.templates || []), ...(show.directOnly ? [] : FALLBACK_TEMPLATES)];
  templates.forEach(t => push({ name: t.name || 'سيرفر تضمين', url: t.url, type: 'embed' }));

  // 3) الترجمة بأولوية: الحلقة ← العرض ← العامة
  const subtitles = epData.subtitles || show.subtitles || data.subtitles || [];

  return res.status(200).json({
    id,
    ep: Number(ep) || ep,
    title,
    direct: hasDirect,
    servers,
    subtitles,
  });
}
