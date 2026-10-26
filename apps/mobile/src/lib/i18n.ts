import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import en from "../../../../packages/shared/src/locales/en.json";
import ar from "../../../../packages/shared/src/locales/ar.json";
import ckb from "../../../../packages/shared/src/locales/ckb.json";
const device = getLocales()[0]?.languageCode;
void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      ckb: { translation: ckb },
    },
    lng: ["ar", "ckb"].includes(device || "") ? device || "en" : "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
export default i18n;
