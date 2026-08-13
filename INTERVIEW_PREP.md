ONE-MINUTE PITCH

I built an AI Interview Coach that simulates interviews, evaluates answers (text, audio, video, and code), and gives actionable feedback driven by Gemini. The frontend is a Next.js app that talks to an Express backend which stores questions, interviews, and user data in MongoDB. I added a lightweight RAG layer so Gemini’s evaluation is grounded in real reference material (CodingProblemDetails or semantically-similar past questions) without changing the question-selection heuristics.


SYSTEM OVERVIEW

Tech stack and why I chose each part

- Frontend: Next.js 14 (frontend/). I used Next.js for fast dev DX, built-in routing, and simple integration with the React components and Tailwind utilities the UI needs. The codebase organizes UI and static content in the usual Next app structure.
- Backend: Node.js + Express (backend/). Express gives a simple, explicit REST API surface (see [backend/routes/api/interviews.js](/Users/kp/Studies/Projects/AI_InterviewCoach/ai_interview_coach/backend/routes/api/interviews.js)). I kept routing explicit so AI calls and middleware are easy to control and instrument.
- Database: MongoDB with Mongoose (backend/models/). The app stores semi-structured interview documents and a 14k-question QuestionBank. MongoDB fits that flexible schema and simplifies storing arrays like embeddings directly on a document (see [backend/models/QuestionBank.js](/Users/kp/Studies/Projects/AI_InterviewCoach/ai_interview_coach/backend/models/QuestionBank.js)).
- AI: Gemini via @google/generative-ai (package in root package.json). Gemini is used for evaluation and embeddings. The code wraps Gemini calls in retry logic for rate limits in [backend/routes/api/interviews.js](/Users/kp/Studies/Projects/AI_InterviewCoach/ai_interview_coach/backend/routes/api/interviews.js).

Architecture diagram (compact ASCII)

Frontend (Next.js)
  |
  |  REST
  v
Backend (Express) ──> MongoDB (QuestionBank, Interviews, CodingProblemDetails)
  |                        ^
  |                        |
  +─> Gemini API (@google/generative-ai)  <─ EmbeddingsService (in-memory cache)
         ^
         |  (RAG prompt injection: interviews.js calls buildRetrievedBlock -> either CodingProblemDetails or embeddingsService.findNearest)

Key files to point to while explaining
- [architecture.md](/Users/kp/Studies/Projects/AI_InterviewCoach/ai_interview_coach/architecture.md)
- [decisions.md](/Users/kp/Studies/Projects/AI_InterviewCoach/ai_interview_coach/decisions.md)
- [backend/routes/api/interviews.js](/Users/kp/Studies/Projects/AI_InterviewCoach/ai_interview_coach/backend/routes/api/interviews.js)
- [backend/services/embeddingsService.js](/Users/kp/Studies/Projects/AI_InterviewCoach/ai_interview_coach/backend/services/embeddingsService.js)
- [backend/scripts/backfillEmbeddings.js](/Users/kp/Studies/Projects/AI_InterviewCoach/ai_interview_coach/backend/scripts/backfillEmbeddings.js)


KEY FEATURES, EXPLAINED

1) Interview flow (what it does and why)
- What: Orchestrates practice interviews and stores per-question answers, feedback, and scores.
- How: The frontend calls the Express endpoint in [backend/routes/api/interviews.js] which selects questions (via services/questionRetrieval.js), persists Interview documents, and routes candidate answers to evaluation helpers (evaluateTextAnswer, evaluateSpokenMediaAnswer, coding flow).
- Tricky bits: preserving multimodal answers (text vs audio/video vs code), sanitizing video blobs before returning them (VIDEO_ANSWER_PLACEHOLDER), and ensuring interview progress logic (adding next question, computing overall score) stays consistent.

2) Question scoring / retrieval engine (why it exists and how it works)
- What: The app uses a heuristic questionRetrieval service (difficulty, topic, frequency, acceptanceRate, seenKeys) to choose the next question.
- How: [backend/services/questionRetrieval.js] implements heuristics and returns a QuestionBank row; it intentionally does NOT use embeddings for selection.
- Tricky bits: Heuristics aim to avoid repeats and balance difficulty; these are fast and deterministic but not semantically personalized.

3) Audio / video speaking evaluation
- What: Evaluate spoken answers using Gemini and return concise feedback + score.
- How: Express routes convert audio/video to base64 inline data and build a multimodal prompt (see evaluateSpokenMediaAnswer in [backend/routes/api/interviews.js]). Gemini is called through a retry wrapper (retryGenerateContent) which handles 429/503 and exponential backoff.
- Tricky bits: prompt formatting for multimodal inputs, enforcing output format to parse scores reliably, handling large media size limits, and sanitization of video blobs for storage and response.

4) RAG-based feedback grounding (the feature added)
- What: Before Gemini evaluates an answer, retrieve small, relevant reference material so feedback is grounded.
- How: interviews.js has buildRetrievedBlock(question) which implements a CodingProblemDetails-first branch (checks [backend/models/CodingProblemDetails.js]) and only if that isn't present computes an embedding for the question text and calls embeddingsService.findNearest to return top-K similar QuestionBank items. The retrievedBlock is prepended to the Gemini prompt only if RAG_FEEDBACK_ENABLED is 'true'.
- Tricky bits: Ensuring the coding-first branch short-circuits the embedding call (saves API quota), building a readable retrievedBlock that fits prompt length limits, and logging retrieved IDs and similarity scores for debugging.

5) Coding problem evaluation
- What: For coding problems, prefer authoritative reference solutions and rubrics.
- How: interviews.js checks coding questions using the CodingProblemDetails lookup. If found, it injects referenceSolution and rubric into the prompt. The code parsing for code feedback extracts Feedback, Score, Code Feedback, Code Score via regex.
- Tricky bits: parsing free-form model outputs reliably, ensuring the code path short-circuits embeddings for coding problems, and keeping prompts within Gemini size limits.


DECISIONS & TRADE-OFFS

I'll list each significant decision, an alternative, and why I rejected it.

1) Heuristic question scoring (keep) vs semantic/vector-based selection (alternative)
- Decision: Keep heuristic selection in [backend/services/questionRetrieval.js].
- Alternative: Use semantic embeddings to personalize question choice.
- Why not chosen: Heuristics are cheap, deterministic, and fast. Selection has strict requirements around avoiding repeats, difficulty pacing, and acceptance rates—requirements easy to express with heuristics. Semantic selection would add embedding storage, a retrieval layer, and tuning work that wasn’t necessary for initial UX. I kept RAG limited to feedback grounding to get high ROI without changing test fairness or selection guarantees.

2) In-memory cosine similarity (keep) vs managed vector DB (Atlas Vector Search, Pinecone)
- Decision: Implement in-memory cosine similarity over a cached array in [backend/services/embeddingsService.js].
- Alternative: Use a vector database (Atlas, Pinecone, Chroma) from day one.
- Why not chosen: Corpus size is ~14k — small enough for O(N) nearest-neighbor with moderate embedding dims and intermittent evaluation calls. In-memory is simpler, cheaper, and easier to maintain in an initial version. A managed vector DB adds cost, infra, and deployment complexity. The code is intentionally swappable: embeddingsService.findNearest is an abstraction so swapping in a vector DB is straightforward when latency or scale requires it.
- Revisit point: If the corpus grows to 100k+ or latency becomes an issue under load, swap to a vector DB.

3) Embeddings on QuestionBank (add embedding field) vs separate collection
- Decision: Store embeddings directly on QuestionBank documents (field embedding: [Number]).
- Alternative: Create a separate ReferenceDocuments or Embeddings collection.
- Why not chosen: Co-locating reduces joins and keeps question metadata and embeddings together. For this corpus size and the project's stage, simplicity and fewer collections win. If embeddings grow large or multiple reference documents per question are needed, I would move to a dedicated collection.

4) RAG scoped to feedback grounding only, not question retrieval
- Decision: Limit RAG to improving Gemini’s evaluation prompt.
- Alternative: Use RAG for question selection or other features.
- Why: Grounding feedback yields immediate quality improvements with minimal risk to interview fairness. Selection changes risk altering difficulty pacing or inadvertently repeating content. The code explicitly leaves questionRetrieval.js untouched.

5) CodingProblemDetails-first branching
- Decision: Check for a linked CodingProblemDetails doc before computing embeddings.
- Alternative: Always compute embeddings and then optionally include CodingProblemDetails.
- Why: Short-circuiting saves API quota and provides authoritative reference solutions when available. The code implements this explicitly in [backend/routes/api/interviews.js] buildRetrievedBlock and logs when CodingProblemDetails is used.

6) modelAnswer/rubricNotes optional vs fabricating answers
- Decision: Keep modelAnswer/rubricNotes as optional fallbacks on QuestionBank, but primarily use CodingProblemDetails.referenceSolution and rubric when present. For non-coding questions fall back to similar past questions (title/topic/difficulty).
- Alternative: Fabricate or auto-generate model answers for all questions.
- Why: There is no reliable source for authoritative model answers for non-coding questions. Fabricated model answers risk misleading feedback. The safe path uses existing curated coding references and similar past questions for grounding.

7) Feature flag for RAG (RAG_FEEDBACK_ENABLED)
- Decision: Gate RAG behind RAG_FEEDBACK_ENABLED.
- Alternative: Ship it always-on.
- Why: Feature flag allows incremental rollout, live A/B testing, and quick rollback if grounding decreases perceived quality or increases costs. It also ensures backwards compatibility.

8) Error handling / rate-limiting strategy
- Decision: Wrap Gemini calls in retryGenerateContent with logic for 429/503 and exponential backoff in [backend/routes/api/interviews.js].
- Alternative: Fail fast and surface an error to users.
- Why: Retry yields better UX for intermittent API rate limits. The code still surfaces errors and has a dev fallback interview for non-production when the AI quota is exhausted.

9) Backfill batching and skip behavior
- Decision: Backfill script [backend/scripts/backfillEmbeddings.js] skips coding questions that already have CodingProblemDetails by default, with flags (--embed-coding, --force) to override.
- Alternative: Backfill everything unconditionally.
- Why: Avoid unnecessary embedding API calls and quota usage for coding questions where an authoritative reference already exists. This is a conscious tradeoff recorded in [decisions.md].

10) Logging vs persistent audit storage for retrievals
- Decision: Log retrieved IDs and previews to server logs for debugging.
- Alternative: Persist retrieval traces to a dedicated analytics table.
- Why: Logs are fast to implement and good enough for early iteration. If we want longitudinal analysis or ML-driven tuning, we’d add a persisted audit table and instrumentation.


WHAT I'D DO DIFFERENTLY / KNOWN LIMITATIONS

- Unverified embedding API response shape. I built generateEmbedding with reasonable parsing but the exact SDK response shape is unconfirmed until a live test runs. I haven't run the single embedding API test with your GOOGLE_AI_API_KEY yet.
- No live RAG A/B testing yet. RAG is implemented and gated, but we haven’t measured whether RAG-grounded feedback is actually better in controlled tests.
- Prompt size and truncation not tuned. Injecting retrieved blocks can increase prompt size; I added truncation (safety slices) but haven’t instrumented input-length failures with Gemini.
- Heuristics are not personalized. The question selection is rule-based and doesn't adapt to user performance beyond seenKeys; personalization would need a different approach.
- No vector DB infra. The in-memory retriever is fine for 14k items, but it is O(N) and would need a swap to ANN / vector DB at larger scale.
- Parsing model output is brittle. I use regexes to extract scores and feedback; adversarial or malformed model responses can break parsing.
- Limited monitoring and analytics. Retrieval quality and feedback effectiveness are not captured beyond server logs.

Next iteration I would prioritize: (1) run embedding-response verification and a small live backfill, (2) add persisted retrieval traces and an A/B experiment for RAG, (3) migrate to a vector DB if latency or corpus size makes it necessary, (4) improve parsing robustness with stricter output schemas (or structured JSON outputs from the model if available).


LIKELY INTERVIEW QUESTIONS + HOW I'D ANSWER THEM

1) Why not use a vector DB like Pinecone from day one?
- Answer: I chose in-memory cosine similarity for initial simplicity and cost control. The corpus is ~14k which is acceptable for an O(N) nearest neighbor pass with cached embeddings. The code abstracts findNearest so swapping to Pinecone or Atlas Vector Search is straightforward when we need lower latency or larger scale.

2) How would you scale this to 10x the question corpus?
- Answer: First, measure latency under load. If embeddingsService.findNearest becomes a bottleneck, replace in-memory search with a managed ANN service (Pinecone/Chroma or MongoDB Atlas Vector Search) and keep the same embeddingsService interface. Also add sharding or caching at the application layer and consider precomputing clusters for approximate nearest neighbors.

3) How do you ensure RAG-grounded feedback is actually better?
- Answer: I’d run an A/B test with RAG_FEEDBACK_ENABLED toggled for a randomized user sample. Metrics: user ratings of feedback usefulness, follow-up acceptance rate, and human rater agreement. The code already logs retrieved IDs and similarity scores so we can sample cases for human annotation.

4) What happens if Gemini is down or rate-limited?
- Answer: retryGenerateContent wraps Gemini calls and retries on 429/503 with exponential backoff. For dev, there’s a built-in fallback interview. For production, we surface a 429/503 to the client and log the event so we can investigate.

5) How does a user answer flow end-to-end?
- Answer: The frontend POSTs the answer to /api/interviews/:id/answer. The backend updates the Interview doc, constructs a retrievedBlock (CodingProblemDetails-first, else embedding nearest neighbors if RAG enabled), prepends it to the evaluation prompt, calls Gemini (retry logic), parses the model output, writes feedback and scores back to the Interview doc, and returns the sanitized interview state to the frontend.

6) Why store embeddings on QuestionBank instead of a separate collection?
- Answer: Co-locating simplifies reads and keeps question metadata and embeddings together, which is convenient for an initial corpus size. If we needed multiple embeddings per doc or wanted to version embeddings, I’d move them to a dedicated collection.

7) How did you avoid modifying question selection logic with RAG?
- Answer: I intentionally left [backend/services/questionRetrieval.js] untouched. RAG is applied only inside interviews.js to augment Gemini prompts. This isolates selection fairness and pacing from experimental grounding.

8) How do you prevent prompt-size explosions when injecting retrieved content?
- Answer: The code truncates long referenceSolution and rubrics and limits top-K (RAG_FEEDBACK_TOP_K, default 3). If we hit size limits, I’d add token-aware truncation and relevance-based pruning.

9) How do you handle coding problems differently from non-coding?
- Answer: For coding problems we first check [backend/models/CodingProblemDetails.js] for referenceSolution and rubric and use that as the retrievedBlock. This short-circuits embedding calls and gives authoritative guidance for code feedback.

10) What retry/backoff strategy do you use for Gemini calls?
- Answer: retryGenerateContent checks for 429/503 and retries up to 5 times with exponential backoff and a small added jitter. If retries fail, the error bubbles up and is surfaced to the client.

11) Why not create modelAnswer/rubricNotes for all questions now?
- Answer: There’s no authoritative source for non-coding model answers in the repo. Creating them would mean authoring content at scale or auto-generating answers which risks introducing incorrect model answers. For v1 I used existing CodingProblemDetails and similar past questions.

12) How are embeddings generated for new questions?
- Answer: The import script [backend/scripts/importCompanyWiseQuestions.js] can optionally call embeddingsService.generateAndSetEmbeddingForQuestion when inserting new questions. The backfill script handles existing content in batches.

13) How do you test the embedding API integration safely?
- Answer: I built a --dry-run mode and a --limit flag for backfill. I added a plan to run a single API call to inspect the exact SDK response shape before full backfill to avoid hardcoding incorrect parsing logic.

14) How would you improve parsing model output robustness?
- Answer: Use structured model outputs (ask Gemini to return JSON where supported) or implement a lightweight schema validation step. Another way is to add a small deterministic post-processor that re-queries the model for missing fields rather than relying on brittle regexes.

15) How do you monitor retrieval quality in production?
- Answer: I log retrieval ids, similarity scores, and short previews. For production, I’d persist retrieval traces and build a small dashboard to sample and rate retrievals and their resulting feedback.


FINAL NOTES

- Files to reference in the interview while walking through code: [architecture.md](/Users/kp/Studies/Projects/AI_InterviewCoach/ai_interview_coach/architecture.md), [decisions.md](/Users/kp/Studies/Projects/AI_InterviewCoach/ai_interview_coach/decisions.md), [backend/routes/api/interviews.js](/Users/kp/Studies/Projects/AI_InterviewCoach/ai_interview_coach/backend/routes/api/interviews.js), [backend/services/embeddingsService.js](/Users/kp/Studies/Projects/AI_InterviewCoach/ai_interview_coach/backend/services/embeddingsService.js), and [backend/scripts/backfillEmbeddings.js](/Users/kp/Studies/Projects/AI_InterviewCoach/ai_interview_coach/backend/scripts/backfillEmbeddings.js).


Good luck on the interview—tell me which follow-up you'd like and I’ll run it.