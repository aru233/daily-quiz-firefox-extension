const DEFAULT_MODEL = "gemini-3-flash-preview";

function buildQuizPrompt(items) {
  const itemsJson = JSON.stringify(
    items.map(({ title, snippet, topic, link }) => ({ title, snippet, topic, link })),
    null, 2
  );
  return `You are a current-affairs quiz writer. Given the following news items, write EXACTLY 10 multiple-choice questions that help a reader stay meaningfully informed about the world.

QUESTION QUALITY RULES:
- Prioritise HIGH-SIGNIFICANCE events: policy decisions, elections, conflicts, diplomatic moves, major economic shifts, climate events, scientific breakthroughs. SKIP routine product launches, minor earnings reports, store openings, or celebrity news.
- Frame questions around causes, consequences, or implications — not raw facts. Prefer "Why did X do Y?" or "What was the outcome of Z?" over "In which country did X happen?" or "Who launched product Y?"
- Options must be named concepts, actors, policies, or outcomes — NOT bare numbers or percentages. If the answer is naturally a number, wrap it in context (e.g. "A 12% drop in oil prices" not just "12%"). NEVER write a question where all four options are numbers or percentages.
- All four options must be plausible to someone who follows the news — no obviously absurd distractors.
- Each question should leave the reader thinking "I should know this."

FORMAT RULES:
- Keep each question under 160 characters, each option under 80 characters.
- Only ask about facts clearly stated in or directly implied by the provided snippets.
- Mix topics: aim for no more than 2 questions from the same topic area.
- Explanations must be ONE short sentence (max 120 chars).
- Return ONLY a JSON object matching this exact schema — no markdown, no extra prose:
{
  "questions": [
    {
      "q": "<question text, max 140 chars>",
      "options": ["<A, max 60 chars>", "<B>", "<C>", "<D>"],
      "correctIndex": 0,
      "explanation": "<one sentence, max 120 chars>",
      "sourceTitle": "<news item title, max 80 chars>",
      "sourceUrl": "<link>"
    }
  ]
}

News items:
${itemsJson}`;
}

function validateQuiz(parsed) {
  if (!parsed || !Array.isArray(parsed.questions)) return false;
  if (parsed.questions.length < 5) return false;
  return parsed.questions.every(q =>
    typeof q.q === "string" &&
    Array.isArray(q.options) && q.options.length === 4 &&
    q.options.every(o => typeof o === "string") &&
    Number.isInteger(q.correctIndex) &&
    q.correctIndex >= 0 && q.correctIndex <= 3 &&
    typeof q.explanation === "string"
  );
}

async function generateQuiz(apiKey, items, model = DEFAULT_MODEL) {
  const prompt = buildQuizPrompt(items);
  const raw = await generateContent(apiKey, prompt, model, {
    temperature: 0.7,
    maxOutputTokens: 8192,
    generationConfig: { response_mime_type: "application/json" },
  });

  // Strip markdown code fences if Gemini wraps response in ```json ... ```
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Gemini returned non-JSON: ${raw.slice(0, 200)}`);
  }

  if (!validateQuiz(parsed)) {
    throw new Error(`Quiz JSON failed validation: ${JSON.stringify(parsed).slice(0, 200)}`);
  }

  return parsed.questions.slice(0, 10).map(q => {
    // Shuffle options, keeping correctIndex in sync
    const indices = [0, 1, 2, 3];
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return {
      ...q,
      options: indices.map(i => q.options[i]),
      correctIndex: indices.indexOf(q.correctIndex),
    };
  });
}
