const NEWS_FEEDS = [
  { url: "https://news.google.com/rss",                                    topic: "Top Stories" },
  { url: "https://news.google.com/rss/headlines/section/topic/WORLD",      topic: "World" },
  { url: "https://news.google.com/rss/headlines/section/topic/BUSINESS",   topic: "Business" },
  { url: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY", topic: "Technology" },
  { url: "https://news.google.com/rss/headlines/section/topic/NATION",     topic: "Nation" },
];

const ITEMS_PER_FEED = 6;
const SNIPPET_MAX_CHARS = 120;

async function fetchFeed(feedUrl, topic) {
  const res = await fetch(feedUrl);
  if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
  const text = await res.text();
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const items = Array.from(doc.querySelectorAll("item")).slice(0, ITEMS_PER_FEED);
  return items.map(item => ({
    title:   item.querySelector("title")?.textContent?.trim() ?? "",
    snippet: (item.querySelector("description")?.textContent ?? "")
               .replace(/<[^>]+>/g, " ")
               .replace(/\s+/g, " ")
               .trim()
               .slice(0, SNIPPET_MAX_CHARS),
    link:    item.querySelector("link")?.textContent?.trim() ?? "",
    pubDate: item.querySelector("pubDate")?.textContent?.trim() ?? "",
    topic,
  })).filter(i => i.title);
}

async function fetchGoogleNewsItems() {
  const results = await Promise.allSettled(
    NEWS_FEEDS.map(({ url, topic }) => fetchFeed(url, topic))
  );
  const seen = new Set();
  const items = [];
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value) {
      if (!seen.has(item.link)) {
        seen.add(item.link);
        items.push(item);
      }
    }
  }
  return items;
}
