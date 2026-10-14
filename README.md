# Better, Not More

A working MVP of the supplied **Socratic Agent Team proposal v0.3**, operationalizing the six criteria in Lindebaum (2026), Table 1 (pp. 4–6).

## Run

Requires Node 22+.

```sh
npm install
npm run dev
```

For a production build and optional local inference:

```sh
npm run build
OLLAMA_MODEL=your-installed-local-model npm run local
```

Open `http://127.0.0.1:4173`. Without `OLLAMA_MODEL`, the same server runs the complete curated demonstration. The hosted static site supports the demonstration and browser-local document imports, but not model inference.

## Demonstration walkthrough

1. Read the highlighted literature claim and the tutor’s question.
2. Request a hint, then locate the passage. Open References to inspect the fictional source.
3. Enter your own reasoning and confidence. Write your own revision, or justify keeping the passage.
4. Record the decision. The orchestrator brings the next queued criterion into the three-challenge window.
5. Visit Research log for evidence, responses, revisions, confidence, and support use. Dispute a false challenge from its tutor panel.
6. After completing a challenge, independently identify another passage with the same issue. Record it from the log to fade prompts for that issue class. This is explicitly self-reported, not verified mastery.
7. Complete six new excerpts in Independent practice without tutor support. The rubric only appears after all six responses are submitted. Human ratings are entered explicitly; no invented learning scores are displayed.
8. Export the session JSON and the revised manuscript. Settings can restart the sample after an explicit replacement step.

New manuscript supports DOCX, text PDFs, TXT, and Markdown. Extraction runs in the browser. Review extracted text before starting. Scanned PDFs require OCR elsewhere. References are added separately. Uploaded drafts receive generic, evidence-attached reading prompts until local inference is enabled; this mode does not pretend to diagnose issues.

## Local model integration

Start Ollama and install a local model that supports structured output. Set `OLLAMA_MODEL` to its exact name, start the gateway, and use Session settings → Check connection → Generate grounded questions before entering your first reasoning response. A model name can be changed without changing tutoring logic. The adapter uses the [Ollama chat API](https://docs.ollama.com/api/chat) and [structured outputs](https://docs.ollama.com/capabilities/structured-outputs).

`OLLAMA_URL` defaults to `http://127.0.0.1:11434`; only loopback HTTP endpoints are accepted. The gateway rejects cloud/remote model names and remote model metadata, cross-origin requests, invalid manuscript structures, unsupported source references, and nonmatching quotes. It does not call cloud AI services or store request bodies. Confidential third-party review reports are excluded by the import acknowledgement.

The six roles are criterion specifications routed through one structured local model call, not six concurrently running processes. The orchestrator admits at most one challenge per criterion and caps visible open work at 1–3. The model produces questions and a two-step help ladder at analysis time; subsequent reasoning and revision are researcher-driven, with no automated grading or conversational answer generation.

## Boundaries and evaluation

- All sample manuscript passages, interviews, and cited sources are fictional and clearly labeled. The supplied proposal and paper are not uploaded or bundled into the site.
- The app writes manuscript revisions only from researcher-entered text. Quoted evidence is preserved separately from generated prompts.
- Question-form and exact-quote checks are deterministic structural safeguards. They cannot prove that a model’s question is substantively sound or does not leak an answer. This needs human validation and adversarial evaluation.
- “Resolved” means a researcher recorded a decision, not that the draft is correct. Disputes and false-challenge evidence are exportable.
- Fading is based on a self-reported second instance and exact-passage validation. It is not a validated mastery detector. Restore support in settings.
- Practice is immediate. The proposed 3–4-week delayed transfer study, three experimental conditions, blinded raters, longitudinal participant management, and ethics approval remain future work.
- The displayed calibration gap is illustrative: absolute distance between confidence and human 0/1/2 ratings rescaled to 0/50/100. It is not a validated learning measure.
- This MVP persists one session in browser localStorage. It is local to the browser profile, not encrypted, synchronized, or a multiuser database. Export before replacing a session. Shared browser profiles can access stored drafts.
- The application itself has no analytics or training pipeline. Local inference remains subject to the behavior and configuration of the installed model server.
- The hosted page can be used privately; all draft text is processed in the browser unless the researcher explicitly runs the separate local model gateway.

## Checks and benchmark

```sh
npm test
npm run build
```

`src/data.mjs` contains six seeded benchmark cases with exact quotes and known issues, plus six separate transfer excerpts. Download the benchmark from How it works. Tests verify evidence grounding, source matching, queue caps, escalation limits, researcher authorship, audit records, fading requirements, and rejection of invalid model outputs. No model accuracy or educational effectiveness is claimed.

## Structure

- `src/data.mjs`: standards, fictional manuscript, benchmark, independent assessment
- `src/engine.mjs`: pure tutoring state transitions and model-output validation
- `src/main.jsx`: accessible, responsive research workspace
- `server.mjs`: loopback-only local inference gateway and static server
- `tests/engine.test.mjs`: behavioral guardrail tests

The original criterion source is [Lindebaum (2026)](https://doi.org/10.5465/amle.2026.0628). The proposal, not Lindebaum’s editorial, supplies the AI tutoring architecture. The editorial does not endorse this system.
