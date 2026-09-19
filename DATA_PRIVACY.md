# Data and privacy

## Consent model

Participants can complete PPS and receive the same profile whether they agree to research storage or decline. The browser sends a response to the storage API only after an explicit **Yes, share my answers for research** choice.

The Dr. Udell class version also asks three required experience questions after showing the result. These ratings are stored as anonymous class feedback regardless of the research-storage choice and are assigned a random participant code. If the participant consents to research storage, the same code links the feedback to the questionnaire scores. The code is not linked to a name or contact detail unless the participant independently chooses to share it.

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

Class feedback is stored in `class_feedback`, and participant codes are stored in `completion_codes`. For the Dr. Udell class pilot, both tables contain the random participant code. A consented record in `pps_sessions` contains that same code; when consent is declined, no questionnaire record is created and only the code plus the three feedback ratings are retained.

## Research context

Consented data are intended for future aggregate or de-identified research on human–animal relationships. For questions about data use, contact the repository maintainer through GitHub.
