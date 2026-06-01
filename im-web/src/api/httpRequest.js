import axios from 'axios'
import router from '../router';
import { Message } from 'element-ui'
import i18n from '../i18n'

import useConfigStore from '../store/configStore.js';

const http = axios.create({
	baseURL: process.env.VUE_APP_BASE_API,
	timeout: 1000 * 30
})

/**
 * 请求拦截
 */
http.interceptors.request.use(config => {

	// 【核心逻辑】
    // 每次发送请求前，都从 Pinia store 中获取最新的地址
    const configStore = useConfigStore();
	// console.log('@@@',config,configStore.apiConfig)
    
	if(configStore.apiConfig.baseUrl && config.url.indexOf('/allFixed') == -1){
		config.baseURL = configStore.apiConfig.baseUrl
	}else{
		config.baseURL = process.env.VUE_APP_BASE_API;
		const newUrl =  config.url.replace(new RegExp('^/allFixed'), '');
		config.url = newUrl;
	}

	let accessToken = sessionStorage.getItem("accessToken");
	if (accessToken) {
		config.headers.accessToken = encodeURIComponent(accessToken);
	}

	// 国际化：后端根据此 header 返回对应语言的消息
	const locale = i18n.locale;
	config.headers['Accept-Language'] = locale;
	config.headers['X-Locale'] = locale;
	return config
}, error => {
	return Promise.reject(error)
})

/**
 * 响应拦截
 */
http.interceptors.response.use(async response => {
	if (response.data.code == 200) {
		return response.data.data;
	} else if (response.data.code == 400) {
		return exit();
	} else if (response.data.code == 401) {
		console.log("token失效，尝试重新获取")
		let refreshToken = sessionStorage.getItem("refreshToken");
		if (!refreshToken) {
			return exit()
		}
		// 发送请求, 进行刷新token操作, 获取新的token
		const data = await http({
			method: 'put',
			url: '/refreshToken',
			headers: {
				refreshToken: refreshToken
			}
		}).catch(() => {
			exit();
		})
		// 保存token
		sessionStorage.setItem("accessToken", data.accessToken);
		sessionStorage.setItem("refreshToken", data.refreshToken);
		// 重新发送刚才的请求
		return http(response.config)
	} else {
		Message({
			message: response.data.message,
			type: 'error',
			duration: 1500,
			customClass: 'element-error-message-zindex'
		})
		return Promise.reject(response.data)
	}
}, error => {
	switch (error.response.status) {
		case 400:
			Message({
				message: error.response.data,
				type: 'error',
				duration: 1500,
				customClass: 'element-error-message-zindex'
			})
			break
		case 401:
			exit();
			break
		case 405:
			Message({
				message: i18n.t('http.methodError'),
				type: 'error',
				duration: 1500,
				customClass: 'element-error-message-zindex'
			})
			break
		case 404:
		case 500:
			Message({
				message: i18n.t('http.serverError'),
				type: 'error',
				duration: 1500,
				customClass: 'element-error-message-zindex'
			})
			break
		case 501:
			Message({
				message: i18n.t('http.notSupport'),
				type: 'error',
				duration: 1500,
				customClass: 'element-error-message-zindex'
			})
			break
	}

	return Promise.reject(error)
})

const exit = () => {
	router.app.$eventBus.$emit("exit")
}


export default http
