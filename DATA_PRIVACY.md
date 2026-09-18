# Data and privacy

## Consent model

Participants can complete PPS and receive the same profile whether they agree to research storage or decline. The browser sends a response to the storage API only after an explicit **Yes, share my answers for research** choice.

The Dr. Udell class version also asks three required experience questions after showing the result. These ratings are stored as anonymous class feedback regardless of the research-storage choice. They are not linked to questionnaire answers or completion codes.

## Data stored with consent

- A randomly generated response ID and submission time
- The 36 questionnaire answers
- Three calculated scale means
- Profile classification, z-scores, percentiles, and effective distances
- The application version used for scoring
- A cohort label for consented responses submitted through the Dr. Udell class link

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

Class feedback is stored separately in `class_feedback`. Completion codes are stored separately in `completion_codes`. Neither table contains a session ID or other field that can link it to a questionnaire response.

## Research context

Consented data are intended for future aggregate or de-identified research on human–animal relationships. For questions about data use, contact the repository maintainer through GitHub.
