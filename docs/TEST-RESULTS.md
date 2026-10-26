# Verification performed on 2026-10-26

Environment: Linux, Node 24.19.0, npm 11.9.0. Dependencies installed successfully after resolving React type conflicts. `package-lock.json` records installed versions. SDK 54 compatibility matches Expo's bundled native-module map; `expo install --check` passed in offline mode, which does not validate against remote Expo metadata.

| Check | Actual result |
| --- | --- |
| npm dependency installation | Passed |
| TypeScript, all four workspaces | Passed |
| ESLint | Passed |
| Vitest | 14 tests passed (9 PostgreSQL/RLS, 5 validation/localization/media/ranking) |
| React Native Testing Library / Jest | 2 tests passed (accessible/disabled actions, field edits and RTL text) |
| Node static test file | Passed |
| Next.js production build | Passed; generated `apps/admin/.next` |
| Running admin HTTP smoke | HTTP 200 from `127.0.0.1:3000`; REELO HTML rendered |
| Expo Android bundle export | Passed; generated Hermes bundle in `apps/mobile/dist/_expo/static/js/android` |
| Expo iOS bundle export | Passed; generated Hermes bundle in `apps/mobile/dist/_expo/static/js/ios` |
| EAS account check | `Not logged in` |
| APK cloud build attempt | Blocked: `An Expo user account is required to proceed.` |
| APK / AAB / signed IPA | Not generated |
| Hosted Supabase/Auth/Storage/Edge Functions | Not tested; no project credentials configured |
| Android/iOS device or emulator tests | Not performed; no devices/Android SDK/iOS signing environment available |

Expo Router initially failed to resolve its app-root transform in the workspace. Adding the matching router package at the monorepo root fixed both platform exports. UI tests mock native safe areas and preferences; they do not replace device testing. PostgreSQL tests use PGlite with minimal Auth/Storage schema stubs and omit the Supabase realtime publication. Real email verification, password recovery redirects, media transfer, push delivery and provider webhooks remain unverified.

Exported JavaScript/Hermes bundles are **not installable APK or IPA files**. The EAS build requires an authenticated Expo session or securely configured EXPO_TOKEN, a linked EAS project, backend public configuration, and Android signing setup. iOS also requires Apple Developer signing/provisioning and owner authorization.

## Web preview verification

Expo web export passed. Chromium at a 390×844 viewport opened the actual Expo bundle, selected Sorani, Arabic and English, switched to registration, and verified that authentication is disabled when no backend is configured. No browser page errors occurred. Fixed a blank-page failure caused by untransformed `import.meta` in Zustand middleware by enabling the supported Expo Babel transform in `babel.config.js`. Root navigation now mounts before authentication redirects. No hosted backend operations were claimed as tested.

## Supabase connection check

The supplied public project URL/key returned HTTP 200 from `/auth/v1/settings` with email authentication enabled. REST requests through the actual Supabase client returned HTTP 404 / PGRST205 for `profiles`; `feature_flags` was also absent. No account or content was created. The preview therefore displays a localized schema-setup notice and keeps account submissions disabled until its live readiness check confirms the required database objects exist. Public credentials are provided through ignored environment files and embedded in the client bundle as intended; no service-role key was supplied. `supabase/bootstrap.sql` is generated from the versioned migrations and executed by the PostgreSQL test suite with Supabase-specific stubs.
