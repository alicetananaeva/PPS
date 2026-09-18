# Changelog

All notable documentation and packaging updates for this repository will be listed here.

## [Unreleased]

### Added

- Cloudflare Worker and Static Assets deployment.
- Cloudflare D1 storage for explicitly consented questionnaire responses.
- Consent screen that preserves access to results when storage is declined.
- Shared browser/server scoring validation and automated Node tests.
- Responsive, accessible one-question-per-screen interface.

### Changed

- Production runtime moved from Streamlit to Cloudflare.
- Privacy documentation updated for consent-gated D1 storage.

## [1.0.0]

### Added

- `README.md` — project overview, scoring summary, simplified layout, local run instructions.
- `requirements.txt` — pinned minimum versions for Streamlit, NumPy, pandas, Altair.
- `DATA_PRIVACY.md` — session-only data handling for the current prototype.
- `.gitignore` — Python virtualenvs, `__pycache__`, local Streamlit secrets.
- `PPS_1.py` at repository root so clone → `streamlit run PPS_1.py` works without extra paths.
