<template>
    <div class="bind-email">
        <!-- 绑定成功提示 -->
        <div v-if="isBound" class="success-section">
            <div class="success-content">
                <div class="success-icon">
                    <i class="el-icon-success"></i>
                </div>
                <div class="success-text">
                    <div class="success-title">{{ $t('bindEmail.successTitle') }}</div>
                    <div class="success-desc">{{ $t('bindEmail.successDesc', { email: userStore.userInfo.email }) }}</div>
                </div>
            </div>
        </div>

        <!-- 绑定表单 -->
        <div v-else>
            <!-- 友好提示 -->
            <div class="tip-section">
                <div class="tip-content">
                    <div class="tip-title"> <i class="el-icon-info"></i>{{ $t('bindEmail.tipTitle') }}</div>
                    <div class="tip-desc">{{ $t('bindEmail.tipDesc') }}</div>
                </div>
            </div>
            
            <!-- 绑定表单 -->
            <div class="form-section">
                <h4 class="section-title">
                    <i class="el-icon-message"></i>
                    {{ $t('bindEmail.formTitle') }}
                </h4>
                <el-form :model="dataForm" status-icon :rules="rules" ref="bindEmailForm" label-width="140px" size="small">
                    <el-form-item :label="$t('resetPwd.email')" prop="email">
                        <el-input v-model="dataForm.email" :placeholder="$t('bindEmail.inputEmail')" maxlength="50"></el-input>
                    </el-form-item>
                    <el-form-item :label="$t('register.emailCode')" prop="code">
                        <div class="send-code-bar">
                            <el-input v-model="dataForm.code" :placeholder="$t('bindEmail.inputCode')" maxlength="6"></el-input>
                            <div class="lock-text" v-if="lockTime > 0">{{ $t('bindEmail.resendAfter', { n: lockTime }) }}</div>
                            <el-button v-else type="primary" plain size="small" @click="onSendMailCode">{{ $t('resetPwd.getCode') }}</el-button>
                        </div>
                    </el-form-item>
                </el-form>
                <div class="btn-group">
                    <el-button type="primary" @click="submitForm()">{{ $t('bindEmail.bind') }}</el-button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: "bindEmail",
    data() {
        return {
            dataForm: {
                email: '',
                code: ''
            },
            lockTime: 0,
            lockTimer: null,
            isBound: false
        };
    },
    computed: {
        rules() {
            const vm = this;
            return {
                email: [{
                    validator(rule, value, callback) {
                        if (!value) {
                            return callback(new Error(vm.$t('bindEmail.inputEmailError')));
                        }
                        const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                        if (!regex.test(value)) {
                            return callback(new Error(vm.$t('bindEmail.emailFormatError')));
                        }
                        callback();
                    },
                    trigger: 'blur'
                }],
                code: [{
                    validator(rule, value, callback) {
                        if (!value) {
                            return callback(new Error(vm.$t('bindEmail.inputCodeError')));
                        }
                        callback();
                    },
                    trigger: 'blur'
                }]
            };
        }
    },
    methods: {
        init() {
            // 检查是否已绑定邮箱
            this.isBound = !!this.userStore.userInfo.email;
            if (!this.isBound) {
                // 初始化时清空表单
                this.dataForm.email = '';
                this.dataForm.code = '';
                this.$refs.bindEmailForm && this.$refs.bindEmailForm.resetFields();
            }
        },
        submitForm() {
            this.$refs.bindEmailForm.validate((valid) => {
                if (valid) {
                    this.$confirm(this.$t('bindEmail.confirmBind'), this.$t('common.tip'), {
                        confirmButtonText: this.$t('common.confirm'),
                        cancelButtonText: this.$t('common.cancel'),
                        type: 'warning'
                    }).then(() => {
                        this.$http({
                            url: "/user/bindEmail",
                            method: 'PUT',
                            data: this.dataForm
                        }).then(() => {
                            this.$message.success(this.$t('bindEmail.bindSuccess'));
                            this.userStore.userInfo.email = this.dataForm.email;
                            this.isBound = true; 
                        })
                    })
                }
            });
        },
        onSendMailCode() {
            this.$refs.bindEmailForm.validateField('email', (valid) => {
                if (valid == '') {
                    // 60s内不允许再次发送
                    this.lockTime = 60;
                    this.lockTimer && clearInterval(this.lockTimer);
                    this.lockTimer = setInterval(() => {
                        this.lockTime -= 1;
                        if (this.lockTime <= 0) {
                            this.lockTimer && clearInterval(this.lockTimer);
                        }
                    }, 1000)
                    // 发送邮件
                    let data = {
                        email: this.dataForm.email
                    }
                    this.$http({
                        url: "/captcha/mail/code",
                        method: 'post',
                        data: data
                    }).then(() => {
                        this.$message.success(this.$t('register.emailSent'))
                    }).catch((error) => {
                        this.$message.error(error.message || this.$t('bindEmail.sendCodeFail'));
                        // 重置倒计时
                        this.lockTime = 0;
                        this.lockTimer && clearInterval(this.lockTimer);
                    })
                }
            })
        }
    },
    beforeDestroy() {
        // 清理定时器
        if (this.lockTimer) {
            clearInterval(this.lockTimer);
        }
    }
}
</script>

<style scoped lang="scss">
.bind-email {
    padding: 15px;
    background: #fafbfc;
    min-height: 400px;

    // 绑定成功提示
    .success-section {
        background: white;
        border-radius: 8px;
        padding: 30px;
        margin-bottom: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        border: 1px solid #f0f0f0;
        text-align: center;

        .success-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;

            .success-icon {
                i {
                    font-size: 48px;
                    color: #67c23a;
                }
            }

            .success-text {
                .success-title {
                    font-size: var(--im-font-size-larger);
                    font-weight: 600;
                    color: #67c23a;
                    margin-bottom: 8px;
                }

                .success-desc {
                    font-size: var(--im-font-size);
                    color: var(--im-text-color-light);
                }
            }
        }
    }

    .tip-section {
        display: flex;
        align-items: flex-start;
        padding: 15px;
        margin-bottom: 20px;
        background: var(--im-background-active);
        border: 1px solid #b3d8ff;
        border-radius: 6px;

        .tip-content {
            flex: 1;

            .tip-title {
                font-size: var(--im-font-size);
                font-weight: 600;
                color: var(--im-color-primary-light-3);
                margin-bottom: 4px;

                i {
                    font-size: 16px;
                    margin: 0 5px;
                }
            }

            .tip-desc {
                font-size: var(--im-font-size-small);
                color: var(--im-text-color-light);
                line-height: 1.4;
            }
        }
    }

    // 表单区域
    .form-section {
        background: white;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        border: 1px solid #f0f0f0;

        .section-title {
            margin: 0 0 15px 0;
            font-size: var(--im-font-size-larger);
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
            padding-bottom: 8px;
            border-bottom: 1px solid #f5f5f5;

            i {
                color: var(--im-color-primary);
                font-size: 16px;
            }
        }
    }

    .send-code-bar {
        display: flex;
        align-items: center;
        gap: 8px;

        .el-input {
            flex: 1;
            min-width: 0;
        }

        .lock-text {
            font-size: var(--im-font-size-small);
            color: var(--im-text-color-light);
            white-space: nowrap;
            flex-shrink: 0;
        }
    }

    .btn-group {
        margin-top: 20px;

        .el-button {
            padding: 10px 28px;
            font-size: var(--im-font-size);
            font-weight: 600;
        }
    }
}
</style>
