# Operations

Deploy Next.js with `npm ci` and `npm run build -w @reelo/admin`, then `npm run start -w @reelo/admin`. Set the two NEXT_PUBLIC Supabase variables at build time. Use HTTPS, access logs with token redaction, alerting and an approved admin domain. Backend deployment commands are in README. Keep migrations reviewed and back up before changes.

For Live, implement `LiveProvider` with a real service, secure ingest credentials server-side, authorize streamers, add age rules, signed webhooks, moderator termination, authenticated playback and real viewer telemetry. Keep the flag off until completed.

For adaptive video, implement the `VideoProvider` contract in a server-side adapter, use signed uploads and callbacks with idempotency, verify output ownership, and store verified HLS/thumbnail assets. Current UI only uses the original-MP4 adapter path, so playback selection must be extended too.

Main costs: uploaded GB, retained GB-months, delivered video GB/CDN egress, transcoding minutes/resolutions, database compute/storage, realtime connections/messages, Auth/email delivery, moderation staffing, admin hosting, EAS build minutes, developer-store subscriptions and live ingest/egress minutes. Estimate delivered GB as daily viewers × views/viewer × average delivered MB ÷ 1000; multiply by retention and provider prices. There is no reliable fixed monthly estimate without traffic assumptions.

Monitor upload success/latency, pending/failed jobs, playback failures, report backlog, database load and storage growth. Implement deletion/abandoned-upload sweepers, watch-event retention and push retries before launch.
