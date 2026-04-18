const CACHE_TTL_MINUTES = 60;
const ALARM_NAME = "quiz-refresh";

browser.alarms.create(ALARM_NAME, { periodInMinutes: CACHE_TTL_MINUTES });

browser.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_NAME) {
    refreshQuiz().catch(() => {});
  }
});

browser.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "REFRESH_QUIZ") {
    refreshQuiz()
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});

async function refreshQuiz() {
  const { apiKey, model } = await browser.storage.local.get(["apiKey", "model"]);
  if (!apiKey) throw new Error("No API key configured. Open the extension popup to set one.");

  const items = await fetchGoogleNewsItems();
  if (items.length < 5) throw new Error("Too few news items fetched from Google News.");

  const questions = await generateQuiz(apiKey, items, model || "gemini-3-flash-preview");

  await browser.storage.local.set({
    quiz: questions,
    generatedAt: Date.now(),
  });
}
