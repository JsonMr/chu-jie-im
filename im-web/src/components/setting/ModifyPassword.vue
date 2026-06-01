<template>
    <div class="modify-password">
        <!-- 密码修改表单 -->
        <div class="form-section">
            <h4 class="section-title">
                <i class="el-icon-lock"></i>
                {{ $t('modifyPassword.title') }}
            </h4>
            <el-form :model="formData" label-width="140px" :rules="rules" ref="passwordForm" size="small">
                <el-form-item prop="oldPassword" :label="$t('modifyPassword.oldPassword')">
                    <el-input v-model="formData.oldPassword" type="password" autocomplete="off" size="small" maxlength="20"
                        show-word-limit></el-input>
                </el-form-item>
                <el-form-item prop="newPassword" :label="$t('modifyPassword.newPassword')">
                    <el-input v-model="formData.newPassword" type="password" autocomplete="off" size="small" maxlength="20"
                        show-word-limit></el-input>
                </el-form-item>
                <el-form-item prop="confirmPassword" :label="$t('modifyPassword.confirmPassword')">
                    <el-input v-model="formData.confirmPassword" type="password" autocomplete="off" size="small" maxlength="20"
                        show-word-limit></el-input>
                </el-form-item>
            </el-form>
            <div class="btn-group">
                <el-button type="primary" @click="onSubmit()">{{ $t('modifyPassword.submit') }}</el-button>
            </div>
        </div>
    </div>
</template>
<script>
export default {
    name: "modifyPassword",
    data() {
        return {
            formData: {
                oldPassword: "",
                newPassword: "",
                confirmPassword: ""
            }
        }
    },
    computed: {
        rules() {
            const vm = this;
            return {
                newPassword: [{
                    validator(rule, value, callback) {
                        if (value === '') {
                            return callback(new Error(vm.$t('modifyPassword.inputPassword')));
                        }
                        callback();
                    },
                    trigger: 'blur'
                }],
                oldPassword: [{
                    validator(rule, value, callback) {
                        if (value === '') {
                            return callback(new Error(vm.$t('modifyPassword.inputPassword')));
                        }
                        callback();
                    },
                    trigger: 'blur'
                }],
                confirmPassword: [{
                    validator(rule, value, callback) {
                        if (value === '') {
                            return callback(new Error(vm.$t('modifyPassword.inputPassword')));
                        }
                        if (value != vm.formData.newPassword) {
                            return callback(new Error(vm.$t('modifyPassword.passwordMismatch')));
                        }
                        callback();
                    },
                    trigger: 'blur'
                }]
            };
        }
    },
    methods: {
        onSubmit() {
            this.$refs.passwordForm.validate((valid) => {
                if (!valid) {
                    return false;
                }
                this.$http({
                    url: "/modifyPwd",
                    method: "put",
                    data: this.formData
                }).then((res) => {
                    this.$message.success(this.$t('modifyPassword.success'));
                })
            });
        }
    }
}
</script>
<style scoped lang="scss">
.modify-password {
    padding: 15px;
    background: #fafbfc;
    min-height: 400px;

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
