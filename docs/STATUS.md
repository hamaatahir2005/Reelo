# Actual feature status

Implemented in source: email/password Auth and PKCE callbacks, session storage, password reset, onboarding, three JSON locales, Arabic-script font, directional layouts, dark/light preferences, public/private profiles, username uniqueness, signed MP4 upload with progress/cancel, native gallery editing where supported, camera recording, container validation, processing records, private signed playback, vertical feed, active-only playback, next URL prefetch, bounded query retention, heuristic recommendations, likes, replies, saves, follow requests and approval RPC, discovery, reports, block/mute, notification records, optional realtime one-to-one messages, role-protected admin list/removal/suspension/flags/audit, account export/deletion, EAS profiles.

Not yet complete:

- Live Supabase end-to-end testing, SMTP, phone permission/offline/session-expiry tests and Android/iOS localization visual QA.
- Avatar upload/edit, dedicated cover selection, reliable cross-platform trimming editor, resumable/background uploads. Native picker editing differs by OS. The current upload reads a file blob into memory and is foreground-only.
- HLS/CDN/transcoding provider adapter, video codec decoding, malware scanning, thumbnails, processing worker with durable retries. The original MP4 path is functional server code but container validation alone is insufficient for production safety/codec guarantees. Processing currently runs during the completion request and can time out for large media.
- Feed prefetch signs the next URL; it does not prebuffer next video's bytes. Rankings can change while paging; clients deduplicate IDs. No trained model.
- Following request management UI, unblock/unmute UI, follower lists, comment deletion/likes/report UI, profile display-name editor, appeal submission UI.
- Messaging unread counts/read receipts, older-message pagination and report/block controls in chat. Messaging is disabled by default and should remain so until device QA.
- Push receipts, dead-token cleanup, retries and a scheduled outbox dispatcher. A staff-authenticated delivery function exists, but no scheduler is configured.
- Admin report resolution, appeals workflow, restore/unban, announcements, daily analytics and list pagination beyond the first 50 entries.
- Enforced age assurance/teen controls, complete privacy retention automation, support contacts and legal approval.
- Google/Apple OAuth, optional Live ingest/player/moderation implementations. Provider interfaces are contracts only; no fake provider.
- Purchases, coins, gifts, balances, payouts: disabled, no real or simulated financial transactions.
- Signed APK/AAB/IPA and app-store releases. Requires Expo project, build environment/signing and real backend configuration.

This is a tested development foundation, not a finished TikTok-scale product. Do not expose it as a production social network before addressing the security and product gaps.
