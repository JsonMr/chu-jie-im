import Vue from 'vue';
import VueI18n from 'vue-i18n';
import zh from './zh';
import en from './en';
import ElementLocale from 'element-ui/lib/locale';
import ElementZhCN from 'element-ui/lib/locale/lang/zh-CN';
import ElementEn from 'element-ui/lib/locale/lang/en';

Vue.use(VueI18n);

const messages = {
  zh,
  en
};

function getInitialLocale() {
  // 优先级：客户手动设置 > 系统语言 > 默认中文
  const supportLocales = Object.keys(messages);
  let locale = localStorage.getItem('im-locale');
  if (supportLocales.includes(locale)) {
    return locale
  }
  locale = (navigator.language || navigator.userLanguage || '').toLowerCase();
  if (supportLocales.includes(locale)) {
    return locale
  }
  return supportLocales[0];
}

const locale = getInitialLocale();
const i18n = new VueI18n({
  locale,
  fallbackLocale: 'zh',
  messages
});

// Element UI 使用对应语言包
ElementLocale.use(locale === 'en' ? ElementEn : ElementZhCN);

export function setLocale(newLocale) {
  i18n.locale = newLocale;
  localStorage.setItem('im-locale', newLocale);
  ElementLocale.use(newLocale === 'en' ? ElementEn : ElementZhCN);
  window.electronAPI && window.electronAPI.sendEvent('setLocale', newLocale);
}

export default i18n;
