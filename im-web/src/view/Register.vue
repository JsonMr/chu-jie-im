<template>
	<el-container class="register" :class="configStore.electronMode ? 'electron' : ''">
		<AuthBackground v-if="!configStore.electronMode" />
		<div class="content">
			<el-form :model="dataForm" status-icon :rules="rules" ref="registerForm" class="form">
				<div class="form-header">
					<h1 class="form-title">{{ modeNameMap[dataForm.mode] }}</h1>
					<p class="form-subtitle">{{ $t('register.subtitle') }}</p>
				</div>
				<div class="form-body">
					<el-form-item prop="code">
						<el-input type="code" v-model="dataForm.serverCode" :placeholder="$t('register.serverCode')"
							prefix-icon="el-icon-cpu" @change="codeChange"></el-input>
					</el-form-item>
					<el-form-item v-if="dataForm.mode == 'phone'" prop="phone">
						<el-input v-model="dataForm.phone" :placeholder="$t('register.phone')"
							prefix-icon="el-icon-mobile-phone" maxlength="20"></el-input>
					</el-form-item>
					<el-form-item v-show="dataForm.mode == 'phone'" prop="code">
						<div class="send-code-bar">
							<el-input class="input" v-model="dataForm.code" :placeholder="$t('register.smsCode')"
								maxlength="6" prefix-icon="el-icon-key"></el-input>
							<div class="lock-text" v-if="phoneLockTime > 0">{{ $t('register.resendAfter', {
								n:
									phoneLockTime
							}) }}</div>
							<el-button v-else class="code-btn" type="primary" plain size="mini"
								@click="onSendSmsCode">{{ $t('register.getCode') }}</el-button>
						</div>
					</el-form-item>
					<el-form-item v-if="dataForm.mode == 'email'" prop="email">
						<el-input v-model="dataForm.email" :placeholder="$t('register.email')"
							prefix-icon="el-icon-message" maxlength="20"></el-input>
					</el-form-item>
					<el-form-item v-show="dataForm.mode == 'email'" prop="code">
						<div class="send-code-bar">
							<el-input class="input" v-model="dataForm.code" :placeholder="$t('register.emailCode')"
								maxlength="6" prefix-icon="el-icon-key"></el-input>
							<div class="lock-text" v-if="emailLockTime > 0">{{ $t('register.resendAfter', {
								n:
									emailLockTime
							}) }}</div>
							<el-button v-else class="code-btn" type="primary" plain @click="onSendMailCode">{{
								$t('register.getCode') }}</el-button>
						</div>
					</el-form-item>
					<el-form-item prop="userName">
						<el-input v-model="dataForm.userName" maxlength="20" :placeholder="$t('register.userName')"
							show-word-limit prefix-icon="el-icon-user"></el-input>
					</el-form-item>
					<el-form-item prop="password">
						<el-input :type="isShowPwd ? 'text' : 'password'" v-model="dataForm.password" maxlength="20"
							:placeholder="$t('register.password')" prefix-icon="el-icon-lock">
							<template #suffix>
								<i :class="isShowPwd ? 'icon-pwd-show' : 'icon-pwd-hide'" @click="switchPassword"
									class="iconfont password-switch-icon"></i>
							</template>
						</el-input>
					</el-form-item>
					<el-form-item prop="confirmPassword">
						<el-input :type="isShowConfirmPwd ? 'text' : 'password'" v-model="dataForm.confirmPassword"
							maxlength="20" :placeholder="$t('register.confirmPassword')" prefix-icon="el-icon-lock">
							<template #suffix>
								<i :class="isShowConfirmPwd ? 'icon-pwd-show' : 'icon-pwd-hide'"
									@click="switchConfirmPassword" class="iconfont password-switch-icon"></i>
							</template>
						</el-input>
					</el-form-item>
					<el-form-item>
						<el-button class="submit-btn" :class="{ 'disabled': !codeFlg }" type="primary" :disabled="!codeFlg" @click="submitForm()">{{ $t('register.register')
						}}</el-button>
					</el-form-item>
				</div>
				<div class="footer-links">
					<router-link class="link" to="/login">{{ $t('register.hasAccount') }}</router-link>
				</div>
			</el-form>
			<div class="other-mode" v-if="config.mode.length>1">
				<div class="other-mode-divider" role="separator">
					<span class="divider-line" aria-hidden="true"></span>
					<span class="divider-text">{{ $t('register.otherMode') }}</span>
					<span class="divider-line" aria-hidden="true"></span>
				</div>
				<div class="other-mode-btns">
					<button v-for="(mode) in config.mode" :key="mode" type="button" class="reg-mode"
						:class="{ active: mode === dataForm.mode }" @click="switchMode(mode)">
						<span class="icon iconfont" :class="'icon-' + mode"></span>
						<span class="mode-text">{{ modeNameMap[mode] }}</span>
					</button>
				</div>
			</div>
		</div>
		<icp></icp>
		<captcha-image ref="captchaRef"></captcha-image>
	</el-container>
</template>

<script>
import AuthBackground from '../components/common/AuthBackground.vue'
import CaptchaImage from '../components/common/CaptchaImage.vue'
import Icp from '../components/common/Icp.vue'
export default {
	name: "register",
	components: {
		AuthBackground,
		CaptchaImage,
		Icp
	},
	data() {
		var checkPhone = (rule, value, callback) => {
			if (!value) {
				return callback(new Error(this.$t('register.inputPhone')));
			}
			const regex = /^1[3-9]\d{9}$/;
			if (!regex.test(value)) {
				return callback(new Error(this.$t('register.phoneFormatError')));
			}
			callback();
		};
		var checkEmail = (rule, value, callback) => {
			if (!value) {
				return callback(new Error(this.$t('register.inputEmail')));
			}
			const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
			if (!regex.test(value)) {
				return callback(new Error(this.$t('register.emailFormatError')));
			}
			callback();
		};
		var checkUserName = (rule, value, callback) => {
			if (!value) {
				return callback(new Error(this.$t('register.inputUserName')));
			}
			callback();
		};
		var checkPassword = (rule, value, callback) => {
			if (value === '') {
				return callback(new Error(this.$t('register.inputPassword')));
			}
			callback();
		};
		var checkConfirmPassword = (rule, value, callback) => {
			if (value === '') {
				return callback(new Error(this.$t('register.inputConfirmPassword')));
			}
			if (value != this.dataForm.password) {
				return callback(new Error(this.$t('register.passwordMismatch')));
			}
			callback();
		};
		return {
			codeFlg: false,
			dataForm: {
				phone: '',
				email: '',
				code: '',
				mode: 'username',
				userName: '',
				password: '',
				confirmPassword: ''
			},
			// 密码显示状态
			isShowPwd: false,
			isShowConfirmPwd: false,
			rules: {
				phone: [{
					validator: checkPhone,
					trigger: 'submit'
				}],
				email: [{
					validator: checkEmail,
					trigger: 'submit'
				}],
				userName: [{
					validator: checkUserName,
					trigger: 'submit'
				}],
				password: [{
					validator: checkPassword,
					trigger: 'submit'
				}],
				confirmPassword: [{
					validator: checkConfirmPassword,
					trigger: 'submit'
				}]
			},
			showCaptchaImage: false,
			phoneLockTime: 0,
			phoneLockTimer: null,
			emailLockTime: 0,
			emailLockTimer: null
		};
	},
	methods: {
		codeChange(value) {
			this.$http({
				url: "/allFixed/im/service/getServerCode?code=" + value,
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
					this.configStore.setApiConfig({ serverCode: value, baseUrl, wsUrl });
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
			this.$refs.registerForm.validate((valid) => {
				if (valid) {
					this.$http({
						url: "/register",
						method: 'post',
						data: this.dataForm
					}).then(() => {
						// 注册成功后自动登录
						this.autoLogin();
					})
				}
			});
		},
		// 自动登录
		autoLogin() {
			// 根据注册模式确定登录用户名
			let loginUserName = '';
			if (this.dataForm.mode === 'phone') {
				loginUserName = this.dataForm.phone;
			} else if (this.dataForm.mode === 'email') {
				loginUserName = this.dataForm.email;
			} else {
				loginUserName = this.dataForm.userName;
			}

			// 调用登录接口
			this.$http({
				url: "/login",
				method: 'post',
				data: {
					terminal: this.$enums.TERMINAL_TYPE.WEB,
					userName: loginUserName,
					password: this.dataForm.password
				}
			}).then((data) => {
				// 保存登录信息
				localStorage.setItem('isAutoLogin', true);
				localStorage.setItem('username', loginUserName);
				localStorage.setItem('password', this.dataForm.password);
				sessionStorage.setItem("accessToken", data.accessToken);
				sessionStorage.setItem("refreshToken", data.refreshToken);
				this.$message.success(this.$t('register.registerSuccess', { name: process.env.VUE_APP_NAME }));
				// 跳转到主页
				this.$router.push("/home/chat");
			})
		},
		onSendSmsCode() {
			this.$refs.registerForm.validateField('phone', (valid) => {
				if (valid == '') {
					// 发短信前先验证验证码，防止盗刷
					this.$refs.captchaRef.open((id, code) => {
						// 60s内不允许再次发送
						this.phoneLockTime = 60;
						this.phoneLockTimer && clearInterval(this.phoneLockTimer);
						this.phoneLockTimer = setInterval(() => {
							this.phoneLockTime -= 1;
							if (this.phoneLockTime <= 0) {
								this.phoneLockTimer && clearInterval(this.phoneLockTimer);
							}
						}, 1000)
						// 发送短信
						let data = {
							phone: this.dataForm.phone,
							id: id,
							code: code
						}
						this.$http({
							url: "/captcha/sms/code",
							method: 'post',
							data: data
						}).then(() => {
							this.$message.success(this.$t('register.smsSent'))
						})
					});
				}
			})
		},
		onSendMailCode() {
			this.$refs.registerForm.validateField('email', (valid) => {
				if (valid == '') {
					// 60s内不允许再次发送
					this.emailLockTime = 60;
					this.emailLockTimer && clearInterval(this.emailLockTimer);
					this.emailLockTimer = setInterval(() => {
						this.emailLockTime -= 1;
						if (this.emailLockTime <= 0) {
							this.emailLockTimer && clearInterval(this.emailLockTimer);
						}
					}, 1000)
					// 发送短信
					let data = {
						email: this.dataForm.email,
					}
					this.$http({
						url: "/captcha/mail/code",
						method: 'post',
						data: data
					}).then(() => {
						this.$message.success(this.$t('register.emailSent'))
					})

				}
			})
		},
		switchMode(mode) {
			this.dataForm.mode = mode;
			this.$refs.registerForm.resetFields();
		},
		// 切换密码显示状态
		switchPassword() {
			this.isShowPwd = !this.isShowPwd;
		},
		// 切换确认密码显示状态
		switchConfirmPassword() {
			this.isShowConfirmPwd = !this.isShowConfirmPwd;
		}
	},
	computed: {
		config() {
			let newConfig = {...this.configStore.registration,
				mode: this.configStore.registration.mode.filter(item=>item=='phone')
			};
			return newConfig;
			// return this.configStore.registration;
		},
		modeNameMap() {
			return {
				username: this.$t('register.usernameRegister'),
				phone: this.$t('register.phoneRegister'),
				email: this.$t('register.emailRegister')
			};
		}
	},
	watch: {
		config: {
			handler() {
				this.switchMode(this.config.mode[0]);
			}
		}
	},
	mounted() {
		this.configStore.loadConfig().then(() => {
			if (this.config.mode) {
				this.switchMode(this.config.mode[0]);
			}
		})
		// electron窗口大小
		window.electronAPI && window.electronAPI.sendEvent('resize', {
			width: 440,
			height: 735,
			maximizable: false
		})
	}
}
</script>

<style scoped lang="scss">
.register {
	position: relative;
	display: flex;
	justify-content: center;
	align-items: center;
	width: 100%;
	height: 100%;
	background: #fff;
	overflow: hidden;

	&.electron .content {
		background: #fff;
		border-radius: 0;
		box-shadow: none;
		border: none;

	}

	.content {
		position: relative;
		z-index: 1;
		width: 400px;
		min-height: 670px;
		padding: 32px 36px;
		background: rgba(255, 255, 255, 0.88);
		backdrop-filter: blur(24px);
		-webkit-backdrop-filter: blur(24px);
		border-radius: 28px;
		border: 1px solid rgba(255, 255, 255, 0.95);
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.form {
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.form-header {
		flex-shrink: 0;
		text-align: left;
		margin-bottom: 20px;
	}

	.form-title {
		margin: 0 0 6px;
		font-size: 26px;
		font-weight: 700;
		letter-spacing: 0.5px;
		line-height: 1.3;
		color: var(--im-color-primary);
	}

	.form-subtitle {
		margin: 0;
		font-size: var(--im-font-size);
		color: var(--im-text-color-light);
		line-height: 1.5;
	}

	.form-body {
		display: flex;
		flex-direction: column;
		justify-content: center;
		flex: 1;
		min-height: 280px;

		::v-deep .el-form-item {
			margin-bottom: 18px;

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

				.el-input__icon {
					color: var(--im-color-primary-light-3);
					font-size: 18px;
				}
			}

			.el-input__suffix {
				right: 16px;

				.password-switch-icon {
					cursor: pointer;
					color: var(--im-text-color-light);
					font-size: 18px;
				}
			}
		}
	}

	.send-code-bar {
		display: flex;
		align-items: center;
		gap: 10px;

		.input {
			flex: 1;
			min-width: 0;
		}

		::v-deep .el-input__inner {
			height: 52px;
			border-radius: 50px;
			padding-left: 48px;
		}

		.lock-text {
			font-size: var(--im-font-size-small);
			color: var(--im-text-color-light);
			white-space: nowrap;
			flex-shrink: 0;
		}

		.code-btn {
			height: 44px;
			padding: 0 20px;
			border-radius: 22px;
			font-size: var(--im-font-size-small);
			font-weight: 500;
			background: transparent;
			color: var(--im-color-primary);
			border: 1px solid var(--im-color-primary);
			transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;

			&:hover {
				background: var(--im-color-primary-light-9);
			}
		}
	}

	.submit-btn {
		width: 100%;
		height: 52px;
		margin-top: 8px;
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
		justify-content: flex-end;
		align-items: center;
		margin-top: 10px;
		padding: 0 4px;
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

	.other-mode {
		margin-top: 24px;
		padding-top: 8px;
	}

	.other-mode-divider {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
	}

	.divider-line {
		flex: 1;
		min-width: 0;
		height: 1px;
		background: rgba(0, 0, 0, 0.06);
	}

	.divider-text {
		flex-shrink: 0;
		font-size: var(--im-font-size-small);
		color: var(--im-text-color-light);
		white-space: nowrap;
	}

	.other-mode-btns {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 16px;
	}

	.reg-mode {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 12px 20px;
		cursor: pointer;
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.6);
		transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;

		&:hover {
			background: var(--im-color-primary-light-9);
			border-color: var(--im-color-primary-light-6);
		}

		&.active {
			background: var(--im-color-primary-light-9);
			border-color: var(--im-color-primary);
		}

		.icon {
			width: 36px;
			height: 36px;
			line-height: 36px;
			text-align: center;
			color: #fff;
			font-size: 18px;
			border-radius: 50%;
			margin-bottom: 6px;
		}

		.icon-username {
			background: #7272da;
		}

		.icon-phone {
			background: #65af5a;
		}

		.icon-email {
			background: #e0944f;
		}

		.mode-text {
			color: var(--im-text-color-light);
			font-size: var(--im-font-size-smaller);
			font-weight: 500;
			text-align: center;
		}

		&.active .mode-text {
			color: var(--im-color-primary);
			font-weight: 600;
		}
	}
}
</style>