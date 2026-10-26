# پەیوەستکردنی Supabase بە Reelo

URL و کلیلی گشتی پڕۆژەکە تاقی کراونەتەوە و پەیوەندی سەرکەوتووە. بەڵام خشتەکان هێشتا دامەزراون نییە. تەنها کلیلی گشتی ڕێگەی دروستکردنی خشتە نادات.

## ١. دامەزراندنی خشتە و ڕێساکانی پاراستن

ئەم هەنگاوە تەنها بۆ یەکەم دامەزراندن لە پڕۆژەیەکی نوێی Supabase ـە؛ دووبارەی مەکەرەوە لە پڕۆژەیەکی پێشتر دامەزراو.

1. [ئەم فایلە SQL ـە بکەرەوە](https://github.com/hamaatahir2005/Reelo/blob/main/supabase/bootstrap.sql)، دوگمەی **Raw** هەڵبژێرە و هەموو ناوەڕۆکەکە کۆپی بکە.
2. لە پڕۆژەی Supabase ـی خۆت، **SQL Editor → New query** بکەرەوە.
3. هەموو کۆدەکە دابنێ و **Run** بکە. کۆدەکە خشتەکان، RLS، فەنکشنەکانی بنکەدراوە و bucket ـی تایبەتی ڤیدیۆ دروست دەکات. ئەگەر هەڵە ڕووبدات، transaction ـەکە هەموو گۆڕانکارییەکان هەڵدەوەشێنێتەوە.
4. ئەگەر **Success** پیشان درا، preview بکەرەوە و **هەوڵدانەوە** دابگرە. پشکنینەکە ڕاستەقینەیە؛ بە دامەزراندنی خشتەکان دوگمەکانی هەژمار چالاک دەبن.

## ٢. ڕێکخستنی ئیمەیڵ

لە **Authentication → URL Configuration**، ئەم ناونیشانانە زیاد بکە بۆ Redirect URLs:

```text
https://reelo-app-preview.bonnypeony256.chatgpt.site/auth/callback
https://reelo-app-preview.bonnypeony256.chatgpt.site/auth/callback?next=recovery
reelo-dev://auth/callback
reelo-dev://auth/callback?next=recovery
```

لە Authentication، پشتڕاستکردنەوەی ئیمەیڵ چالاک بهێڵە. Supabase ـی بنەڕەتی سنووری ناردنی ئیمەیڵ هەیە؛ بۆ بەکارهێنانی ڕاستەقینە SMTP ـی خۆت ڕێک بخە. لە preview هەژمارێکی خۆت دروست بکە و ئیمەیڵەکە پشتڕاست بکەرەوە. PKCE پێویستی بە کردنەوەی لینکی ئیمەیڵ لە هەمان وێبگەڕی دەستپێکردنی تۆمارکردن هەیە.

## ٣. فەنکشنەکانی ڤیدیۆ و بەڕێوەبردن

SQL بە تەنها Edge Functions دانامەزرێنێت. لە کۆمپیوتەری خۆت، لە بوخچەی repository:

```powershell
npx supabase login
npx supabase link --project-ref exygcvfhjcrsvyrrpbei
npx supabase functions deploy upload
npx supabase functions deploy account
npx supabase functions deploy admin
npx supabase functions deploy push
```

چونکە SQL ـی سەرەوەت بە دەست جێبەجێ کردووە، ئێستا `db push` جێبەجێ مەکە؛ سەرەتا دەبێت تۆماری migrations لەگەڵ بنکەدراوە بگونجێنرێت. Edge Functions کلیلە نهێنییەکانی سێرڤەر لە Supabase وەردەگرن؛ هیچ کلیلی نهێنی لە چات یان ئەپ مەنووسە.

هەتا Functions دامەزرێنرێن، بارکردنی ڤیدیۆ، سڕینەوەی هەژمار و کردارەکانی پانێڵ کار ناکەن. HLS، Live و پارەدانیش هێشتا ئامادە نین.
