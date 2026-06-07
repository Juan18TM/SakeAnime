// Lightweight adapter for the local JiruHub TioAnime extension files
// We copy a minimal set of helpers so we can import some logic if needed
export function refererFor(url: string) {
  if (!url) return 'https://tioanime.com/';
  if (url.includes('yourupload.com')) return 'https://www.yourupload.com/';
  if (url.includes('hqq.tv') || url.includes('netu')) return 'https://hqq.tv/';
  if (url.includes('ok.ru')) return 'https://ok.ru/';
  if (url.includes('streamsb') || url.includes('sbfull') || url.includes('sbplay')) return 'https://streamsb.com/';
  if (url.includes('fembed') || url.includes('anime789')) return 'https://www.fembed.com/';
  if (url.includes('mp4upload')) return 'https://www.mp4upload.com/';
  if (url.includes('streamtape')) return 'https://streamtape.com/';
  return 'https://tioanime.com/';
}
