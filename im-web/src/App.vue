<template>
	<div id="app">
		<electron-menu></electron-menu>
		<router-view></router-view>
	</div>
</template>

<script>
	import ElectronMenu from './components/common/ElectronMenu.vue';
	import useConfigStore from './store/configStore';
	import {
		setLocale
	} from '@/i18n';

	export default {
		name: 'App',
		components: {
			ElectronMenu
		},
		mounted() {
			if (localStorage.getItem('isInit') != 'yes') {
				localStorage.removeItem('isInit');
				localStorage.removeItem('serverCode');
				localStorage.removeItem("baseUrl");
				localStorage.removeItem("wsUrl");
			} 
			// else {
			// 	if (process.env.VUE_APP_BASE_API != localStorage.getItem("baseUrl")) {
			// 		localStorage.removeItem('isInit');
			// 		localStorage.removeItem('serverCode');
			// 		localStorage.removeItem("baseUrl");
			// 		localStorage.removeItem("wsUrl");
			// 	}
			// }
			
			if (window.electronAPI) {
				const configStore = useConfigStore();
				configStore.setElectronMode(true)
				window.electronAPI.invoke('isFullScreen').then(fullScreen => {
					configStore.setFullScreen(fullScreen);
				})
				// 客户端语言优先级：客户手动设置 > 系统语言 > 默认中文
				const locale = localStorage.getItem('im-locale');
				const supportLocales = Object.keys(this.$i18n.messages);
				if (supportLocales.includes(locale)) {
					window.electronAPI.sendEvent('setLocale', locale);
				} else {
					window.electronAPI.invoke('getAppLocale').then(appLocale => {
						console.log("appLocale:", appLocale)
						if (supportLocales.includes(appLocale)) {
							setLocale(appLocale)
						}
					})
				}
			}
		}
	}
</script>

<style lang="scss">
	#app {
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		position: absolute;
		height: 100%;
		width: 100%;
		color: var(--im-text-color);
		font-family: var(--im-font-family);
	}
</style>