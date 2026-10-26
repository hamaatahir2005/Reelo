# دامەزراندنی Reelo

ئەمە وەشانی گەشەپێدانە، هێشتا بۆ بەکارهێنانی گشتی ئامادە نییە. ناو و ناسنامەکانی ئەپ کاتین تا مافی بازرگانییان پشکنین دەکرێت.

## لە Windows

Node.js 22 LTS و Git دابمەزرێنە. بۆ Supabase ـی ناوخۆ Docker Desktop ـیش پێویستە. لە PowerShell، لە بوخچەی پڕۆژەکە:

```powershell
npm ci
Copy-Item .env.example apps/mobile/.env
Copy-Item .env.example apps/admin/.env.local
```

پڕۆژەیەک لە Supabase دروست بکە. ناونیشانی URL و کلیلی گشتی anon لە گۆڕاوەکانی `EXPO_PUBLIC_` بۆ مۆبایل و `NEXT_PUBLIC_` بۆ پانێڵ دابنێ. کلیلی `service_role` تەنها لە سێرڤەر بەکاربهێنە؛ لە ئەپ، GitHub یان چات مەینێرە.

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase functions deploy upload
npx supabase functions deploy account
npx supabase functions deploy admin
npx supabase functions deploy push
npm run mobile
```

لە ڕێکخستنەکانی Auth، پشتڕاستکردنەوەی ئیمەیڵ و SMTP چالاک بکە. ناونیشانی گەڕانەوەی `reelo-dev://auth/callback` و وەشانی گەڕانەوەی تێپەڕەوشە ڕێگەپێبدە. بۆ دامەزراندنی ناوخۆ، `npx supabase start` و `npx supabase db reset` و `npx supabase functions serve` بەکاربهێنە. لە مۆبایل، `localhost` کۆمپیوتەرەکەت نییە؛ IP ـی ناوخۆی کۆمپیوتەرەکەت بەکاربهێنە.

## پانێڵی بەڕێوەبردن

```powershell
npm run admin
```

ناونیشانەکە `http://localhost:3000` ـە. هەژمارێک دروست و ئیمەیڵەکەی پشتڕاست بکەرەوە. لە SQL Editor ـی باوەڕپێکراوی Supabase، ڕۆڵی بەڕێوەبەر بە UUID ـی ڕاستەقینە بدە:

```sql
insert into public.user_roles(user_id,role) values ('USER_UUID','admin');
```

## APK و AAB و IPA

هەژماری Expo دروست بکە، ناسنامە کاتییەکانی Android/iOS بگۆڕە بە ناسنامەی پەسەندکراوی خۆت و گۆڕاوە گشتییەکانی Supabase لە EAS ڕێک بخە.

```powershell
cd apps/mobile
npx eas-cli login
npx eas-cli init
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile ios-internal
npx eas-cli build --platform ios --profile ios-production
```

ناسنامەی پڕۆژەی EAS لە `EAS_PROJECT_ID` دابنێ. `preview` فایلی APK و `production` فایلی AAB دروست دەکات. IPA پێویستی بە ئەندامێتی Apple Developer و واژۆ و provisioning هەیە. بۆ تاقیکردنەوەی ناوخۆ، UDID ـی ئامێرەکان تۆمار بکە. بۆ TestFlight، ئەپێک لە App Store Connect دروست بکە و زانیاری تایبەتمەندی و پێداچوونەوە تەواو بکە. لینکی ڕاستەقینە تەنها دوای بیڵدی سەرکەوتوو لە EAS دەردەکەوێت.

## بڵاوکردنەوە و تێچوو

پانێڵەکە لە میواندارییەکی Next.js دابنێ و تەنها گۆڕاوە گشتییەکانی Supabase بۆی ڕێک بخە. بنکەدراوە و Edge Function ـەکان بە فرمانەکانی سەرەوە بڵاو بکەرەوە. پێش بڵاوکردنەوە، زمانی کوردی و عەرەبی و ئینگلیزی لە Android و iOS تاقی بکەرەوە؛ ڕەتکردنەوەی مۆڵەت، بڕانی ئینتەرنێت و کۆتایی سێشنیش تاقی بکەرەوە.

تێچووە سەرەکییەکان بریتین لە هەڵگرتن و گواستنەوەی ڤیدیۆ، transcoding، بنکەدراوە، ئیمەیڵ، میوانداری، بیڵدی EAS و چاودێری ناوەڕۆک. نرخی جێگیر نادیارە تا بڕی بەکارهێنان بزانرێت. HLS و پەخشی ڕاستەوخۆ هێشتا provider ـی کاراکراویان نییە. کڕین و پارەدان ناچالاکن. پەڕەکانی یاسایی پێویستیان بە پێداچوونەوەی پارێزەر هەیە.
