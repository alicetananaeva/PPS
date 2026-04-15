# Pet Parenting Style (PPS) — Streamlit prototype

A research-based web prototype for administering the Pet Parenting Style questionnaire and generating profile-based results for dog guardians.

The underlying questionnaire is based on the 36-item Pet Parenting Style scale developed in research led by Lauren Brubaker under the supervision of Dr. Monique Udell within the OSU Human–Animal Interaction context. This repository contains Alisa Tananaeva's Streamlit prototype for practical administration, score calculation, and profile visualization.

`PPS_1.py` presents all 36 items, computes three subscale means (Authoritative, Authoritarian, and Permissive), assigns the most probable parenting style using fixed centroids and bias weights, and reports z-scores and percentiles relative to a 953-dog reference sample.

> **Research prototype** · Python 3.10+ & Streamlit · Functional local demo

[![Made with Streamlit](https://img.shields.io/badge/Made%20with-Streamlit-FF4B4B?logo=streamlit&logoColor=white)](https://streamlit.io)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white)](https://python.org)

---

## What this app does

- Presents **36 five-point Likert** items (frequency: *Never* … *Always*) to dog guardians.
- Computes **three subscale means** (12 items each): Permissive, Authoritative, Authoritarian.
- Assigns a **most probable parenting style** by Euclidean distance from the respondent’s profile and three fixed centroids.
- Reports **z-scores and approximate percentiles** for each subscale using normative **mean and SD from N = 953** (assumes a normal CDF for percentiles).
- Shows **Altair** visuals: bar chart of percentiles and a **donut** of model-based similarity (\(\exp(-d_{eff})\) per style).

---

## Features

| Area | Detail |
|------|--------|
| Items | 36 caregiver self-report statements, English |
| Scales | 12 + 12 + 12 items → three means (1–5) |
| Classification | Nearest centroid after bias-weighted distance |
| Norms | Embedded means/SDs (953-dog reference) |
| Privacy | Session-only; no server-side storage (see [DATA_PRIVACY.md](DATA_PRIVACY.md)) |
| Data at runtime | **No CSV required** — centroids, \(\beta\)s, and norms are in `PPS_1.py` |

---

## Repository layout (high level)

```
PetParentingPaper/
├── PPS_1.py              # Main Streamlit app (entry point)
├── requirements.txt
├── README.md
├── DATA_PRIVACY.md
├── CHANGELOG.md
└── …                     # Additional folders: supporting research materials
```

For GitHub visitors, the main entry point is `PPS_1.py`. The rest of the repository contains supporting research materials and earlier project assets.

---

## Quick start

```bash
cd PetParentingPaper
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
streamlit run PPS_1.py
```

Open the local URL (typically `http://localhost:8501`). Answer all items, then click **Compute Style**.

---

## Scoring logic (summary)

1. **Likert → numbers:** *Never* = 1 … *Always* = 5.
2. **Subscale means:** unweighted mean of the 12 items in each subscale.
3. **Profile vector:** \([M_{perm}, M_{authv}, M_{authn}]\) in that order (matching centroid coordinates in code).
4. **Distance:** Euclidean distance from the profile to each style’s **centroid** (fixed constants aligned with the original model).
5. **Bias:** multiply each style’s distance by its \(\beta\) (`BETA_PERM`, `BETA_AUTHV`, `BETA_AUTHN`); smallest **effective** distance wins.
6. **Normative scores:** z = \((M - \mu) / \sigma\) using embedded \(\mu,\sigma\) per subscale; percentile ≈ \(\Phi(z) \times 100\) (normal approximation).
7. **Donut “similarity”:** \(\exp(-d_{eff})\) per style (larger = closer to that centroid after bias).

Other files in this repository may hold supporting tables or drafts; they are **not** needed to run the Streamlit prototype.

---

## Tech stack

| Layer | Tool |
|--------|------|
| UI | [Streamlit](https://streamlit.io) |
| Numeric / tables | NumPy, pandas |
| Charts | [Altair](https://altair-viz.github.io/) |

---

## Author

**Alisa Tananaeva**  
Animal behavior & welfare scientist — [alicetananaeva.com](https://alicetananaeva.com)

The **Pet Parenting Style questionnaire** was developed in the research program described above; this Streamlit implementation is maintained here as a separate, practical layer on top of that work.

---

## Project status

- Functional research prototype
- Main entry point: `PPS_1.py`
- Local/session-only use in the current version
- Further interface refinement and interpretation layers may be added later

---

## License

Shared for **portfolio and research transparency**. The questionnaire content and scoring logic are tied to ongoing academic work. **Contact the repository maintainer** before reusing items, centroids, or norms in derivative instruments or commercial products.
