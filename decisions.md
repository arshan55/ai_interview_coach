ADR: RAG-for-feedback decisions

Decision log (high-level)

1) Decision: Use existing CodingProblemDetails.referenceSolution and rubric for coding questions when available; otherwise return similar past questions (title + topic + difficulty) as retrieval context for v1.

- Alternatives considered:
  - A: Require full modelAnswer/rubric content on every QuestionBank document and backfill from an external source (none available).
  - B: Create a new dedicated ReferenceDocuments collection and author reference materials before enabling RAG.
  - C: For v1, return similar past questions and use CodingProblemDetails when present.

- Rationale / Why chosen:
  - The repo already contains curated coding problem details (backend/models/CodingProblemDetails.js and backend/scripts/seedCodingProblemDetails.js) with referenceSolution and rubric fields. These are high-quality sources for coding question references and should be used rather than duplicating content.
  - Non-coding questions lack a reliable authoritative model answer source. Returning similar past questions provides meaningful, grounded context without fabricating model answers.
  - This approach lets RAG provide practical grounding immediately while keeping the system safe and conservative about generating "model answers" that might be incorrect.

- Implementation detail (detection & branching):
  - At retrieval time, interviews.js will deterministically check for a linked CodingProblemDetails document using the QuestionBank.questionId or normalizedTitle. If a matching CodingProblemDetails document is found, its referenceSolution and rubric are used directly as the retrieved context (no nearest-neighbor search required).
  - Only when no CodingProblemDetails match exists will interviews.js call embeddingsService.findNearest(...) to retrieve the top-K semantically similar past questions from the QuestionBank embedding cache.
  - This explicit caller-side branching is intentional: CodingProblemDetails lookups require precise document keys (questionId/normalizedTitle) and should take precedence over approximate similarity matches. The branching logic will be implemented in interviews.js and logged for observability.

2) Decision: Store embeddings on the existing QuestionBank collection as an embedding: [Number] field.

- Alternatives considered:
  - A: Create a new Embeddings collection (one document per embedding) separate from QuestionBank.
  - B: Store embeddings as files in object storage and store pointers in QuestionBank.
  - C: Add embedding: [Number] to QuestionBank documents.

- Rationale / Why chosen:
  - For a 14k-item corpus, collocating embeddings with question documents simplifies backfill, queries, and administration. It reduces joins and keeps question text and embedding in sync.
  - It reduces initial implementation complexity for a lightweight feature; switching to a separate collection is still possible later if embedding size or access patterns require it.

3) Decision: Use in-memory cosine similarity retrieval for v1 rather than a managed vector DB.

- Alternatives considered:
  - A: Launch a managed vector DB (Pinecone/Chroma/Weaviate) immediately.
  - B: Use MongoDB Atlas Vector Search (if available) or a local FAISS/Milvus instance.
  - C: Use in-memory cosine similarity over a cached embedding array.

- Rationale / Why chosen:
  - With ~14k embeddings and embeddings of moderate dimension, an in-memory scan is fast enough for occasional evaluation calls and avoids introducing a new operational dependency and cost.
  - This keeps the implementation simple and reversible: provide a clear interface in embeddingsService so switching to an external vector DB is straightforward when scaling or latency requirements change.

4) Decision: Scope retrieval to feedback generation only; do not modify questionRetrieval.js.

- Alternatives considered:
  - A: Use embeddings to replace or augment question selection as well.
  - B: Keep current heuristic selection unchanged and apply RAG only to prompt augmentation for evaluation.

- Rationale / Why chosen:
  - The existing question selection is a production-intended heuristic tuned to difficulty, topics, frequency, and acceptanceRate. Replacing it would introduce risk and require separate evaluation.
  - The user explicitly requested keeping questionRetrieval.js untouched. Augmenting only the evaluation prompt achieves the immediate goal of improving feedback grounding while minimizing surface area for regressions.

5) Decision: Expose a feature flag RAG_FEEDBACK_ENABLED and RAG_FEEDBACK_TOP_K.

- Alternatives considered:
  - A: Ship always-on RAG.
  - B: Gate RAG behind an env flag.

- Rationale / Why chosen:
  - A feature flag enables safe rollout, A/B testing, and quick rollback if costs or quality regressions appear. It is low overhead and provides operational control.

6) Decision: Logging of retrieved IDs and short previews.

- Rationale:
  - Debugging grounding quality requires visibility into what the retriever returned. Store logs (console/server logs) with retrieved IDs, similarity scores, and short previews so the team can audit and iterate on retrieval quality.

7) Decision: Backfill embeddings with rate-limited batch script and embed new questions on create/update via scripts/hooks.

- Rationale:
  - Avoid blocking user-facing request paths with embedding API calls; run a safe batch backfill and call embedding generation in import/seed scripts or admin flows.
  - Implementation detail: the backfill script will SKIP coding questions that already have a linked CodingProblemDetails entry by default (to avoid redundant embeddings for items where the authoritative reference will be used directly). A flag (--embed-coding or --force) will allow embedding those coding questions if desired. This is intentional and documented to make the tradeoff explicit.

Notes and future work

- Future v2: If high-quality model answers for non-coding questions become available, create a curated ReferenceDocuments collection and populate modelAnswer/rubricNotes to enrich retrieval results.
- Future v2: If retrieval latency or scale becomes problematic, switch embeddingsService to use a managed vector DB and implement an approximate nearest neighbor index.
- Update this file if any of the above decisions change during implementation.

Decision recorded by: Copilot CLI assistant (on behalf of the project)
Date: 2026-08-14