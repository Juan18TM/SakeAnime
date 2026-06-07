// ==JiruHubExtension==
// @name         AnimeFLV (JiruHub)
// @version      v0.1.0
// @author       JiruHub
// @lang         es
// @license      MIT
// @package      anime.flv
// @type         bangumi
// @webSite      https://jimov-api.vercel.app
// @description  Anime en español vía AnimeFLV (adapter copy)
// ==/JiruHubExtension==

export default class extends Extension {
  async load() {
    this.registerSetting({
      title: "Jimov API",
      key: "animeflv",
      type: "input",
      description: "Multimedia API",
      defaultValue: "https://jimov-api.vercel.app",
    });
  }

  async createFilter() { return {}; }

  async req(url) {
    return this.request(url, { headers: { "Miru-Url": await this.getSetting("animeflv") } });
  }

  async latest(page) {
    const res = await this.req(`/anime/animeflv/filter?page=${page}`);
    const results = Array.isArray(res) ? res : ((res && res.results) || []);
    return results.map((item) => ({ url: item.url, title: item.name, cover: item.image || "" }));
  }

  async search(kw, page) {
    const res = await this.req(`/anime/animeflv/filter?q=${encodeURIComponent(kw)}&page=${page}`);
    const results = Array.isArray(res) ? res : ((res && res.results) || []);
    return results.map((item) => ({ title: item.name, url: item.url, cover: item.image || "", desc: item.type || "" }));
  }

  async detail(url) {
    const res = await this.req(url);
    if (!res) return { title: "", cover: "", desc: "", episodes: [] };
    const cover = res.image ? (res.image.url || res.image) : "";
    const episodes = (res.episodes || []).slice().reverse().map((ep) => ({ name: `Ep ${ep.number}`, url: ep.url }));
    return { title: res.name || "", cover, desc: res.synopsis || "", episodes: [{ title: "Episodios", urls: episodes }] };
  }

  async watch(url) {
    // Delegate to jimov-api response
    const servers = await this.req(url);
    const list = Array.isArray(servers) ? servers : [];
    if (list.length === 0) return { type: "hls", url: "error://no-servers-found" };

    const embedUrls = {};
    const referers = {};
    for (const s of list) {
      if (s && s.name && s.url) {
        embedUrls[s.name] = s.url;
        referers[s.name] = this._refererFor(s.url);
      }
    }

    return { type: "hls", url: "error://no-playable-server", headers: { "X-Servers": JSON.stringify(embedUrls), "X-Server-Referers": JSON.stringify(referers) } };
  }

  _refererFor(url) {
    if (!url) return "";
    if (url.includes("yourupload.com")) return "https://www.yourupload.com/";
    if (url.includes("hqq.tv") || url.includes("netu")) return "https://hqq.tv/";
    if (url.includes("ok.ru")) return "https://ok.ru/";
    if (url.includes("streamsb") || url.includes("sbfull") || url.includes("sbplay")) return "https://streamsb.com/";
    if (url.includes("fembed") || url.includes("anime789")) return "https://www.fembed.com/";
    if (url.includes("mp4upload")) return "https://www.mp4upload.com/";
    if (url.includes("streamtape")) return "https://streamtape.com/";
    return "https://tioanime.com/";
  }
}
