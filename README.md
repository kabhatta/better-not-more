# Better, Not More

A learning workspace aligned with **Better, Not More, proposal v0.4**. Six criterion-specific roles question research drafts; the researcher writes every revision. The literature reference for the criteria appears once in the site's How it works page.

[Open the live demonstration](https://better-not-more-research-lab.kabhatta.chatgpt.site) · [Public source repository](https://github.com/kabhatta/better-not-more)

The deployed application corresponds to commit `c295c041724de11e677ce68acaca5f972e9bde8e`. Later documentation commits may update this README without changing the deployed application.

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

Open `http://127.0.0.1:4173`. Without `OLLAMA_MODEL`, the server runs the prepared demonstration. The hosted static site supports the demonstration and browser-local document imports, but not model inference.

## Demonstration walkthrough

1. Read the highlighted literature claim and its question. The sample and its sources are fictional.
2. Request a hint, then an explicit account of what is missing. Inspect the attached source. No replacement wording is supplied.
3. Record your reasoning and confidence. Write your own revision, or justify keeping the passage.
4. Review the criterion-specific closure check and confirm your decision. The next waiting question becomes available. The default is three open questions, adjustable to one or two.
5. Dispute a mistaken question if appropriate. The question, evidence, and disagreement remain in the Research log.
6. Open Explain your changes. Select an actual revised passage and explain the change, its evidence, and remaining limitations. Submit the explanation to reveal an illustrative human-rating form.
7. Export the session JSON and revised manuscript. Export includes the original manuscript, questions, evidence, responses, revisions, author explanations, and any human ratings.

New manuscript supports DOCX, text PDFs, TXT, and Markdown. Extraction runs in the browser. Review extracted text before starting. Scanned PDFs require OCR elsewhere. References are added separately. Uploaded drafts receive generic reading prompts attached to paragraphs by section order; there is no semantic routing or automatic diagnosis in this mode. These prompts explicitly say that an omission has not been established.

## Consistency with the revised proposal

| Proposal change | MVP implementation |
| --- | --- |
| Draft quality and authorship are the main outcomes; lasting skill is future work. | Revised explanation of the research question and three-condition evaluation. The prior delayed-practice feature is replaced with explanations of actual changes. |
| Five rules replace the earlier design. | No manuscript generation; passage-linked challenges; question → hint → explicit gap; a criterion check before closure; a limit on open questions. |
| An agent closes an issue when the revision meets the criterion. | The criterion check is explicit, but the researcher confirms it. Automated assessment of revisions remains unimplemented and is not claimed. |
| Authors explain a sample of their changed passages. | A researcher can select any revised passage, submit an explanation, and enter a demonstration human rating. Independent sampling and rater access remain future work. |
| Logs capture acceptance, rejection, justification, and engagement. | Decisions, explanations, support use, and timestamps are exportable. Active engagement duration is not measured; elapsed timestamps must not be treated as reading time. |
| Public repository, German hosting, model/provider, pilot, and ethics details. | The source is publicly available at [kabhatta/better-not-more](https://github.com/kabhatta/better-not-more). German data residency, a selected/evaluated model, a completed pilot, and ethics approval have not been verified and require confirmation before submission. |

Earlier browser sessions are upgraded without replacing drafts, responses, or event history. Old practice and fading records are preserved under `legacy` in the export. The old fading rule no longer suppresses active questions.

## Local model integration

Start Ollama and install a local model that supports structured output. Set `OLLAMA_MODEL` to its exact name, start the gateway, and use Session settings → Optional technical setup → Check connection → Generate grounded questions before entering your first reasoning response. Model selection can change without changing the learning workflow. The adapter uses the Ollama chat API and structured outputs.

`OLLAMA_URL` defaults to `http://127.0.0.1:11434`; only loopback HTTP endpoints are accepted. The gateway rejects cloud/remote model names and remote model metadata, cross-origin requests, invalid manuscript structures, unsupported source references, and nonmatching quotes. It does not call cloud AI services or store request bodies. Confidential third-party review reports are excluded by the import acknowledgement.

The six roles are criterion specifications in one structured model call, not six concurrently running processes. At most one challenge per criterion is accepted; the model must return 1–6 challenges. A zero-challenge abstention is not yet supported. Model output contains `question`, `hint`, and `missing`: the first two are questions, and the last identifies an omission or inconsistency without supplying a remedy. Subsequent exchanges use this prepared support ladder; there is no adaptive model conversation or automated revision grading.

## Boundaries and evaluation

- All sample passages, interviews, and cited sources are fictional. The user's proposal and paper are not bundled into the site.
- Manuscript revisions come only from researcher-entered text. Evidence quotes are checked against the supplied text.
- Question-form, feedback-format, and exact-quote checks are structural safeguards. They do not establish substantive accuracy or guarantee that generated feedback never supplies a remedy. Human and adversarial evaluation remain necessary.
- Closure is researcher-confirmed, not a quality score. Disputes preserve evidence for later assessment.
- Authorship explanations are locked after submission. Ratings use an illustrative 0/1/2 rubric, are visible in the same interface, and are neither independent nor blinded. No validated authorship or learning score is claimed.
- The proposed checklist, learning-team, and generative-assistant comparison, two independent draft-quality raters, active engagement measurement, pilot, and human-participant approvals remain future work.
- One session persists in browser localStorage. This is local to the browser profile, not encrypted, synchronized, or a multiuser database. Export before replacing a session. Shared browser profiles can access stored drafts.
- The application has no analytics or training pipeline. Local inference remains subject to the installed model server's configuration.
- Hosting access and manuscript storage are separate: the page's audience is controlled by the existing Sites policy, while imported manuscript text stays in the browser unless the researcher explicitly runs the separate local gateway.

## Checks and test materials

```sh
npm test
npm run build
```

`src/data.mjs` contains six fictional cases with deliberately placed issues, exact evidence quotes, and expected diagnoses. They are available from How it works; no model-performance result is implied. Tests cover evidence grounding, source matching, queue limits, escalation, explicit closure confirmation, researcher authorship, explanation submission and ratings, preservation of earlier sessions, and invalid model outputs. The gateway test uses a simulated model endpoint, not a live model.

## Structure

- `src/data.mjs`: criteria, closure checks, fictional manuscript, and test cases
- `src/engine.mjs`: state transitions, session upgrade, authorship records, and model-output validation
- `src/main.jsx`: research workspace and proposal explanation
- `server.mjs`: loopback-only local inference gateway and static server
- `tests/`: behavioral guardrails and gateway tests
