export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');

  const id = String(req.query.id || '').trim(); // رقم الأنمي من AniList
  const ep = String(req.query.ep || '').trim(); // رقم الحلقة

  if (!id || !ep) {
    return res.status(400).json({ error: 'مطلوب رقم الأنمي والحلقة' });
  }

  const servers = [];

  try {
    // الروبوت الذكي يروح يجيب الرابط المباشر للحلقة
    const r = await fetch(`https://api.amvstr.me/api/v2/stream/${id}/${ep}`);
    if (r.ok) {
      const data = await r.json();
      const directUrl = data?.stream?.multi?.main?.url || data?.stream?.multi?.backup?.url;
      
      if (directUrl) {
        servers.push({
          name: 'سيرفر البث المباشر ⚡',
          url: directUrl,
          type: 'm3u8'
        });
      }
    }
  } catch (e) {
    console.error('تعذر جلب الرابط المباشر');
  }

  // سيرفر احتياطي في حال تأخر السيرفر الأول
  servers.push({
    name: 'سيرفر التضمين الاحتياطي',
    url: `https://player.smashy.stream/anime?anilist=${id}&ep=${ep}`,
    type: 'embed'
  });

  return res.status(200).json({
    id, 
    ep, 
    servers, 
    subtitles: []
  });
}
