<template>
    <div class="about-us">
        <!-- 应用信息 -->
        <div class="form-section">
            <h4 class="section-title">
                <i class="el-icon-info"></i>{{ $t('aboutUs.appInfo') }}
            </h4>
            <div class="setting-item">
                <div class="setting-label">
                    <i class="el-icon-document"></i>
                    <span>{{ $t('aboutUs.currentVersion') }}</span>
                </div>
                <div class="setting-content">
                    <span class="version-text">{{ currentVersion }}</span>
                </div>
            </div>
            <div class="setting-item" v-if="latestVersion && latestVersion !== currentVersion">
                <div class="setting-label">
                    <i class="el-icon-top"></i>
                    <span>{{ $t('aboutUs.latestVersion') }}</span>
                </div>
                <div class="setting-content">
                    <span class="version-text new-version">{{ latestVersion }}</span>
                </div>
            </div>
        </div>

        <!-- 更新检查 -->
        <div class="form-section" v-if="false">
            <h4 class="section-title">
                <i class="el-icon-refresh"></i>{{ $t('aboutUs.updateCheck') }}
            </h4>
            <div class="setting-item">
                <div class="setting-label">
                    <i class="el-icon-search"></i>
                    <span>{{ $t('aboutUs.checkUpdate') }}</span>
                </div>
                <div class="setting-content">
                    <el-button type="primary" size="small" :loading="checking" @click="checkForUpdate"
                        :disabled="updating">
                        {{ checking ? $t('aboutUs.checking') : $t('aboutUs.checkUpdate') }}
                    </el-button>
                </div>
            </div>
            <div class="update-status" v-if="updateStatus">
                <el-alert :title="updateStatus" :type="updateStatusType" :closable="false" show-icon>
                </el-alert>
            </div>
            <div class="setting-item" v-if="hasUpdate && !updating && !updateDownloaded">
                <div class="setting-label">
                    <i class="el-icon-download"></i>
                    <span>{{ $t('aboutUs.autoUpdate') }}</span>
                </div>
                <div class="setting-content">
                    <el-button type="success" size="small" @click="startUpdate">
                        {{ $t('aboutUs.updateNow') }}
                    </el-button>
                </div>
            </div>
            <div class="update-progress" v-if="updating">
                <div class="progress-info">
                    <span>{{ $t('aboutUs.downloading') }}</span>
                    <span class="progress-percent">{{ updateProgress }}%</span>
                </div>
                <el-progress :percentage="updateProgress" :status="updateProgress === 100 ? 'success' : ''">
                </el-progress>
            </div>
            <div class="setting-item" v-if="updateDownloaded">
                <div class="setting-label">
                    <i class="el-icon-success"></i>
                    <span>{{ $t('aboutUs.installUpdateLabel') }}</span>
                </div>
                <div class="setting-content">
                    <el-button type="primary" size="small" @click="installUpdate">
                        {{ $t('aboutUs.installUpdate') }}
                    </el-button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: "AboutUs",
    data() {
        return {
            currentVersion: '',
            latestVersion: '',
            checking: false,
            updating: false,
            hasUpdate: false,
            updateStatus: '',
            updateStatusType: 'info',
            updateProgress: 0,
            updateDownloaded: false
        }
    },
    methods: {
        init() {
            // 获取当前版本号
            window.electronAPI.invoke('get-app-version').then(version => {
                this.currentVersion = version || this.$t('aboutUs.unknown');
            }).catch(() => {
                this.currentVersion = this.$t('aboutUs.unknown');
            });

            // 监听更新事件
            window.electronAPI.receive('update-available', (info) => {
                this.latestVersion = info.version;
                this.hasUpdate = true;
                this.updateStatus = this.$t('aboutUs.updateAvailable', { version: info.version });
                this.updateStatusType = 'success';
                this.checking = false;
            });

            window.electronAPI.receive('update-not-available', () => {
                this.updateStatus = this.$t('aboutUs.latestVersionTip');
                this.updateStatusType = 'success';
                this.checking = false;
                this.hasUpdate = false;
            });

            window.electronAPI.receive('update-error', (error) => {
                this.updateStatus = this.$t('aboutUs.updateCheckFailed', { error });
                this.updateStatusType = 'error';
                this.checking = false;
            });

            window.electronAPI.receive('download-progress', (progress) => {
                this.updateProgress = Math.round(progress.percent || 0);
            });

            window.electronAPI.receive('update-downloaded', () => {
                this.updateProgress = 100;
                this.updateStatus = this.$t('aboutUs.downloadComplete');
                this.updateStatusType = 'success';
                this.updating = false;
                this.updateDownloaded = true;
            });

        },
        checkForUpdate() {
            this.checking = true;
            this.updateStatus = '';
            this.hasUpdate = false;
            this.latestVersion = '';
            this.updateDownloaded = false;
            window.electronAPI.invoke('check-for-update').then(result => {
                if (result === false) {
                    // 开发模式下返回 false
                    this.updateStatus = this.$t('aboutUs.devNoUpdate');
                    this.updateStatusType = 'info';
                    this.checking = false;
                } else if (!result) {
                    this.updateStatus = this.$t('aboutUs.cannotConnect');
                    this.updateStatusType = 'warning';
                    this.checking = false;
                }
                // 如果 result 为 true，说明检查已开始，等待事件回调
            }).catch(error => {
                this.updateStatus = this.$t('aboutUs.updateCheckFailed', { error: error.message || error });
                this.updateStatusType = 'error';
                this.checking = false;
            });
        },
        startUpdate() {
            this.updating = true;
            this.updateProgress = 0;
            this.updateStatus = this.$t('aboutUs.downloading');
            this.updateStatusType = 'info';
            this.updateDownloaded = false;
            window.electronAPI.invoke('start-update').catch(error => {
                this.updateStatus = this.$t('aboutUs.updateFailedWith', { error: error.message || error });
                this.updateStatusType = 'error';
                this.updating = false;
                this.$message.error(this.$t('aboutUs.updateFailed'));
            });
        },
        installUpdate() {
            this.$confirm(this.$t('aboutUs.installConfirm'), this.$t('aboutUs.installConfirmTitle'), {
                confirmButtonText: this.$t('aboutUs.installNow'),
                cancelButtonText: this.$t('common.cancel'),
                type: 'warning'
            }).then(() => {
                window.electronAPI.invoke('install-update').then(() => {
                    this.$message.success(this.$t('aboutUs.installing'));
                }).catch(error => {
                    this.$message.error(this.$t('aboutUs.installFailed', { error: error.message || error }));
                });
            })
        }
    }
}
</script>

<style scoped lang="scss">
.about-us {
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
            align-items: center;

            .version-text {
                font-size: var(--im-font-size);
                color: var(--im-text-color);
                font-weight: 500;

                &.new-version {
                    color: var(--im-color-primary);
                    font-weight: 600;
                }
            }
        }
    }

    .update-status {
        margin-top: 12px;
    }

    .update-progress {
        margin-top: 12px;
        padding: 12px;
        background: #f5f7fa;
        border-radius: 4px;

        .progress-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: var(--im-font-size);
            color: var(--im-text-color-light);

            .progress-percent {
                font-weight: 600;
                color: var(--im-color-primary);
            }
        }
    }
}
</style>
