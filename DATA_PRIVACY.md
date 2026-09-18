# Data and privacy

## Consent model

Participants can complete PPS and receive the same profile whether they agree to research storage or decline. The browser sends a response to the storage API only after an explicit **Yes, share my answers for research** choice.

## Data stored with consent

- A randomly generated response ID and submission time
- The 36 questionnaire answers
- Three calculated scale means
- Profile classification, z-scores, percentiles, and effective distances
- The application version used for scoring

These records are stored in the `pps_sessions` table in Cloudflare D1.

## Data not requested by the app

- Name or email address
- Human demographics
- Contact information
- Location
- Browser or device fingerprint
- Advertising or analytics identifiers

Cloudflare necessarily processes normal request metadata to deliver and protect the service, but the application does not copy IP addresses or request headers into the research database.

## Declining consent

When a participant chooses not to share, the profile is calculated in the browser and no questionnaire record is written to D1.

## Research context

Consented data are intended for future aggregate or de-identified research on human–animal relationships. For questions about data use, contact the repository maintainer through GitHub.
