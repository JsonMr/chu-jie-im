const path = require('path')
const fs = require('fs')

module.exports = {
	publicPath: process.env.VUE_APP_ENV == 'production' ? '/web' : './',
	configureWebpack: {
		resolve: {
			alias: {
				'@/assets': '@/src/assets'
			}
		}
	},
	devServer: {
		proxy: {
			'/admin-api': {
				target: process.env.VUE_APP_DEFAULT_BASE_API,
				changeOrigin: true,
				ws: false,
				pathRewrite: {
					'^/admin-api': ''
				}
			},
			'/new-api': {
				target: 'https://web.xinghengchujie.com/server-api',
				changeOrigin: true,
				ws: false,
				pathRewrite: {
					'^/new-api': ''
				}
			}
		}
	},
	pluginOptions: {
		electronBuilder: {
			preload: 'src/preload.js',
			externals: ["electron-screenshots"],
			builderOptions: {
				// 包名
				appId: 'com.boxim',
				productName: '初界', // 安装包名称
				icon: "public/logo.ico", // 安装包logo
				// 设置安装包文件名格式：IM_Setup_3.11.0.exe
				artifactName: '${productName}_Setup_v${version}.${ext}',
				win: {
					icon: 'public/logo.ico' // Windows图标,大小要求:256x256
				},
				mac: {
					icon: 'public/logo.icns' // MacOS图标,大小要求: 512x512
				},
				// NSIS 安装程序配置
				nsis: {
					oneClick: false, // 禁用一键安装，改为向导模式
					allowToChangeInstallationDirectory: true, // 允许用户修改安装目录
					perMachine: true, // 全用户安装（默认 C:\Program Files），设为 false 则安装到当前用户目录
					allowElevation: true, // 允许请求管理员权限
					createDesktopShortcut: true, // 创建桌面快捷方式
					createStartMenuShortcut: true, // 创建开始菜单快捷方式
					// installerIcon: './public/logo.ico', // 安装程序图标路径
					// uninstallerIcon: './public/logo.ico', // 卸载程序图标路径
					// installerHeaderIcon: './public/logo.ico' // 安装界面头部图标
				},
				// 自动更新配置
				publish: [{
					provider: 'generic',
					url: process.env.UPDATE_SERVER_URL
				}]
			}
		}
	}
}