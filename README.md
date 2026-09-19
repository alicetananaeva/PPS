# Pet Parenting Style (PPS)

A research-based web questionnaire for dog guardians. The app presents 36 items, calculates authoritative, authoritarian, and permissive profile scores, and optionally stores consented responses for research.

The questionnaire is based on the 36-item Pet Parenting Style scale developed in research led by Lauren Brubaker under the supervision of Dr. Monique Udell. This implementation is maintained by Alisa Tananaeva.

## Live app

[Open PPS on Cloudflare](https://pps.dogperspective.com/)

Class link for Dr. Udell's students: [PPS class version](https://pps.dogperspective.com/?class=drudell). After viewing the result, students complete three required anonymous feedback ratings and receive a random participant code. Feedback is always stored with that code. When a student consents to research storage, the questionnaire scores receive the cohort label `drudell_fall_2026` and are linked to the same code. When a student declines, the score fields remain blank and no questionnaire response is stored.

The access-key-protected class dashboard at [verify.dogperspective.com](https://verify.dogperspective.com/) lists both surveys by participant code, shows consent status, scores and the three feedback ratings, and can download the table as CSV. It does not show names or narrative result interpretations.

## Current architecture

- **Interface:** accessible vanilla HTML, CSS, and JavaScript served by Cloudflare Workers Static Assets
- **API:** Cloudflare Worker (`src/worker.js`)
- **Research storage:** Cloudflare D1 (`pps_research`)
- **Scoring:** shared browser/server module (`public/scoring.js`), so the Worker independently validates and recalculates every submitted result
- **Consent:** results are shown whether the participant consents or declines; only consented responses are sent to the API

No always-on server is required, so this version does not depend on Streamlit uptime or a Supabase project remaining active.

## What the app does

- Presents 36 five-point Likert items (*Never* through *Always*)
- Computes three 12-item means: Permissive, Authoritative, and Authoritarian
- Classifies the closest profile using fixed centroids and bias-weighted Euclidean distance
- Reports z-scores and approximate percentiles relative to the 953-dog reference sample
- Shows model-based similarity to each centroid
- Offers an explicit, optional research-data consent choice before storage

## Data storage

The `pps_sessions` D1 table contains a random session ID, submission time, app version, the 36 answers, calculated scale means, profile classification, z-scores, percentiles, effective distances, and an optional cohort label. The app does not request names, email addresses, contact information, or human demographics. Class feedback is stored in `class_feedback`; participant codes are stored in `completion_codes`. In the Dr. Udell class version, the participant code links feedback to consented scores. It is not linked to a person's identity unless the participant independently chooses to share the code.

See [DATA_PRIVACY.md](DATA_PRIVACY.md) for details.

## Local development

Requires Node.js 20+.

```bash
pnpm install
pnpm run d1:migrate:local
pnpm run dev
```

Run the automated scoring checks with:

```bash
pnpm test
```

## Deployment

The D1 binding and deployed database ID are defined in `wrangler.toml`.

```bash
pnpm run d1:migrate:remote
pnpm run deploy
```

The earlier Streamlit implementation remains in `PPS_1.py` as a reference and rollback option; it is not used by the Cloudflare deployment.

## Scoring summary

1. Likert responses are coded 1–5.
2. Each subscale is the unweighted mean of its 12 items.
3. The profile vector is `[Permissive, Authoritative, Authoritarian]`.
4. Euclidean distances to the three fixed centroids are multiplied by the original style-specific beta weights.
5. The smallest effective distance determines the most probable style.
6. Percentiles use the embedded means and standard deviations from the 953-dog reference sample and a normal-CDF approximation.

## License

Shared for portfolio and research transparency. The questionnaire content and scoring logic are tied to academic work. Contact the repository maintainer before reusing items, centroids, or norms in derivative instruments or commercial products.
