import i18next from 'i18next';
import { it, en } from '@healthbridge/shared';

i18next.init({
  lng: process.env.LOCALE || 'it',
  fallbackLng: 'it',
  resources: {
    it: { translation: it },
    en: { translation: en },
  },
  interpolation: {
    prefix: '{',
    suffix: '}',
  },
});

export const t = i18next.t;
export default i18next;
