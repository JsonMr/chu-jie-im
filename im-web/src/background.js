'use strict'

import {
	app,
	protocol,
	BrowserWindow,
	Menu,
	Tray,
	ipcMain,
	globalShortcut
} from 'electron'
import {
	createProtocol
} from 'vue-cli-plugin-electron-builder/lib'
import Screenshots from "electron-screenshots";
import {
	autoUpdater
} from 'electron-updater'
import {
	t
} from './electronLocales.js'

const path = require('path');
const {
	nativeImage
} = require('electron');
const isDevelopment = process.env.NODE_ENV !== 'production'
let win
let tray
let appLogo = path.join(__static, 'logo.ico');
let blinkTimer = null; // 闪烁定时器
let isBlinking = false; // 是否正在闪烁
let blinkIconVisible = true; // 当前图标是否可见
let defaultTooltip = process.env.VUE_APP_NAME; // 默认 tooltip 文本
let currentLocale = app.getLocale(); // 当前语言

function tr(key, params) {
	return t(currentLocale, key, params);
}
// 配置自动更新
autoUpdater.autoDownload = false; // 不自动下载，等待用户确认
autoUpdater.autoInstallOnAppQuit = true; // 应用退出时自动安装更新

protocol.registerSchemesAsPrivileged([{
	scheme: 'app',
	privileges: {
		secure: true,
		standard: true
	}
}])
async function createWindow() {
	// 创建窗口
	win = new BrowserWindow({
		width: 360,
		height: 440,
		minWidth: 500,
		minHeight: 440,
		icon: appLogo,
		frame: false,
		webPreferences: {
			nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
			contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
			preload: path.join(__dirname, './preload.js'),
			webSecurity: false, // 解除跨域限制
			devTools: true, // 允许打开调试器
		}
	})

	// 窗口获得焦点时停止闪烁
	win.on('focus', () => {
		stopBlink();
	})

	// 禁用顶部菜单
	Menu.setApplicationMenu(null)

	// 监听 dom-ready 事件，确保页面渲染完成后再显示窗口，彻底消除白屏闪烁
	win.webContents.on('dom-ready', () => {
		win.show()
	})

	if (process.env.WEBPACK_DEV_SERVER_URL) {
		// Load the url of the dev server if in development mode
		await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
		if (process.env.IS_TEST) win.webContents.openDevTools({
			mode: 'detach'
		})
	} else {
		createProtocol('app')
		// Load the index.html when not in development
		win.loadURL('app://./index.html')
	}
}

// 开始闪烁
function startBlink() {
	if (isBlinking) {
		return;
	}
	isBlinking = true;
	blinkIconVisible = true;
	tray.setToolTip(tr('electron.newMessage'));
	// 每 500ms闪烁一次图标事
	blinkTimer = setInterval(() => {
		if (blinkIconVisible) {
			// 显示空白图标（隐藏效果）
			tray.setImage(nativeImage.createEmpty());
			blinkIconVisible = false;
		} else {
			// 显示正常图标
			tray.setImage(appLogo);
			blinkIconVisible = true;
		}
	}, 500);
}

// 停止闪烁
function stopBlink() {
	if (!isBlinking) {
		return
	}
	isBlinking = false;
	if (blinkTimer) {
		clearInterval(blinkTimer);
		blinkTimer = null;
	}
	// 恢复正常图标
	tray.setImage(appLogo);
	tray.setToolTip(defaultTooltip);
	blinkIconVisible = true;
}

function createTray() {
	tray = new Tray(appLogo)
	defaultTooltip = process.env.VUE_APP_NAME;
	const contextMenu = Menu.buildFromTemplate([{
		label: tr('electron.showWindow'),
		click: () => {
			win.show();
			stopBlink();
		}
	}, {
		label: tr('electron.quit'),
		click: () => app.quit()
	}])
	tray.on('click', () => {
		win.show();
		stopBlink();
	});
	tray.setToolTip(defaultTooltip)
	tray.setContextMenu(contextMenu)
}

function updateTrayMenu() {
	const contextMenu = Menu.buildFromTemplate([{
		label: tr('electron.showWindow'),
		click: () => {
			win.show();
			stopBlink();
		}
	}, {
		label: tr('electron.quit'),
		click: () => app.quit()
	}]);
	tray.setContextMenu(contextMenu);
}

function initIpcMainEvent() {
	// 获取系统语言
	ipcMain.handle('getAppLocale', () => {
		return app.getLocale()
	})
	// 获取全屏状态
	ipcMain.handle('isFullScreen', () => {
		return win.isFullScreen()
	})
	// 是否获得焦点
	ipcMain.handle('isFocused', () => {
		return win.isFocused()
	})
	// 用户点击页面的截屏按钮触发截屏
	ipcMain.handle('screenshot', () => {
		return new Promise((resolve, reject) => {
			const screenshots = new Screenshots();
			screenshots.startCapture();
			screenshots.on("ok", (e, buffer, bounds) => {
				resolve(buffer, bounds)
			});
			screenshots.on("cancel", (e) => {
				resolve()
			});
		})
	})

	ipcMain.on('show', () => {
		win.show()
	})

	ipcMain.on('setLocale', (event, locale) => {
		currentLocale = locale;
		updateTrayMenu();
	})

	ipcMain.on('minimize', () => {
		win.minimize()
	})

	ipcMain.on('maximize', () => {
		win.maximize()
	})

	ipcMain.on('unmaximize', () => {
		win.unmaximize()
	})

	ipcMain.on('close', () => {
		win.hide()
	})

	ipcMain.on('resize', (event, v) => {
		win.setSize(v.width, v.height)
		win.setMaximizable(v.maximizable)
	})

	ipcMain.on('center', () => {
		win.center();
	})

	// 开始托盘图标闪烁
	ipcMain.on('startTrayBlink', () => {
		// 只有在窗口不在焦点时才闪烁
		if (!win.isFocused()) {
			startBlink();
		}
	})

	// 停止托盘图标闪烁
	ipcMain.on('stopTrayBlink', () => {
		stopBlink();
	})

	// 获取应用版本号
	ipcMain.handle('get-app-version', () => {
		return app.getVersion();
	})

	// 检查更新
	ipcMain.handle('check-for-update', async () => {
		try {
			if (isDevelopment) {
				return false;
			}
			await autoUpdater.checkForUpdates();
			return true;
		} catch (error) {
			console.error('检查更新失败:', error);
			win.webContents.send('update-error', tr('aboutUs.updateCheckFailed', {
				error: error.message || ''
			}));
			return false;
		}
	})

	// 开始下载更新
	ipcMain.handle('start-update', async () => {
		try {
			await autoUpdater.downloadUpdate();
			return true;
		} catch (error) {
			console.error('下载更新失败:', error);
			win.webContents.send('update-error', tr('aboutUs.downloadUpdateFailed', {
				error: error.message || ''
			}));
			return false;
		}
	})

	// 安装更新并重启应用
	ipcMain.handle('install-update', () => {
		try {
			autoUpdater.quitAndInstall(false, true); // false: 不立即退出, true: 安装后重启
			return true;
		} catch (error) {
			console.error('安装更新失败:', error);
			return false;
		}
	})
}

function initScreenshots() {
	// 快捷键截屏
	const screenshots = new Screenshots();
	globalShortcut.register("ctrl+alt+a", () => {
		if (!screenshots.$win || !screenshots.$win.isFocused) {
			screenshots.startCapture();
		}
	})

	// esc取消截屏
	globalShortcut.register("esc", () => {
		if (screenshots.$win && screenshots.$win.isFocused()) {
			screenshots.endCapture();
		}
	})
}

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

function initAutoUpdater() {
	// 监听更新可用
	autoUpdater.on('update-available', (info) => {
		console.log('发现新版本:', info.version);
		win.webContents.send('update-available', {
			version: info.version,
			releaseDate: info.releaseDate,
			releaseNotes: info.releaseNotes
		});
	});

	// 监听更新不可用
	autoUpdater.on('update-not-available', (info) => {
		console.log('当前已是最新版本');
		win.webContents.send('update-not-available', info);
	});

	// 监听更新错误
	autoUpdater.on('error', (error) => {
		console.error('更新错误:', error);
		win.webContents.send('update-error', tr('aboutUs.updateCheckFailed', {
			error: error.message || ''
		}));
	});

	// 监听下载进度
	autoUpdater.on('download-progress', (progress) => {
		win.webContents.send('download-progress', {
			percent: progress.percent,
			transferred: progress.transferred,
			total: progress.total
		});
	});

	// 监听更新下载完成
	autoUpdater.on('update-downloaded', (info) => {
		console.log('更新下载完成:', info.version);
		win.webContents.send('update-downloaded', {
			version: info.version,
			releaseDate: info.releaseDate,
			releaseNotes: info.releaseNotes
		});
	});
}

app.on('ready', async () => {
	createWindow()
	createTray()
	initIpcMainEvent()
	initScreenshots()
	initAutoUpdater()
	// 修改通知栏标题
	app.setAppUserModelId(process.env.VUE_APP_NAME)
})

if (isDevelopment) {
	if (process.platform === 'win32') {
		process.on('message', (data) => {
			if (data === 'graceful-exit') {
				app.quit()
			}
		})
	} else {
		process.on('SIGTERM', () => {
			app.quit()
		})
	}
}