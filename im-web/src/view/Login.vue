<template>
	<div class="login-view" :class="configStore.electronMode ? 'electron' : ''">
		<AuthBackground v-if="!configStore.electronMode" />
		<div class="content">
			<!-- 密码登录表单 -->
			<el-form v-if="loginMode === 'password'" class="form" :model="loginForm" status-icon :rules="rules"
				ref="loginForm" @keyup.enter.native="submitForm()" v-loading="loading"
				:element-loading-text="$t('login.logging')">
				<div class="form-header">
					<h1 class="form-welcome">{{ $t('login.welcome') }}</h1>
					<p class="form-welcome-subtitle">{{ $t('login.welcomeSubtitle') }}</p>
				</div>
				<div class="form-body">
					<el-form-item prop="terminal" v-show="false">
						<el-input type="terminal" v-model="loginForm.terminal"></el-input>
					</el-form-item>
					<el-form-item prop="code" v-if="showCode">
						<el-input type="code" v-model="loginForm.serverCode" :placeholder="$t('register.serverCode')"
							prefix-icon="el-icon-cpu" @change="codeChange" :readonly="codeFlg"></el-input>
						<div class="h-change" v-if="codeFlg" @click="hCodeChange">更换</div>
					</el-form-item>
					<el-form-item prop="userName">
						<el-input type="userName" v-model="loginForm.userName" :placeholder="loginNamePlaceholder"
							prefix-icon="el-icon-user"></el-input>
					</el-form-item>
					<el-form-item prop="password">
						<el-input type="password" v-model="loginForm.password" :placeholder="$t('login.password')"
							prefix-icon="el-icon-lock"></el-input>
					</el-form-item>
					<el-form-item>
						<div class="nav-tool-bar">
							<el-checkbox v-model="isAutoLogin">{{ $t('login.autoLogin') }}</el-checkbox>
							<router-link v-if="containsPhoneMode || containsEmailMode" class="link"
								to="/password/reset">{{
									$t('login.forgotPwd') }}</router-link>
						</div>
					</el-form-item>
					<el-button class="submit-btn" :class="{ 'disabled': !codeFlg }" type="primary" :disabled="!codeFlg"
						@click="submitForm()">{{
							$t('login.login') }}</el-button>
				</div>
				<!-- <span style="font-size: 12px;word-break: break-all;">{{JSON.stringify(testInfo)}}</span> -->
				<div class="footer-links">
					<span class="link qr-link" @click="toggleLoginMode">
						<i class="iconfont icon-scan"></i>{{ $t('login.qrLogin') }}
					</span>
					<router-link class="link" to="/register">{{ $t('login.noAccount') }}</router-link>
				</div>
			</el-form>
			<!-- 扫码登录界面 -->
			<QrLogin v-if="loginMode === 'qr'" @back="goBackToPassword" />
		</div>
		<!-- 备案信息 -->
		<!-- <icp></icp> -->
		<captcha-image ref="captchaRef"></captcha-image>
	</div>

</template>

<script>
	import Icp from '../components/common/Icp.vue'
	import AuthBackground from '../components/common/AuthBackground.vue'
	import CaptchaImage from '../components/common/CaptchaImage.vue'
	import QrLogin from '../components/login/QrLogin.vue'
	import axios from 'axios'

	export default {
		name: "login",
		components: {
			Icp,
			AuthBackground,
			CaptchaImage,
			QrLogin
		},
		data() {
			var checkUsername = (rule, value, callback) => {
				if (!value) {
					return callback(new Error(this.$t('login.inputUsername')));
				}
				callback();
			};
			var checkPassword = (rule, value, callback) => {
				if (value === '') {
					callback(new Error(this.$t('login.inputPassword')));
				}
				callback();
			};
			return {
				codeFlg: false,
				loading: false,
				isAutoLogin: true,
				loginForm: {
					terminal: this.$enums.TERMINAL_TYPE.WEB,
					userName: '',
					password: '',
					serverCode: ''
				},
				rules: {
					userName: [{
						validator: checkUsername,
						trigger: 'blur'
					}],
					password: [{
						validator: checkPassword,
						trigger: 'blur'
					}]
				},
				loginMode: 'password',
				testInfo: {}
			};
		},
		methods: {
			hCodeChange() {
				this.codeFlg = false;
				this.$set(this.loginForm, 'serverCode', '');
				this.configStore.setApiConfig({
					serverCode: '',
					baseUrl: process.env.VUE_APP_BASE_API,
					wsUrl: ''
				});
			},
			codeChange(value) {
				this.$set(this.testInfo, 'VUE_APP_ENV', process.env.VUE_APP_ENV)
				this.$set(this.testInfo, 'NODE_ENV', process.env.NODE_ENV)
				this.$http({
					url: "/im/service/getServerCode?code=" + value,
					method: 'get'
				}).then((res) => {
					if (!this.$isBlank(res)) {
						this.codeFlg = true;
						let baseUrl = '';
						let wsUrl = '';
						if (process.env.VUE_APP_ENV == 'production') {
							baseUrl = `https://${res.domainName}/server-api`;
							wsUrl = `wss://${res.domainName}/im`;
						} else {
							baseUrl = '/new-api';
							wsUrl = process.env.VUE_APP_WS_URL;
						}

						this.$set(this.testInfo, 'baseUrl', baseUrl)
						this.$set(this.testInfo, 'wsUrl', wsUrl)

						this.configStore.setApiConfig({
							serverCode: value,
							baseUrl,
							wsUrl
						});
						localStorage.setItem('isInit', 'yes');
						localStorage.setItem('serverCode', value);
						localStorage.setItem("baseUrl", baseUrl);
						localStorage.setItem("wsUrl", wsUrl);
					} else {
						this.$message.warning(this.$t('login.codeWarning'));
					}

				})
			},
			submitForm() {
				this.$refs.loginForm.validate((valid) => {
					if (valid) {
						this.loading = true;
						this.$http({
							url: "/login",
							method: 'post',
							data: this.loginForm
						}).then((data) => {
							// this.$http({
							// 		url: "/allFixed/im/service/getAllBannedWord",
							// 		method: "GET",
							// 	})
							// 	.then((data) => {
							// 		console.log(data)
							// 		if(data.length>0){
							// 			localStorage.setItem('sensitiveWords', JSON.stringify(data));
							// 		}
							// 	})

							let apiUrl = '';
							if (process.env.VUE_APP_ENV == 'production') {
								apiUrl = process.env.VUE_APP_DEFAULT_BASE_API +
									'/im/service/getAllBannedWord';
							} else {
								apiUrl = '/admin-api/im/service/getAllBannedWord';
							}

							axios.get(apiUrl)
								.then((res) => {
									if (res.data.length > 0) {
										localStorage.setItem('sensitiveWords', JSON.stringify(res
											.data));
									}
								})


							localStorage.setItem('isAutoLogin', this.isAutoLogin);
							localStorage.setItem('username', this.loginForm.userName);
							localStorage.setItem('password', this.loginForm.password);
							sessionStorage.setItem("accessToken", data.accessToken);
							sessionStorage.setItem("refreshToken", data.refreshToken);
							this.$message.success(this.$t('login.loginSuccess'));
							this.$router.push("/home/chat");
						}).finally(() => {
							this.loading = false
						})
					}
				});
			},
			toggleLoginMode() {
				if (this.loginMode === 'password') {
					this.loginMode = 'qr';
				} else {
					this.loginMode = 'password';
				}
			},
			goBackToPassword() {
				this.loginMode = 'password';
			}
		},
		mounted() {
			const serverCode = localStorage.getItem("serverCode");
			if (!this.$isBlank(serverCode)) {
				this.$set(this.loginForm, 'serverCode', serverCode);
				this.codeFlg = true;
			}

			// 账号密码
			this.loginForm.userName = localStorage.getItem("username");
			this.loginForm.password = localStorage.getItem("password");
			// 加载配置
			this.configStore.loadConfig();
			// electron 窗口大小（frame:false，即内容区尺寸；表单 380×460）
			window.electronAPI && window.electronAPI.sendEvent('resize', {
				width: 380 + 40,
				height: 460 + 60,
				maximizable: false
			})
			// 自动登录
			if (localStorage.getItem("isAutoLogin") != null) {
				this.isAutoLogin = JSON.parse(localStorage.getItem("isAutoLogin"));
				if (this.isAutoLogin) {
					this.submitForm();
				}
			}
		},
		computed: {
			showCode() {
				const code = localStorage.getItem('code-config');
				return !this.$isBlank(code) ? false : true;
			},
			loginNamePlaceholder() {
				let mode = this.configStore.registration.mode;
				let strText = this.$t('login.userName');
				if (mode.includes("phone")) {
					strText += "/" + this.$t('register.phone')
				}
				if (mode.includes("email")) {
					strText += "/" + this.$t('register.email')
				}
				return strText;
			},
			containsPhoneMode() {
				return this.modes.includes("phone")
			},
			containsEmailMode() {
				return this.modes.includes("email")
			},
			modes() {
				return this.configStore.registration.mode || []
			}
		}
	}
</script>

<style scoped lang="scss">
	.login-view {
		position: relative;
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		display: flex;
		background: #fff;
		overflow: hidden;

		.content {
			position: relative;
			display: flex;
			justify-content: center;
			align-items: center;
			width: 100%;
			z-index: 1;
		}

		.form {
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

		&.electron .form {
			border-radius: 0;
			box-shadow: none;
			border: none;
		}

		.form-header {
			flex-shrink: 0;
			text-align: left;
		}

		.form-welcome {
			margin: 0 0 6px;
			font-size: 26px;
			font-weight: 700;
			letter-spacing: 0.5px;
			line-height: 1.3;
			color: var(--im-color-primary);
		}

		.form-welcome-subtitle {
			margin: 0;
			font-size: var(--im-font-size);
			color: var(--im-text-color-light);
			line-height: 1.5;
		}

		.form-body {
			flex: 1;
			display: flex;
			flex-direction: column;
			justify-content: center;
			min-height: 0;
		}



		.form-body ::v-deep .el-form-item {
			margin-bottom: 20px;
			position: relative;

			.h-change {
				cursor: pointer;
				position: absolute;
				right: 20px;
				top: 6px;
				color: var(--im-color-primary);
				font-size: var(--im-font-size-large);
				letter-spacing: 0.02rem;
			}

			.el-input__inner {
				height: 52px;
				border-radius: 50px;
				border: 1px solid rgba(0, 0, 0, 0.06);
				background: #fff;
				transition: border-color 0.2s ease, box-shadow 0.2s ease;
				padding-left: 48px;
				font-size: var(--im-font-size-large);

				&:focus {
					border-color: rgba(0, 0, 0, 0.1);
					box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.8);
				}

				&::placeholder {
					color: var(--im-text-color-lighter);
					font-size: var(--im-font-size);
				}
			}

			.el-input__prefix {
				left: 18px;
			}

			.el-input__prefix .el-input__icon {
				color: var(--im-color-primary-light-3);
				font-size: 18px;
			}

			.el-input__suffix {
				display: none;
			}
		}

		.nav-tool-bar {
			display: flex;
			justify-content: space-between;
			align-items: center;
			width: 100%;
		}

		::v-deep .nav-tool-bar .el-checkbox__label {
			color: var(--im-text-color-light);
			font-size: var(--im-font-size-small);
		}

		.link {
			text-decoration: none;
			color: var(--im-text-color-light);
			font-size: var(--im-font-size-small);
			transition: color 0.2s ease;

			&:hover {
				color: var(--im-color-primary);
			}
		}

		.qr-link {
			cursor: pointer;
			display: inline-flex;
			align-items: center;

			i {
				margin-right: 6px;
				font-size: 14px;
			}
		}

		.submit-btn {
			width: 100%;
			height: 52px;
			margin-top: 20px;
			border-radius: 50px;
			border: none;
			color: #fff;
			font-size: var(--im-font-size-larger);
			font-weight: 600;
			letter-spacing: 2px;
			transition: transform 0.2s ease, box-shadow 0.2s ease;

			&:hover {
				transform: translateY(-1px);
			}

			&.disabled {
				background: #D2D2D2 !important;
			}
		}

		.footer-links {
			flex-shrink: 0;
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-top: 20px;
			padding: 0 4px;
		}
	}
</style>