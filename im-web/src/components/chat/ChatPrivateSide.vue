<template>
    <div class="chat-private-side">
        <!-- 好友信息展示区域 -->
        <div class="friend-info-section" v-if="userInfo">
            <!-- 好友基本信息卡片 -->
            <div class="friend-card">
                <div class="friend-avatar">
                    <head-image :size="80" :url="userInfo.headImageThumb" radius="50%" :name="userInfo.nickName">
                    </head-image>
                </div>

                <div class="friend-details">
                    <div class="friend-name-row">
                        <h4 class="friend-name">{{ userInfo.nickName }}</h4>
                        <div class="gender-icons">
                            <i v-if="userInfo.sex == 0" class="el-icon-male gender-icon male"></i>
                            <i v-if="userInfo.sex == 1" class="el-icon-female gender-icon female"></i>
                        </div>
                    </div>
                    <div class="friend-company-row company-tag" v-if="userInfo.companyName">
                        @{{ userInfo.companyName }}
                    </div>
                    <div class="friend-id-row">
                        <span class="friend-id">{{ $t('common.userName') }}: {{ userInfo.userName }}</span>
                        <i class="el-icon-copy-document copy-btn" @click="copyUserName(userInfo.userName)"
                            :title="$t('chat.copyUserId')"></i>
                    </div>
                    <div class="friend-id-row">
                        <span class="friend-id">ID: {{ userInfo.code }}</span>
                        <i class="el-icon-copy-document copy-btn" @click="copyUserName(userInfo.code)"
                            :title="$t('chat.copyUserId')"></i>
                    </div>
                </div>
            </div>

            <!-- 个人设置区域 -->
            <div class="personal-setting">
                <div class="switch-item">
                    <div class="label">
                        <i class="el-icon-bell"></i>
                        <span>{{ $t('chat.dndLabel') }}</span>
                    </div>
                    <el-switch v-model="isDnd" @change="onDndChange"></el-switch>
                </div>
                <div class="switch-item">
                    <div class="label">
                        <i class="el-icon-top"></i>
                        <span>{{ $t('chat.topLabel') }}</span>
                    </div>
                    <el-switch v-model="isTop" @change="onTopChange"></el-switch>
                </div>
                <div class="switch-item">
                    <div class="label">
                        <i class="el-icon-warning"></i>
                        <span>{{ $t('chat.blacklistLabel') }}</span>
                    </div>
                    <el-switch v-model="isInBlacklist" @change="onBlacklistChange"></el-switch>
                </div>
            </div>

            <!-- 好友信息区域 -->
            <div class="friend-info-section-card">
                <!-- 备注名 -->
                <div class="info-item">
                    <div class="info-label">
                        <i class="el-icon-edit"></i>
                        <span>{{ $t('friend.remark') }}</span>
                    </div>
                    <div class="info-content">
                        <el-input v-if="isEditingRemark" v-model="remarkValue" size="small"
                            :placeholder="$t('chat.inputRemark')" maxlength="32" show-word-limit @blur="saveRemark"
                            @keyup.enter="saveRemark" ref="remarkInput">
                        </el-input>
                        <div v-else class="info-display" @click="startEditRemark">
                            <span v-if="friend.remarkNickName">{{ friend.remarkNickName }}</span>
                            <span v-else class="info-placeholder">{{ $t('chat.clickSetRemark') }}</span>
                            <i class="el-icon-edit-outline"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 操作按钮区域 -->
            <div class="btn-group">
                <div class="text-btn" @click="onCleanMessage">
                    {{ $t('chat.clearChatTitle') }}
                </div>
                <div class="text-btn" @click="onDeleteFriend">
                    {{ $t('friend.deleteFriend') }}
                </div>
            </div>
            <div class="complaint-tip" @click="onComplaint">
                <span>{{ $t('chat.complaintUser') }}</span>
            </div>
        </div>
        <complaint ref="complaint"></complaint>
    </div>
</template>

<script>
import HeadImage from '../common/HeadImage.vue';
import Complaint from '../common/Complaint.vue';

export default {
    name: "ChatPrivateSide",
    components: {
        HeadImage,
        Complaint
    },
    data() {
        return {
            isDnd: false,
            isTop: false,
            isInBlacklist: false,
            isEditingRemark: false,
            remarkValue: ''
        }
    },
    props: {
        userInfo: {
            type: Object,
            default: null
        },
        chat: {
            type: Object,
            default: null
        }
    },
    methods: {
        // 免打扰开关变化
        onDndChange(value) {
            const data = {
                friendId: this.userInfo.id,
                isDnd: value
            };
            this.$http({
                url: '/friend/dnd',
                method: 'PUT',
                data: data
            }).then(() => {
                this.friendStore.setDnd(this.userInfo.id, value);
                this.chatStore.setDnd(this.chat, value)
                this.$message.success(value ? this.$t('chat.dndOn') : this.$t('chat.dndOff'));
            }).catch(() => {
                this.$message.error(this.$t('chat.opFailed'));
                this.isDnd = !value;
            })
        },
        // 置顶开关变化
        onTopChange(value) {
            const data = {
                friendId: this.userInfo.id,
                isTop: value
            };
            this.$http({
                url: '/friend/top',
                method: 'PUT',
                data: data
            }).then(() => {
                this.friendStore.setTop(this.userInfo.id, value);
                this.chatStore.setTop(this.chat, value)
                this.$message.success(value ? this.$t('chat.topOn') : this.$t('chat.topOff'));
            }).catch(() => {
                this.$message.error(this.$t('chat.opFailed'));
                this.isTop = !value;
            })
        },
        // 拉黑开关变化
        onBlacklistChange(value) {
            if (value) {
                this.$confirm(this.$t('chat.addBlacklistConfirm', { name: this.userInfo.nickName }), this.$t('chat.addBlacklist'), {
                    confirmButtonText: this.$t('common.ok'),
                    cancelButtonText: this.$t('common.cancel'),
                    type: 'warning'
                }).then(() => {
                    this.updateBlacklistSetting(true);
                }).catch(() => {
                    this.isInBlacklist = false;
                });
            } else {
                this.updateBlacklistSetting(false);
            }
        },
        // 更新黑名单设置
        updateBlacklistSetting(value) {
            let url = '';
            let method = '';
            if (value) {
                url = `/blacklist/add?userId=${this.userInfo.id}`;
                method = 'POST';
            } else {
                url = `/blacklist/remove?userId=${this.userInfo.id}`;
                method = 'DELETE';
            }
            this.$http({
                url: url,
                method: method
            }).then(() => {
                // 更新本地状态
                this.isInBlacklist = value;
                this.userInfo.isInBlacklist = value;
                // 显示成功消息
                const tip = value ? this.$t('chat.addedBlacklist', { name: this.userInfo.nickName }) : this.$t('chat.removedBlacklist', { name: this.userInfo.nickName });
                this.$message.success(tip);
            }).catch(() => {
                this.$message.error(this.$t('chat.opFailed'));
                // 恢复开关状态
                this.isInBlacklist = !value;
            })
        },
        // 清空聊天记录
        onCleanMessage() {
            this.$confirm(this.$t('chat.clearChatConfirm', { name: this.userInfo.nickName }), this.$t('chat.clearChatTitle'), {
                confirmButtonText: this.$t('common.ok'),
                cancelButtonText: this.$t('common.cancel'),
                type: 'warning'
            }).then(() => {
                this.chatStore.cleanMessage(this.chat);
                this.$message.success(this.$t('chat.clearedChat', { name: this.userInfo.nickName }));
            }).catch(() => {
                // 用户取消操作
            });
        },
        // 开始编辑备注
        startEditRemark() {
            this.isEditingRemark = true;
            this.remarkValue = this.friend.remarkNickName || '';
            this.$nextTick(() => {
                this.$refs.remarkInput.focus();
            });
        },
        // 保存备注
        saveRemark() {
            const newRemark = this.remarkValue.trim();
            // 如果备注没有变化，直接退出编辑模式
            if (newRemark === (this.friend.remarkNickName || '')) {
                this.isEditingRemark = false;
                return;
            }

            // 参考Friend.vue的API调用逻辑
            let data = {
                friendId: this.userInfo.id,
                remarkNickName: newRemark
            };
            this.$http({
                url: '/friend/update/remark',
                method: 'PUT',
                data: data
            }).then((friend) => {
                // 更新本地数据，参考Friend.vue的更新逻辑
                this.friendStore.updateFriend(friend);
                this.chatStore.updateChatFromFriend(friend);
                // 显示成功消息
                this.$message.success(newRemark ? this.$t('chat.remarkSuccess') : this.$t('chat.remarkCleared'));
            }).finally(() => {
                // 退出编辑模式
                this.isEditingRemark = false;
            });
        },
        // 删除好友
        onDeleteFriend() {
            this.$confirm(this.$t('friend.deleteFriendConfirm', { name: this.userInfo.nickName }), this.$t('friend.deleteFriendTitle'), {
                confirmButtonText: this.$t('common.ok'),
                cancelButtonText: this.$t('common.cancel'),
                type: 'warning'
            }).then(() => {
                this.$http({
                    url: `/friend/delete/${this.userInfo.id}`,
                    method: 'DELETE'
                }).then(() => {
                    // 删除成功后，从好友列表中移除
                    this.friendStore.removeFriend(this.userInfo.id);
                    // 从聊天列表中移除
                    this.chatStore.removePrivateChat(this.userInfo.id);
                    this.$message.success(this.$t('friend.deleteFriendSuccessWithName', { name: this.userInfo.nickName }));
                    // 关闭侧边栏
                    this.$emit('close');
                });
            }).catch(() => {
                // 用户取消操作
            });
        },
        // 投诉用户
        onComplaint() {
            this.$refs.complaint.open(1, this.userInfo.id, this.userInfo.nickName)
        },

        // 复制用户名/ID
        copyUserName(note) {
            // const userName = this.userInfo.userName;
            // 使用现代浏览器的 Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(note).then(() => {
                    this.$message.success(this.$t('chat.copySuccess', { content: note }));
                }).catch(() => {
                    this.$message.error(this.$t('chat.copyFailed'));
                });
            } else {
                this.$message.error(this.$t('chat.copyFailed'));
            }
        }
    },
    computed: {
        friend() {
            return this.friendStore.findFriend(this.userInfo.id) || {}
        }
    },
    watch: {
        userInfo: {
            handler() {
                // 从store或聊天信息中获取当前设置状态
                this.isDnd = this.friend.isDnd;
                this.isTop = this.friend.isTop;
                this.isInBlacklist = this.userInfo.isInBlacklist;
            },
            immediate: true
        }
    }
}
</script>

<style scoped lang="scss">
.chat-private-side {
    padding: 10px;
    position: relative;
    height: 100%;
    overflow-y: auto;
    box-sizing: border-box;

    // 公共卡片样式
    %card-style {
        padding: 5px 16px;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 10px;
        border: 1px solid rgba(0, 0, 0, 0.05);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .friend-info-section {
        .friend-card {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 20px;
            margin-bottom: 12px;
            @extend %card-style;

            .friend-avatar {
                flex-shrink: 0;
            }

            .friend-details {
                flex: 1;

                .friend-name-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;

                    .friend-name {
                        margin: 0;
                        font-size: var(--im-font-size-larger);
                        font-weight: 600;
                        color: var(--im-text-color);
                    }

                    .gender-icons {
                        .gender-icon {
                            font-size: 16px;
                            border-radius: 50%;
                            padding: 2px;
                            transition: all 0.3s ease;

                            &.male {
                                color: #1890ff;
                                background: rgba(24, 144, 255, 0.1);
                            }

                            &.female {
                                color: #f5222d;
                                background: rgba(245, 34, 45, 0.1);
                            }
                        }
                    }
                }

                .friend-company-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                    margin-left: 0;
                }

                .friend-id-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;

                    .friend-id {
                        margin: 0;
                        font-size: var(--im-font-size);
                        color: var(--im-text-color-light);
                        text-align: left;
                    }

                    .copy-btn {
                        font-size: 14px;
                        color: var(--im-color-primary);
                        cursor: pointer;
                        padding: 4px;
                        border-radius: 4px;
                        transition: all 0.3s ease;
                        opacity: 0.8;

                        &:hover {
                            background: rgba(64, 158, 255, 0.1);
                            opacity: 1;
                            transform: scale(1.1);
                        }
                    }
                }
            }
        }

        .personal-setting {
            margin-bottom: 12px;
            @extend %card-style;

            .switch-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 0;
                border-bottom: 1px solid rgba(0, 0, 0, 0.08);
                transition: all 0.2s ease;

                &:last-child {
                    border-bottom: none;
                }

                &:hover {
                    background: var(--im-background-active);
                    border-radius: 8px;
                    padding: 12px 8px;
                    margin: 0 -8px;
                }

                .label {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 14px;
                    font-weight: 500;
                    color: var(--im-text-color-primary);

                    i {
                        color: var(--im-color-primary);
                        font-size: 16px;
                        width: 18px;
                        text-align: center;
                    }
                }
            }
        }

        .friend-info-section-card {
            margin-bottom: 12px;
            @extend %card-style;

            .info-item {


                .info-label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin: 6px 0;
                    font-weight: 500;
                    color: var(--im-text-color-primary);
                    font-size: var(--im-font-size);

                    i {
                        color: var(--im-color-primary);
                        font-size: 13px;
                        width: 20px;
                        text-align: center;
                    }
                }

                .info-content {
                    .info-display {
                        display: flex;
                        align-items: center;
                        justify-content: flex-start;
                        padding: 6px 3px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        min-height: 32px;
                        border-radius: 8px;

                        &:hover {
                            background: var(--im-background-active);
                        }

                        span {
                            font-size: var(--im-font-size);
                            color: var(--im-text-color);
                            word-break: break-all;

                            &.info-placeholder {
                                color: var(--im-text-color-light);
                                font-style: italic;
                            }
                        }

                        i {
                            color: var(--im-text-color-light);
                            font-size: 11px;
                            opacity: 0.6;
                            margin-left: auto;
                        }
                    }
                }
            }
        }

        .btn-group {
            text-align: center;
            @extend %card-style;

            .text-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                padding: 12px 16px;
                font-size: var(--im-font-size);
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                border-radius: 6px;
                color: var(--im-color-danger);
                background: transparent;
                border: none;
                box-sizing: border-box;
                border-bottom: 1px solid rgba(0, 0, 0, 0.08);

                &:last-child {
                    border-bottom: none;
                }

                &:hover {
                    background: var(--im-background-active);
                }
            }
        }

        .complaint-tip {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 6px 12px;
            font-size: var(--im-font-size-smaller);
            color: var(--im-color-primary-light-2);
            cursor: pointer;
            margin-top: 8px;

            &:hover {
                color: var(--im-color-primary);
            }
        }
    }
}
</style>
