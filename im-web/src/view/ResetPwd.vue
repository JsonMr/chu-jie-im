<template>
    <div class="reset-pwd" :class="configStore.electronMode ? 'electron' : ''">
        <AuthBackground v-if="!configStore.electronMode" />
        <div class="content">
            <div class="reset-wizard">
                <div class="form-header">
                    <h1 class="form-title">{{ $t('resetPwd.wizardTitle') }}</h1>
                    <p class="form-subtitle">{{ $t('resetPwd.wizardDesc') }}</p>
                </div>
                <div class="steps-container">
                    <el-steps :active="currentStep" align-center>
                        <el-step :title="$t('resetPwd.step1')"></el-step>
                        <el-step :title="$t('resetPwd.step2')"></el-step>
                        <el-step :title="$t('resetPwd.step3')"></el-step>
                        <el-step :title="$t('resetPwd.step4')"></el-step>
                    </el-steps>
                    <div class="step-content">
                        <!-- 步骤1: 选择重置方式 -->
                        <div v-if="currentStep === 0">
                            <div class="step-title">
                                <span>{{ $t('resetPwd.selectMode') }}</span>
                            </div>
                            <div class="step-body mode-selector">
                                <div v-if="containsPhoneMode" class="mode-card"
                                    :class="{ active: dataForm.mode === 'phone' }" @click="dataForm.mode = 'phone'">
                                    <i class="iconfont icon-phone"></i>
                                    <h3>{{ $t('resetPwd.phoneReset') }}</h3>
                                    <p>{{ $t('resetPwd.phoneResetDesc') }}</p>
                                </div>
                                <div v-if="containsEmailMode" class="mode-card"
                                    :class="{ active: dataForm.mode === 'email' }" @click="dataForm.mode = 'email'">
                                    <i class="iconfont icon-email"></i>
                                    <h3>{{ $t('resetPwd.emailReset') }}</h3>
                                    <p>{{ $t('resetPwd.emailResetDesc') }}</p>
                                </div>
                            </div>
                            <div class="navigation">
                                <el-button class="nav-btn" @click="cancelReset">{{ $t('resetPwd.cancel') }}</el-button>
                                <el-button type="primary" class="nav-btn" @click="nextStep">{{ $t('resetPwd.next')
                                    }}</el-button>
                            </div>
                        </div>
                        <!-- 步骤2: 验证身份 -->
                        <div v-show="currentStep === 1">
                            <div class="step-title">
                                <span>{{ $t('resetPwd.verifyIdentity') }}</span>
                            </div>
                            <div class="step-body" v-if="dataForm.mode === 'phone'">
                                <div class="form-group">
                                    <label>{{ $t('resetPwd.phone') }}</label>
                                    <el-input v-model="dataForm.phone" :placeholder="$t('resetPwd.inputPhone')"
                                        prefix-icon="el-icon-mobile-phone"></el-input>
                                </div>
                                <div class="form-group">
                                    <label>{{ $t('resetPwd.smsCode') }}</label>
                                    <div class="code-input">
                                        <el-input v-model="dataForm.code" :placeholder="$t('resetPwd.inputSmsCode')"
                                            prefix-icon="el-icon-message"></el-input>
                                        <el-button class="send-code-btn" type="primary" plain
                                            :disabled="phoneLockTime > 0" @click="onSendSmsCode">
                                            {{ phoneLockTime > 0 ? $t('resetPwd.resendAfter', { n: phoneLockTime }) :
                                                $t('resetPwd.getCode') }}
                                        </el-button>
                                    </div>
                                </div>
                            </div>
                            <div class="step-body" v-else>
                                <div class="form-group">
                                    <label>{{ $t('resetPwd.email') }}</label>
                                    <el-input v-model="dataForm.email" :placeholder="$t('resetPwd.inputEmail')"
                                        prefix-icon="el-icon-message"></el-input>
                                </div>
                                <div class="form-group">
                                    <label>{{ $t('resetPwd.emailCode') }}</label>
                                    <div class="code-input">
                                        <el-input v-model="dataForm.code" :placeholder="$t('resetPwd.inputEmailCode')"
                                            prefix-icon="el-icon-chat-dot-round"></el-input>
                                        <el-button class="send-code-btn" type="primary" plain
                                            :disabled="emailLockTime > 0" @click="onSendMailCode">
                                            {{ emailLockTime > 0 ? $t('resetPwd.resendAfter', { n: emailLockTime }) :
                                                $t('resetPwd.getCode') }}
                                        </el-button>
                                    </div>
                                </div>
                            </div>
                            <div class="navigation">
                                <el-button class="nav-btn" @click="prevStep">{{ $t('resetPwd.prev') }}</el-button>
                                <el-button class="nav-btn" type="primary" :disabled="!canVerify"
                                    @click="onVertifyCode()">
                                    {{ $t('resetPwd.verify') }}
                                </el-button>
                            </div>
                        </div>
                        <!-- 步骤3: 设置新密码 -->
                        <div v-if="currentStep === 2">
                            <div class="step-title">
                                <span>{{ $t('resetPwd.step3') }}</span>
                            </div>
                            <div class="step-body">
                                <div class="form-group">
                                    <label>{{ $t('resetPwd.newPassword') }}</label>
                                    <el-input v-model="dataForm.password" type="password"
                                        :placeholder="$t('resetPwd.inputNewPassword')" prefix-icon="el-icon-lock"
                                        show-password></el-input>
                                </div>
                                <div class="form-group">
                                    <label>{{ $t('resetPwd.confirmPassword') }}</label>
                                    <el-input v-model="dataForm.confirmPassword" type="password"
                                        :placeholder="$t('resetPwd.inputConfirmPassword')" prefix-icon="el-icon-lock"
                                        show-password></el-input>
                                </div>
                            </div>
                            <div class="navigation">
                                <el-button class="nav-btn" @click="prevStep">{{ $t('resetPwd.prev') }}</el-button>
                                <el-button type="primary" class="nav-btn" :disabled="!canSubmit" @click="onSubmit">
                                    {{ $t('resetPwd.submit') }}
                                </el-button>
                            </div>
                        </div>
                        <!-- 步骤4: 完成 -->
                        <div v-if="currentStep === 3">
                            <div class="success-content">
                                <div class="success-body">
                                    <div class="success-icon-wrap"><i class="el-icon-check"></i></div>
                                    <h3>{{ $t('resetPwd.successTitle') }}</h3>
                                    <p>{{ $t('resetPwd.successDesc') }}</p>
                                    <p>{{ $t('resetPwd.redirectIn', { n: countdown }) }}</p>
                                </div>
                                <el-button type="primary" class="to-login-btn" @click="toLogin">{{
                                    $t('resetPwd.toLogin') }}</el-button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <captcha-image ref="captchaRef"></captcha-image>
    </div>
</template>
<script>
import AuthBackground from '../components/common/AuthBackground.vue'
import CaptchaImage from '../components/common/CaptchaImage.vue'

export default {
    components: {
        AuthBackground,
        CaptchaImage
    },
    data() {
        return {
            currentStep: 0,
            phoneLockTime: 0,
            phoneLockTimer: null,
            emailLockTime: 0,
            emailLockTimer: null,
            countdown: 0,
            countdownTimer: null,
            dataForm: {
                mode: 'phone',
                phone: '',
                email: '',
                code: '',
                password: '',
                confirmPassword: '',
            }
        };
    },
    methods: {
        nextStep() {
            if (this.currentStep < 3) {
                this.currentStep++;
                // 如果是最后一步，开始倒计时
                if (this.currentStep === 3) {
                    this.startCountdown();
                }
            }
        },
        prevStep() {
            if (this.currentStep > 0) {
                this.currentStep--;
            }
        },
        onSendSmsCode() {
            const regex = /^1[3-9]\d{9}$/;
            if (!regex.test(this.dataForm.phone)) {
                this.$message.error(this.$t('resetPwd.inputCorrectPhone'));
                return;
            }
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
        },
        onSendMailCode() {
            const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!regex.test(this.dataForm.email)) {
                this.$message.error(this.$t('resetPwd.inputCorrectEmail'));
                return;
            }
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
        },
        onVertifyCode() {
            let action = "";
            if (this.dataForm.mode == 'phone') {
                action = `/captcha/sms/vertify?id=${this.dataForm.phone}&code=${this.dataForm.code}`;
            } else {
                action = `/captcha/mail/vertify?id=${this.dataForm.email}&code=${this.dataForm.code}`
            }
            this.$http({
                url: action,
                method: 'get'
            }).then(isPass => {
                if (!isPass) {
                    this.$message.error(this.$t('resetPwd.verifyFail'))
                    this.dataForm.code = "";
                } else {
                    this.nextStep();
                }
            })
        },
        onSubmit() {
            if (this.dataForm.confirmPassword != this.dataForm.password) {
                this.$message.error(this.$t('resetPwd.passwordMismatch'))
                return;
            }
            this.$http({
                url: '/resetPwd',
                data: this.dataForm,
                method: 'PUT'
            }).then(() => {
                this.$message.success(this.$t('resetPwd.resetSuccess'));
                this.nextStep();
            })
        },
        startCountdown() {
            this.countdown = 5;
            this.countdownTimer = setInterval(() => {
                if (this.countdown > 0) {
                    this.countdown--;
                } else {
                    clearInterval(this.countdownTimer);
                    this.toLogin();
                }
            }, 1000);
        },
        toLogin() {
            this.$router.push("/login");
        },
        cancelReset() {
            this.$confirm(this.$t('resetPwd.cancelConfirm'), this.$t('common.tip'), {
                confirmButtonText: this.$t('common.confirm'),
                cancelButtonText: this.$t('common.cancel'),
                type: 'warning'
            }).then(() => {
                this.toLogin();
            });
        }
    },
    computed: {
        canVerify() {
            if (this.dataForm.mode === 'phone') {
                return this.dataForm.phone && this.dataForm.code;
            } else {
                return this.dataForm.email && this.dataForm.code;
            }
        },
        canSubmit() {
            return this.dataForm.password && this.dataForm.confirmPassword;
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
    },
    mounted() {
        this.configStore.loadConfig();
        // electron窗口大小
        window.electronAPI && window.electronAPI.sendEvent('resize', {
            width: 460 + 40,
            height: 560,
            maximizable: false
        })
    }
}
</script>

<style scoped lang="scss">
.reset-pwd {
    position: relative;
    height: 100vh;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #fff;
    overflow: hidden;

    &.electron .reset-wizard {
        border-radius: 0;
        box-shadow: none;
        border: none;
    }
}

.content {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
}

.reset-wizard {
    width: 460px;
    min-height: 500px;
    display: flex;
    flex-direction: column;
    padding: 32px 36px;
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-radius: 28px;
    border: 1px solid rgba(255, 255, 255, 0.95);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04);
    overflow: visible;
}

.form-header {
    flex-shrink: 0;
    text-align: left;
    margin-bottom: 4px;
}

.form-title {
    margin: 0 0 6px;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: 0.5px;
    line-height: 1.3;
}

.form-subtitle {
    margin: 0;
    font-size: var(--im-font-size);
    color: var(--im-text-color-light);
    line-height: 1.5;
}

.steps-container {
    flex: 1;
    min-height: 0;
    padding-top: 20px;

    ::v-deep .el-steps {
        margin-bottom: 24px;

        .el-step__head.is-process {
            color: var(--im-color-primary);
            border-color: var(--im-color-primary);
        }

        .el-step__title.is-process {
            font-weight: 600;
        }

        .el-step__title.is-wait {
            color: var(--im-text-color-light);
        }

        .el-step__line-inner {
            background-color: var(--im-color-primary);
        }
    }
}

.step-content {
    padding: 8px 0;

    .step-title {
        font-size: var(--im-font-size-larger);
        font-weight: 600;
        margin-bottom: 18px;
    }

    /* 各步骤主体区域统一最小高度，使下方按钮栏保持同一水平 */
    .step-body {
        min-height: 200px;
    }

    .mode-selector {
        display: flex;
        gap: 16px;
        margin-bottom: 24px;
        padding: 20px 0;
        box-sizing: border-box;

        .mode-card {
            flex: 1;
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 16px;
            padding: 18px;
            text-align: center;
            cursor: pointer;
            transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
            background: #fff;
            display: flex;
            flex-direction: column;
            justify-content: center;

            &:hover {
                border-color: rgba(0, 0, 0, 0.12);
                transform: translateY(-2px);
            }

            &.active {
                border-color: var(--im-color-primary);
                background: var(--im-color-primary-light-9);
            }

            i {
                font-size: 32px;
                color: var(--im-color-primary);
                margin-bottom: 12px;
            }

            h3 {
                font-size: var(--im-font-size-large);
                font-weight: 600;
                margin: 0 0 6px;
            }

            p {
                font-size: var(--im-font-size-small);
                color: var(--im-text-color-light);
                margin: 0;
                line-height: 1.4;
            }
        }
    }
}

.form-group {
    margin-bottom: 20px;

    label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        font-size: var(--im-font-size);
    }

    ::v-deep .el-input__inner {
        height: 52px;
        border-radius: 50px;
        border: 1px solid rgba(0, 0, 0, 0.06);
        background: #fff;
        padding-left: 48px;
        font-size: var(--im-font-size-large);
        transition: border-color 0.2s ease, box-shadow 0.2s ease;

        &:focus {
            border-color: rgba(0, 0, 0, 0.1);
            box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.8);
        }

        &::placeholder {
            color: var(--im-text-color-lighter);
            font-size: var(--im-font-size);
        }
    }

    ::v-deep .el-input__prefix {
        left: 18px;
    }

    .code-input {
        display: flex;
        gap: 10px;
        align-items: center;

        .el-input {
            flex: 1;
        }
    }

    .send-code-btn {
        flex-shrink: 0;
        height: 52px;
        padding: 0 20px;
        border-radius: 50px;
        font-weight: 500;
    }
}

.navigation {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 28px;

    .nav-btn {
        flex: 1;
        min-width: 0;
        height: 52px;
        font-size: var(--im-font-size-large);
        font-weight: 600;
        border-radius: 50px;
        transition: transform 0.2s ease;

        &:hover:not(:disabled) {
            transform: translateY(-1px);
        }
    }
}

.success-content {
    text-align: center;
    padding: 24px 0;

    /* 与 step-title + step-body + nav间距 一致，使按钮与其它步骤同高 */
    .success-body {
        min-height: 218px;
    }

    .success-icon-wrap {
        width: 56px;
        height: 56px;
        margin: 0 auto 20px;
        background: var(--im-color-primary);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 26px;
    }

    h3 {
        margin: 0 0 12px;
        font-size: 22px;
        font-weight: 600;
    }

    p {
        color: var(--im-text-color-light);
        line-height: 1.6;
        margin: 0 0 8px;
        font-size: var(--im-font-size);
    }

    .to-login-btn {
        width: 100%;
        height: 52px;
        margin-top: 28px;
        border-radius: 50px;
        font-size: var(--im-font-size-large);
        font-weight: 600;
        transition: transform 0.2s ease;

        &:hover {
            transform: translateY(-1px);
        }
    }
}
</style>
