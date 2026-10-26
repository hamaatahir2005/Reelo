# Reelo — Your Videos, Your World

An original Expo/Supabase short-video application and Next.js moderation console. **Development build, not production-ready.** Reelo and `dev.placeholder.reelo` are provisional identifiers. No credentials or real media are bundled.

## Quick start (Windows PowerShell)

Install Node 22 LTS, Git and Docker Desktop (Docker needed only for local Supabase). Then:

```powershell
npm ci
Copy-Item .env.example apps/mobile/.env
Copy-Item .env.example apps/admin/.env.local
```

Fill only the relevant public Supabase URL and anon/publishable key in each app's file. Never put a service-role key in either app. Create a Supabase project or start a local instance:

```powershell
npx supabase start
npx supabase db reset
npx supabase functions serve
```

For a hosted project:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase functions deploy upload
npx supabase functions deploy account
npx supabase functions deploy admin
npx supabase functions deploy push
```

Supabase supplies its server keys to deployed functions. For local functions, use an ignored secrets file and `--env-file`; never commit it. Configure Auth email confirmation, SMTP, password recovery, and allow redirects `reelo-dev://auth/callback` and the recovery query variant. Use an actual HTTPS app-link domain before release. A phone cannot access the computer's `localhost`: use its LAN IP for local Supabase and open the necessary local firewall ports. Android emulator uses `10.0.2.2`.

```powershell
npm run mobile
npm run admin
```

Open Expo on a connected Android/iOS device. Camera/video and push require a compatible native development/preview build; remote push is not supported by Android Expo Go. Admin is at http://localhost:3000. Create and verify a user, then grant staff access **from the trusted SQL editor**, replacing the UUID:

```sql
insert into public.user_roles(user_id, role) values ('USER_UUID','admin');
```

There is no anonymous admin or client role-editing capability. Admin sessions are memory-only and require sign-in after refresh.

## Build installable apps

Before building, configure real Supabase public variables as EAS environment variables or in the ignored local `.env`, decide legally cleared bundle identifiers, and update `apps/mobile/app.config.ts`. Register the EAS project:

```powershell
cd apps/mobile
npx eas-cli login
npx eas-cli init
# Put the returned project UUID in EAS_PROJECT_ID.
npx expo install --check
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile ios-internal
npx eas-cli build --platform ios --profile ios-production
```

`preview` creates APK; Android `production` creates Play Store AAB. The two iOS profiles build device binaries, requiring an Apple Developer team and signing/provisioning. Internal iOS builds require registered device UDIDs. Production IPA goes through TestFlight/App Store Connect; it cannot be freely installed through a normal web link. EAS supplies the actual artifact URL after a successful build. This repository does not contain a signed APK/AAB/IPA.

Play Store requires a developer account, final application ID, signing strategy, privacy policy, content rating and data-safety disclosures. TestFlight requires an Apple Developer subscription, App Store Connect app, cleared bundle ID, distribution certificate/profile, export compliance, privacy labels and review information. Do not run iOS cloud builds until the account owner has authorized signing.

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npm run test:native
npm run test:static
npm run build:admin
cd apps/mobile
npx expo export --platform android --platform ios
```

Database tests execute actual PostgreSQL using PGlite with mocked Supabase Auth/storage schemas. They do not verify hosted Auth, email delivery, Storage REST, Deno deployment, or real-device behavior. See [test results](docs/TEST-RESULTS.md), [feature status](docs/STATUS.md), [security](docs/SECURITY.md), and [Sorani setup](docs/SETUP-ckb.md).

## Structure

- `apps/mobile`: Expo Router screens, original icon, native build configuration.
- `apps/admin`: standalone Next.js dashboard, server-authorized moderation.
- `packages/shared`: branding, ranking helper, provider interfaces, JSON translations.
- `packages/validation`: reusable Zod input validation.
- `supabase/migrations`: schema, RLS, secure RPCs, feed ranking and notification outbox.
- `supabase/functions`: upload validation, account privacy operations, admin and push delivery.
- `tests`: validation, localization and PostgreSQL authorization tests.
- `docs`: setup, limitations, operations and legal templates.

Complete file listing: [TREE.txt](docs/TREE.txt).

## Web preview

From `apps/mobile`, run `npx expo start --web`, or export with `npx expo export --platform web --output-dir dist-web`. Without Supabase, onboarding, language selection and authentication forms can be inspected; submitting account actions is disabled with an explicit notice. This does not provide a populated video feed or a native APK/IPA.
