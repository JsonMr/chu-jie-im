import {
	defineStore
} from "pinia";
import http from "../api/httpRequest.js";

import axios from "axios";

export default defineStore("configStore", {
	state: () => {
		return {
			appInit: false, // 应用是否完成初始化
			electronMode: false, // 当前是否以客户端模式运行
			fullScreen: true, // 当前是否全屏
			registration: {
				mode: [],
			},
			webrtc: {},
			apiConfig: {
				serverCode: localStorage.getItem("serverCode"),
				baseUrl: localStorage.getItem("baseUrl"),
				wsUrl: localStorage.getItem("wsUrl"),
			},
		};
	},
	actions: {
		setApiConfig(config, field) {
			if (field) {
				this.apiConfig[field] = config;
				return;
			}
			this.apiConfig = config;
		},
		setConfig(config) {
			this.webrtc = config.webrtc;
			this.registration = config.registration;
		},
		setElectronMode(mode) {
			this.electronMode = mode;
		},
		setFullScreen(fullScreen) {
			this.fullScreen = fullScreen;
		},
		setAppInit(appInit) {
			this.appInit = appInit;
		},
		switchFullScreen() {
			this.fullScreen = !this.fullScreen;
		},
		loadConfig() {
			return new Promise((resolve, reject) => {
				http({
						url: "/allFixed/systems/config",
						method: "GET",
					})
					.then((config) => {
						console.log("系统配置", config);
						this.setConfig(config);
						resolve();
					})
					.catch((res) => {
						reject(res);
					});


				// if (process.env.VUE_APP_ENV == "production") {
				//   axios
				//     .get(process.env.VUE_APP_DEFAULT_BASE_API + "/systems/config")
				//     .then((config) => {
				//       console.log("系统配置", config);
				//       this.setConfig(config.data.data);
				//       resolve();
				//     })
				//     .catch((res) => {
				//       reject(res);
				//     });
				// } else {
				//   http({
				//     url: "/allFixed/systems/config",
				//     method: "GET",
				//   })
				//     .then((config) => {
				//       console.log("系统配置", config);
				//       this.setConfig(config);
				//       resolve();
				//     })
				//     .catch((res) => {
				//       reject(res);
				//     });
				// }
			});
		},
	},
});