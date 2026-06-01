<template>
	<div class="qr-login-container">
		<div class="qr-header">
			<div class="qr-title">
				<i class="el-icon-qrcode"></i>
				<span>{{ $t('qrLogin.title') }}</span>
			</div>
			<div class="qr-subtitle">{{ $t('qrLogin.subtitle') }}</div>
		</div>

		<button type="button" class="qr-back-btn" @click="goBack" :title="$t('common.back')">
			<i class="el-icon-back"></i>
		</button>

		<div class="qr-content">
			<!-- 加载状态 -->
			<div v-if="status === 'loading'" class="qr-loading">
				<div class="loading-animation">
					<div class="loading-circle"></div>
					<div class="loading-circle"></div>
					<div class="loading-circle"></div>
				</div>
				<p class="loading-text">{{ $t('qrLogin.generating') }}</p>
			</div>

			<!-- 等待扫码状态 -->
			<div v-else-if="status === 'waiting'" class="qr-waiting">
				<div class="qr-image-container">
					<div class="qr-frame">
						<img :src="qrImage" :alt="$t('qrLogin.title')" class="qr-image" />
						<div class="qr-corners">
							<div class="corner corner-tl"></div>
							<div class="corner corner-tr"></div>
							<div class="corner corner-bl"></div>
							<div class="corner corner-br"></div>
						</div>
					</div>
				</div>
				<div class="qr-info">
					<p class="qr-tip">
						<i class="el-icon-mobile-phone"></i>
						{{ $t('qrLogin.scanTip') }}
					</p>
					<div class="qr-expire">
						<i class="el-icon-time"></i>
						<span>{{ $t('qrLogin.expireTip', { n: expireTime }) }}</span>
					</div>
				</div>
			</div>

			<!-- 已扫码状态 -->
			<div v-else-if="status === 'scanned'" class="qr-scanned">
				<div class="scanned-animation">
					<div class="success-icon">
						<i class="el-icon-check"></i>
					</div>
					<div class="pulse-ring"></div>
				</div>
				<p class="scanned-text">
					<i class="el-icon-mobile-phone"></i>
					{{ $t('qrLogin.scannedTip') }}
				</p>
			</div>

			<!-- 登录成功状态 -->
			<div v-else-if="status === 'success'" class="qr-success">
				<div class="success-animation">
					<div class="success-icon">
						<i class="el-icon-check"></i>
					</div>
				</div>
				<p class="success-text">{{ $t('qrLogin.loginSuccess') }}</p>
			</div>

			<!-- 二维码过期状态 -->
			<div v-else-if="status === 'expired'" class="qr-expired">
				<div class="qr-image-container">
					<div class="qr-frame">
						<img :src="qrImage" :alt="$t('qrLogin.title')" class="qr-image" />
						<div class="qr-corners">
							<div class="corner corner-tl"></div>
							<div class="corner corner-tr"></div>
							<div class="corner corner-bl"></div>
							<div class="corner corner-br"></div>
						</div>
						<!-- 过期遮罩层 -->
						<div class="expired-overlay">
							<div class="expired-content">
								<p class="expired-text">{{ $t('qrLogin.expired') }}</p>
								<div class="refresh-btn" @click="refreshQrCode">
									<i class="el-icon-refresh"></i>
									<span>{{ $t('qrLogin.refresh') }}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="qr-footer">
			<div class="qr-tips">
				<i class="el-icon-info"></i>
				<span>{{ $t('qrLogin.ensureAppLoggedIn') }}</span>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	name: 'QrLogin',
	data() {
		return {
			qrLoginStatus: 'loading',
			qrCode: '',
			qrImage: '',
			expireTime: 300,
			pollTimer: null,
			expireTimer: null
		};
	},
	mounted() {
		this.generateQrCode();
	},
	beforeDestroy() {
		this.stopTimers();
	},
	methods: {
		generateQrCode() {
			this.qrLoginStatus = 'loading';
			this.$http({
				url: "/qrLogin/generate",
				method: 'post'
			}).then((data) => {
				this.qrCode = data.qrCode;
				this.qrImage = data.qrImage;
				this.expireTime = data.expiresIn;
				this.qrLoginStatus = 'waiting';
				this.startPolling();
				this.startExpireTimer();
			}).catch(() => {
				this.$message.error(this.$t('qrLogin.generateFailed'));
				this.$emit('back');
			});
		},
		startPolling() {
			this.pollTimer = setInterval(() => {
				this.checkQrLoginStatus();
			}, 2000);
		},
		startExpireTimer() {
			this.expireTimer = setInterval(() => {
				this.expireTime--;
				if (this.expireTime <= 0) {
					this.qrLoginStatus = 'expired';
					this.stopTimers();
				}
			}, 1000);
		},
		checkQrLoginStatus() {
			this.$http({
				url: `/qrLogin/status/${this.qrCode}`,
				method: 'get'
			}).then((data) => {
				if (data.status === 'SCANNED') {
					this.qrLoginStatus = 'scanned';
				} else if (data.status === 'CONFIRMED') {
					this.qrLoginStatus = 'success';
					this.stopTimers();
					sessionStorage.setItem("accessToken", data.loginInfo.accessToken);
					sessionStorage.setItem("refreshToken", data.loginInfo.refreshToken);
					this.$message.success(this.$t('qrLogin.loginSuccess'));
					this.$router.push("/home/chat");
				} else if (data.status === 'EXPIRED') {
					this.qrLoginStatus = 'expired';
					this.stopTimers();
				}
			}).catch((error) => {
				console.error("检查登录状态失败:", error);
			});
		},
		refreshQrCode() {
			this.qrLoginStatus = 'loading';
			this.generateQrCode();
		},
		stopTimers() {
			if (this.pollTimer) {
				clearInterval(this.pollTimer);
				this.pollTimer = null;
			}
			if (this.expireTimer) {
				clearInterval(this.expireTimer);
				this.expireTimer = null;
			}
		},
		goBack() {
			this.stopTimers();
			this.$emit('back');
		}
	},
	computed: {
		status() {
			return this.qrLoginStatus;
		}
	}
}
</script>

<style scoped lang="scss">
$navy: #1a2744;

.qr-login-container {
	position: relative;
	width: 380px;
	height: 460px;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	padding: 32px 36px;
	background: rgba(255, 255, 255, 0.88);
	backdrop-filter: blur(24px);
	-webkit-backdrop-filter: blur(24px);
	border-radius: 28px;
	border: 1px solid rgba(255, 255, 255, 0.95);
	box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04);
	overflow: visible;
}

.qr-header {
	flex-shrink: 0;
	text-align: center;
	margin-bottom: 16px;
}

.qr-title {
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 26px;
	font-weight: 700;
	color: $navy;
	margin: 0 0 6px;
	letter-spacing: 0.5px;

	i {
		margin-right: 8px;
		font-size: 24px;
		color: var(--im-color-primary);
	}
}

.qr-subtitle {
	margin: 0;
	font-size: var(--im-font-size);
	color: var(--im-text-color-light);
	line-height: 1.5;
}

.qr-back-btn {
	position: absolute;
	bottom: 20px;
	left: 20px;
	width: 40px;
	height: 40px;
	padding: 0;
	border: none;
	border-radius: 50%;
	background: rgba(0, 0, 0, 0.06);
	color: var(--im-color-primary);
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: background 0.2s ease, transform 0.2s ease;
	z-index: 10;

	&:hover {
		background: var(--im-color-primary-light-9);
		transform: translateY(-1px);
	}

	i {
		font-size: 18px;
	}
}

.qr-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	text-align: center;
	min-height: 0;
}

.qr-loading {
	.loading-animation {
		display: flex;
		justify-content: center;
		align-items: center;
		margin-bottom: 16px;

		.loading-circle {
			width: 10px;
			height: 10px;
			border-radius: 50%;
			background: var(--im-color-primary);
			margin: 0 4px;
			animation: loading-bounce 1.4s ease-in-out infinite both;

			&:nth-child(1) { animation-delay: -0.32s; }
			&:nth-child(2) { animation-delay: -0.16s; }
			&:nth-child(3) { animation-delay: 0s; }
		}
	}

	.loading-text {
		color: var(--im-text-color-light);
		font-size: var(--im-font-size);
	}
}

.qr-frame {
	position: relative;
	display: inline-block;
	padding: 12px;
	background: #fff;
	border-radius: 16px;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.qr-image {
	width: 180px;
	height: 180px;
	border-radius: 12px;
	display: block;
}

.qr-corners {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	pointer-events: none;

	.corner {
		position: absolute;
		width: 18px;
		height: 18px;
		border: 2px solid var(--im-color-primary);

		&.corner-tl { top: 0; left: 0; border-right: none; border-bottom: none; border-radius: 12px 0 0 0; }
		&.corner-tr { top: 0; right: 0; border-left: none; border-bottom: none; border-radius: 0 12px 0 0; }
		&.corner-bl { bottom: 0; left: 0; border-right: none; border-top: none; border-radius: 0 0 0 12px; }
		&.corner-br { bottom: 0; right: 0; border-left: none; border-top: none; border-radius: 0 0 12px 0; }
	}
}

.qr-waiting .qr-image-container {
	margin-bottom: 16px;
}

.qr-info {
	.qr-tip {
		font-size: var(--im-font-size);
		color: $navy;
		margin: 0 0 8px;
		display: flex;
		align-items: center;
		justify-content: center;

		i {
			margin-right: 6px;
			color: var(--im-color-primary);
			font-size: 16px;
		}
	}

	.qr-expire {
		font-size: var(--im-font-size-small);
		color: var(--im-text-color-light);
		display: flex;
		align-items: center;
		justify-content: center;

		i {
			margin-right: 4px;
			color: var(--im-color-warning);
		}
	}
}

.success-icon {
	width: 48px;
	height: 48px;
	background: var(--im-color-primary);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #fff;
	font-size: 22px;
}

.qr-scanned {
	.scanned-animation {
		position: relative;
		margin-bottom: 24px;
		display: flex;
		align-items: center;
		justify-content: center;

		.pulse-ring {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: 56px;
			height: 56px;
			border: 2px solid var(--im-color-primary-light-2);
			border-radius: 50%;
			animation: pulse 2s infinite;
		}
	}

	.scanned-text {
		color: var(--im-color-primary);
		font-size: var(--im-font-size);
		display: flex;
		align-items: center;
		justify-content: center;

		i { margin-right: 6px; }
	}
}

.qr-success {
	.success-animation {
		margin-bottom: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.success-text {
		color: var(--im-color-primary);
		font-size: var(--im-font-size-large);
		font-weight: 600;
	}
}

.qr-expired {
	.qr-image-container {
		margin-bottom: 16px;
	}

	.qr-frame .qr-image {
		filter: grayscale(0.3);
		opacity: 0.6;
	}

	.qr-corners .corner {
		border-color: rgba(245, 108, 108, 0.6);
	}

	.expired-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.65);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.expired-content {
		text-align: center;

		.expired-text {
			color: #fff;
			font-size: var(--im-font-size-small);
			margin-bottom: 12px;
			font-weight: 500;
		}

		.refresh-btn {
			display: inline-flex;
			align-items: center;
			padding: 8px 18px;
			background: #fff;
			color: var(--im-color-primary);
			border-radius: 50px;
			border: none;
			cursor: pointer;
			font-size: var(--im-font-size-small);
			font-weight: 500;
			transition: transform 0.2s ease, box-shadow 0.2s ease;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

			&:hover {
				transform: translateY(-1px);
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
			}

			i { margin-right: 6px; }
		}
	}
}

.qr-footer {
	flex-shrink: 0;
	margin-top: 20px;
	text-align: center;
}

.qr-tips {
	font-size: var(--im-font-size-smaller);
	color: var(--im-text-color-light);
	display: flex;
	align-items: center;
	justify-content: center;

	i {
		margin-right: 4px;
		color: var(--im-color-primary);
		font-size: 12px;
	}
}

@keyframes loading-bounce {

	0%,
	80%,
	100% {
		transform: scale(0);
	}

	40% {
		transform: scale(1);
	}
}

@keyframes pulse {
	0% {
		transform: translate(-50%, -50%) scale(1);
		opacity: 1;
	}
	100% {
		transform: translate(-50%, -50%) scale(1.5);
		opacity: 0;
	}
}
</style>
