# دروستکردنی APK بە هەژماری Expo ـی خۆت

لە کۆمپیوتەرەکەت پڕۆژەکە بکەرەوە و ئەمانە جێبەجێ بکە:

```powershell
npm ci
cd apps/mobile
npx eas-cli login
npx eas-cli init
```

UUID ـی پڕۆژەکە لە `EAS_PROJECT_ID` دابنێ؛ ناونیشان و کلیلی گشتی Supabase لە `.env` دابنێ، پاشان:

```powershell
npx eas-cli build --platform android --profile preview
```

EAS لینکی APK ـی ڕاستەقینە دەدات. بۆ GitHub Actions، لە ڕێکخستنەکانی repository، ژینگەی `preview` دروست بکە. `EXPO_TOKEN` وەک Secret و `EAS_PROJECT_ID`، `EXPO_PUBLIC_SUPABASE_URL` و `EXPO_PUBLIC_SUPABASE_ANON_KEY` وەک Variable دابنێ. هیچ تۆکنێک لە چات یان کۆد مەنووسە. پێش بیڵدی خۆکار، یەکەمجار credentials ـی Android لە EAS ڕێک بخە. پاشان لە Actions، `Android APK (EAS)` بە Run workflow دەست پێ بکە.

IPA تەنها بە Expo بەس نییە: Apple Developer و signing/provisioning پێویستن. ئەگەر ئامادە بوون، فرمانی `npx eas-cli build --platform ios --profile ios-production` جێبەجێ بکە. ئەمە IPA ـی واژۆکراو بۆ TestFlight/App Store دروست دەکات.
