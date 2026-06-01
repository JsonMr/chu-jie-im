<template>
    <div class="user-config">
        <!-- 语言设置 -->
        <div class="form-section">
            <h4 class="section-title">
                <i class="el-icon-s-operation"></i>
                {{ $t('setting.language') }}
            </h4>
            <div class="setting-item">
                <div class="setting-label">
                    <i class="el-icon-edit-outline"></i>
                    <span>{{ $t('setting.languageDesc') }}</span>
                </div>
                <div class="setting-content">
                    <el-select v-model="currentLocale" @change="onLocaleChange" size="small" style="width: 140px">
                        <el-option label="简体中文" value="zh"> </el-option>
                        <el-option label="English" value="en"> </el-option>
                    </el-select>
                </div>
            </div>
        </div>
        <!-- 隐私设置 -->
        <div class="form-section">
            <h4 class="section-title">
                <i class="el-icon-lock"></i>
                {{ $t('userConfig.privacy') }}
            </h4>
            <div class="setting-item">
                <div class="setting-label">
                    <i class="el-icon-user-solid"></i>
                    <span>{{ $t('userConfig.manualApprove') }}</span>
                </div>
                <div class="setting-content">
                    <el-switch v-model="userInfo.isManualApprove" @change="onManualApproveChange"></el-switch>
                </div>
            </div>
        </div>

        <!-- 通知设置 -->
        <div class="form-section">
            <h4 class="section-title">
                <i class="el-icon-bell"></i>
                {{ $t('userConfig.notification') }}
            </h4>
            <div class="setting-item">
                <div class="setting-label">
                    <i class="el-icon-microphone"></i>
                    <span>{{ $t('userConfig.audioTip') }}</span>
                </div>
                <div class="setting-content">
                    <el-switch v-model="userInfo.isAudioTip" @change="onMessageAudioTip"></el-switch>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
import { setLocale } from '@/i18n';

export default {
    name: "userConfig",
    data() {
        return {
            currentLocale: 'zh',
            userInfo: {
                isManualApprove: false,
                isAudioTip: false
            }
        }
    },
    methods: {
        init() {
            let mine = this.userStore.userInfo;
            this.userInfo = JSON.parse(JSON.stringify(mine));
            this.currentLocale = this.$i18n.locale;
        },
        onLocaleChange(locale) {
            setLocale(locale);
            this.chatStore.refreshAllLastContent();
        },
        onManualApproveChange() {
            this.$http({
                url: "/user/manualApprove?enabled=" + this.userInfo.isManualApprove,
                method: 'put'
            }).then(() => {
                this.userStore.loadUser();
            })
        },
        onMessageAudioTip() {
            this.$http({
                url: "/user/audioTip?enabled=" + this.userInfo.isAudioTip,
                method: 'put'
            }).then(() => {
                this.userStore.loadUser();
            })
        }
    }
}
</script>
<style scoped lang="scss">
.user-config {
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

    // 设置项
    .setting-item {
        display: flex;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid #f5f5f5;

        &:last-child {
            border-bottom: none;
        }

        .setting-label {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100px;
            font-weight: 500;
            color: var(--im-text-color-light);
            font-size: var(--im-font-size);

            i {
                color: var(--im-color-primary);
                font-size: var(--im-font-size-large);
            }
        }

        .setting-content {
            flex: 1;
            display: flex;
            justify-content: flex-end;
        }
    }
}
</style>
