# Security and deployment checklist

Client anon keys are intentionally public. Service-role and Expo push access tokens belong only in server secrets. Rotate any accidentally published secrets. Staff membership is assigned by a trusted operator only. All public tables have RLS. Server-owned tables reject client writes; sensitive functions are service-role-only. Media buckets are private with no client insert policy. Only an authenticated confirmed user can request a signed upload path.

Before release:

- Apply migrations to a staging Supabase project and run real Auth, storage signing, RPC and Edge Function tests with two users and an anonymous client.
- Verify every function has JWT verification enabled, SMTP works, redirects are allowlisted, email enumeration is mitigated and admin MFA is enforced operationally (MFA enforcement is not implemented in this UI).
- Settle age eligibility and guardian consent for each jurisdiction; implement teen-private defaults, contact restrictions and grooming/content safeguards before admitting minors. There is currently no age assurance flow.
- Replace raw-private processing with a provider that validates/decodes codecs, scans content, transcodes, generates covers and authenticates callbacks. Secure HLS manifests AND segments for private content. Add durable jobs, quotas, abandoned-upload cleanup and orphan-media reconciliation.
- Signed playback URLs remain valid up to five minutes after a privacy change/block; tighten TTL or use request-time authorization for strict revocation.
- Rate counters protect successful SQL actions and Edge operations. Failed SQL transactions roll back counters. Add gateway/IP-based limits, CAPTCHA and abuse monitoring. Add scheduled retention cleanup for rate limits and watch events; choose and disclose retention periods.
- Fix a policy for moderators viewing private/removed content. Database staff visibility does not currently grant Storage media read across all private content.
- Provide report handling coverage, appeal deadlines, copyright intake, urgent safety escalation, backup/restore testing, monitoring and incident response.
- Finalize privacy/terms with counsel, fill support contacts, and complete store disclosures. No commercial music is bundled.

Account deletion removes uploaded video objects then deletes the Auth user with cascades. It is not an atomic transaction across Storage and PostgreSQL; failures are surfaced and retriable. Audit records retain a null actor after deletion. Backups and service logs need a documented retention policy. Export currently includes major user-authored records; add received conversation history/notification/settings completeness and file-based large exports before privacy-law certification.

Push delivery uses generic localized text to avoid putting private message content on lock screens. Financial feature flags cannot be enabled through the admin RPC. Live has no configured provider.
