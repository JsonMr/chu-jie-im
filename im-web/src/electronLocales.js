/**
 * 供 Electron 主进程使用的语言包（与 i18n/locales 保持同步）
 */
const zh = {
  electron: {
    newMessage: '您有新的未读消息',
    showWindow: '显示窗口',
    quit: '退出'
  },
  aboutUs: {
    updateCheckFailed: '检查更新失败: {error}',
    downloadUpdateFailed: '下载更新失败: {error}'
  }
};

const en = {
  electron: {
    newMessage: 'You have new messages',
    showWindow: 'Show window',
    quit: 'Quit'
  },
  aboutUs: {
    updateCheckFailed: 'Update check failed: {error}',
    downloadUpdateFailed: 'Download update failed: {error}'
  }
};

const messages = { zh, en };

function t(locale, key, params = {}) {
  const keys = key.split('.');
  let str = keys.reduce((obj, k) => obj && obj[k], messages[locale] || messages['zh']);
  Object.keys(params).forEach((k) => {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
  });
  return str;
}

export { t };
