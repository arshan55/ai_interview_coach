RAG-for-feedback architecture

Overview

This document describes the lightweight Retrieval-Augmented Generation (RAG) layer being added to the AI Interview Coach to improve the quality and grounding of Gemini-generated feedback. The RAG layer is scoped to feedback generation only — it does not change or replace the existing question selection heuristic in backend/services/questionRetrieval.js.

What gets embedded

- Primary: Question text (QuestionBank.questionText) and normalized title where available.
- Secondary (when available): curated coding problem reference content found in CodingProblemDetails.referenceSolution and CodingProblemDetails.rubric.

Where embeddings are stored

- Lightweight approach: an embedding field is added to the existing QuestionBank documents as embedding: [Number]. This keeps question text and embeddings colocated and simplifies retrieval for the initial 14k-item corpus.
- For coding problems, richer reference data remains in CodingProblemDetails; we do not duplicate large referenceSolution text into every QuestionBank row unless required.

Embedding generation

- The backend will use @google/generative-ai embedding model (text-embedding-004 or the provider's recommended embedding model) to generate embeddings for question text.
- A backfill script (backend/scripts/backfillEmbeddings.js) will iterate questions in batches and populate QuestionBank.embedding.
- New/updated questions will be embedded by calling the same embedding function from import/seed scripts or any admin create/update route (non-blocking where possible).

Retrieval strategy

- In-memory cosine similarity: On the first retrieval request (or after cache TTL), the backend loads a cached array of items for retrieval: { id, embedding, title, topic, difficulty, modelAnswerPreview?, rubricPreview? }.
- For each incoming evaluation request, compute the embedding for the target (question text — optionally include the user answer text in later iterations), compute cosine similarity against the cached embeddings, and return the top-K (K configurable, default 3).
- Cache behavior: the in-memory index is refreshed on startup and may be refreshed periodically (TTL, default 5 minutes) or manually (e.g., after backfill). The cache stores only id + embedding + short metadata to limit memory.

Why in-memory

- Corpus size ~14k documents; with embeddings of moderate dimension (e.g., 1536), an in-memory scan is inexpensive for occasional feedback evaluations and keeps the system dependency-free (no vector DB required). The implementation will be swappable for a managed vector DB later.

Where retrieval plugs into the request flow

1. Interview evaluation endpoint receives an answer to evaluate (text/audio/video).
2. Retrieval branching (explicit): when RAG_FEEDBACK_ENABLED === 'true', the caller (interviews.js) performs this branching logic before calling Gemini:
   a) Check for a linked CodingProblemDetails document for the current question (by questionId or normalizedTitle). If a CodingProblemDetails entry exists, use its referenceSolution and rubric as the primary retrieved context (no nearest-neighbor search required).
   b) If no CodingProblemDetails entry exists, then compute an embedding for the question text (and optionally the user's answer in future iterations), and call embeddingsService.findNearest(embedding, topK) to retrieve semantic nearest neighbors from QuestionBank.
   c) Build a small retrievedBlock string from the chosen references (CodingProblemDetails content when available; otherwise the top-K similar past questions including Title/Topic/Difficulty and similarity score).
   d) Inject retrievedBlock at the top of the evaluation prompt template prior to the question/answer content.
3. If the embedding model/API is not available or retrieval returns no results, proceed with existing prompt unchanged.

Implementation note: the branching is implemented in interviews.js (caller) rather than inside embeddingsService.findNearest so that CodingProblemDetails lookup — which requires access to questionId/normalizedTitle — is performed deterministically and does not depend on similarity thresholds.

Prompt injection (example)

Original template (excerpt):

You are an expert interviewer. Please evaluate this answer and provide feedback and a score out of 10. Focus on clarity, technical accuracy, and communication.

Question: ${question.questionText}
Answer: ${answerText}

Please provide: ...

New template with retrieved context injected (exact strings used in code):

Reference materials (retrieved by semantic similarity):
${retrievedBlock}

You are an expert interviewer. Please evaluate this answer and provide feedback and a score out of 10. Focus on clarity, technical accuracy, and communication.

Question: ${question.questionText}
Answer: ${answerText}

Please provide: ...

Retrieval output formatting

- For coding questions with a matching CodingProblemDetails entry:
  - include Reference Solution (short preview) and key rubric bullets.
- For non-coding or when no rich reference exists:
  - include similar past question entries (Title, Topic, Difficulty, optional link) and their similarity score.

Feature flags and env

- RAG_FEEDBACK_ENABLED (default: false)
- RAG_FEEDBACK_TOP_K (default: 3)
- RAG_EMBEDDING_TTL_MS (cache TTL, default: 300000 ms)

Logging

- Each evaluation that uses RAG will log retrieved IDs and similarity scores and short previews of the retrieved references for debugging and quality analysis.

Swappability

- The embeddingsService will expose a clear interface so the in-memory retrieval can later be replaced by a vector DB (Pinecone, Chroma, Atlas Vector Search, etc.) with minimal changes to interviews.js.

Security & privacy

- No user PII is embedded or stored in the vector index.
- Retrieved context is read-only and only included in prompts; it is not written back to user documents.

Notes

- This is a conservative, low-risk augmentation to the existing pipeline focused on improving grounding of Gemini responses without altering question selection logic.