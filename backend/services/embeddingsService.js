const QuestionBank = require('../models/QuestionBank');
const CodingProblemDetails = require('../models/CodingProblemDetails');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const DEFAULT_EMBEDDING_MODEL = process.env.GOOGLE_EMBEDDING_MODEL || 'text-embedding-004';
const CACHE_TTL_MS = parseInt(process.env.RAG_EMBEDDING_TTL_MS || '300000', 10); // 5 minutes

let embeddingsCache = null;
let cacheLoadedAt = 0;

function getEmbeddingClient() {
  if (!process.env.GOOGLE_AI_API_KEY) return null;
  return new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
}

async function generateEmbedding(text) {
  const client = getEmbeddingClient();
  if (!client) throw new Error('GOOGLE_AI_API_KEY not configured for embeddings');

  // Attempt to call the embedding model. The SDK surface may vary; adapt as needed.
  try {
    const model = DEFAULT_EMBEDDING_MODEL;
    const res = await client.getEmbedding({ model, input: String(text || '') });
    // Expect res.embedding (array) or res.data[0].embedding depending on SDK
    if (res?.embedding) return res.embedding;
    if (res?.data && Array.isArray(res.data) && res.data[0]?.embedding) return res.data[0].embedding;

    throw new Error('Unexpected embedding response shape');
  } catch (err) {
    console.error('generateEmbedding error:', err.message || err);
    throw err;
  }
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return -1;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const va = a[i] || 0;
    const vb = b[i] || 0;
    dot += va * vb;
    na += va * va;
    nb += vb * vb;
  }
  if (na === 0 || nb === 0) return -1;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function loadEmbeddingsCache(force = false) {
  if (!force && embeddingsCache && Date.now() - cacheLoadedAt < CACHE_TTL_MS) {
    return embeddingsCache;
  }

  console.log('Loading embeddings cache from DB...');
  // Load only docs with embeddings set
  const docs = await QuestionBank.find({ embedding: { $ne: null } }).select('questionId embedding title topic difficulty normalizedTitle modelAnswer rubricNotes isCodingProblem').lean();
  embeddingsCache = docs.map((d) => ({
    id: String(d.questionId),
    embedding: Array.isArray(d.embedding) ? d.embedding : null,
    title: d.title,
    topic: d.topic,
    difficulty: d.difficulty,
    normalizedTitle: d.normalizedTitle,
    modelAnswer: d.modelAnswer || null,
    rubricNotes: d.rubricNotes || [],
    isCodingProblem: !!d.isCodingProblem,
  })).filter((d) => Array.isArray(d.embedding));

  cacheLoadedAt = Date.now();
  console.log(`Embeddings cache loaded: ${embeddingsCache.length} items`);
  return embeddingsCache;
}

async function findNearest(embedding, topK = 3) {
  if (!Array.isArray(embedding)) return [];
  await loadEmbeddingsCache();
  if (!embeddingsCache || embeddingsCache.length === 0) return [];

  const scores = embeddingsCache.map((item) => ({
    id: item.id,
    score: cosineSimilarity(embedding, item.embedding),
    title: item.title,
    topic: item.topic,
    difficulty: item.difficulty,
    normalizedTitle: item.normalizedTitle,
    modelAnswer: item.modelAnswer,
    rubricNotes: item.rubricNotes,
    isCodingProblem: item.isCodingProblem,
  }));

  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, topK).filter((s) => s.score > -0.000001);
}

async function generateAndSetEmbeddingForQuestion(questionId, text) {
  if (!text) text = '';
  try {
    const emb = await generateEmbedding(text);
    await QuestionBank.updateOne({ questionId }, { $set: { embedding: emb } });
    // Also warm the cache entry if loaded
    if (embeddingsCache) {
      const idx = embeddingsCache.findIndex((e) => e.id === String(questionId));
      if (idx !== -1) embeddingsCache[idx].embedding = emb;
      else {
        // Fetch minimal metadata and push
        const q = await QuestionBank.findOne({ questionId }).select('questionId title topic difficulty normalizedTitle modelAnswer rubricNotes isCodingProblem').lean();
        if (q) {
          embeddingsCache.push({
            id: String(q.questionId),
            embedding: emb,
            title: q.title,
            topic: q.topic,
            difficulty: q.difficulty,
            normalizedTitle: q.normalizedTitle,
            modelAnswer: q.modelAnswer || null,
            rubricNotes: q.rubricNotes || [],
            isCodingProblem: !!q.isCodingProblem,
          });
        }
      }
    }
    return emb;
  } catch (err) {
    console.error('generateAndSetEmbeddingForQuestion failed for', questionId, err.message || err);
    throw err;
  }
}

module.exports = {
  generateEmbedding,
  findNearest,
  loadEmbeddingsCache,
  generateAndSetEmbeddingForQuestion,
  cosineSimilarity,
};
