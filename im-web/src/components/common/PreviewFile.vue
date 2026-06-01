<template>
	<transition name="preview-fade">
		<div class="preview-file" v-if="show" @click.self="close" @keydown.esc="close" tabindex="-1">
			<div class="mask" @click="close"></div>
			<div class="preview-container">
				<div class="iframe-wrapper">
					<iframe :src="previewUrl" frameborder="0"></iframe>
				</div>
				<div class="close-btn" @click="close" :title="$t('common.close')">
					<i class="el-icon-close"></i>
				</div>
			</div>
		</div>
	</transition>
</template>

<script>
export default {
	name: "preview-file",
	data() {
		return {
			show: false,
			url: ''
		}
	},
	mounted() {
		// 监听ESC键
		document.addEventListener('keydown', this.handleKeydown);
	},
	beforeDestroy() {
		document.removeEventListener('keydown', this.handleKeydown);
	},
	methods: {
		open(url) {
			this.show = true;
			this.url = url;
			// 防止背景滚动
			document.body.style.overflow = 'hidden';
		},
		close() {
			this.show = false;
			// 恢复背景滚动
			document.body.style.overflow = '';
		},
		handleKeydown(e) {
			if (e.key === 'Escape' && this.show) {
				this.close();
			}
		}
	},
	computed: {
		previewUrl() {
			// return process.env.VUE_APP_BASE_API + `/preview/preview.html?src=${this.url}`
			return this.configStore.apiConfig.baseUrl + `/preview/preview.html?src=${this.url}`
		}
	}
}
</script>


<style lang="scss">
.preview-file {
	position: fixed;
	width: 100%;
	height: 100%;
	left: 0;
	top: 0;
	bottom: 0;
	right: 0;
	z-index: 9999;
	display: flex;
	align-items: center;
	justify-content: center;

	.mask {
		position: absolute;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		cursor: pointer;
		transition: opacity 0.3s ease;
	}

	.preview-container {
		position: relative;
		width: 90%;
		height: 90%;
		max-width: 1400px;
		max-height: 90vh;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10000;
	}

	.iframe-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
		background: #fff;
		border-radius: 8px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;

		iframe {
			width: 100%;
			height: 100%;
			border: none;
			background: #fff;
		}
	}

	.close-btn {
		position: absolute;
		top: -50px;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		cursor: pointer;
		background: rgba(255, 255, 255, 0.9);
		border-radius: 50%;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
		transition: all 0.3s ease;
		z-index: 10001;

		&:hover {
			background: #fff;
			transform: scale(1.1);
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
		}

		&:active {
			transform: scale(0.95);
		}

		i {
			font-size: 20px;
			color: #333;
			font-weight: bold;
		}
	}
}
</style>
