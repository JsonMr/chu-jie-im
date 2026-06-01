<template>
	<div class="home-page" @click="closeAllBox" @contextmenu="closeAllBox">
		<div class="app-container" :class="{ fullscreen: configStore.fullScreen }">
			<div class="navi-bar">
				<div class="navi-bar-box">
					<div class="top">
						<div class="avater" @click="showUserProfile">
							<head-image :name="mine.nickName" :size="42" :url="mine.headImageThumb">
							</head-image>
						</div>
						<div class="menu">
							<router-link class="link" v-bind:to="'/home/chat'">
								<div class="menu-item">
									<span class="icon iconfont icon-chat"></span>
									<div v-show="unreadCount > 0" class="unread-text">{{ unreadCount }}</div>
								</div>
							</router-link>
							<router-link class="link" v-bind:to="'/home/friend'">
								<div class="menu-item">
									<span class="icon iconfont icon-friend"></span>
									<div v-show="recvCount > 0" class="unread-text">{{ recvCount }}</div>
								</div>
							</router-link>
							<router-link class="link" v-bind:to="'/home/group'">
								<div class="menu-item">
									<span class="icon iconfont icon-group" style="font-size: 28px"></span>
								</div>
							</router-link>
							<router-link class="link" v-bind:to="'/home/setting'">
								<div class="menu-item">
									<span class="icon iconfont icon-setting" style="font-size: 20px"></span>
								</div>
							</router-link>
						</div>
					</div>

					<div class="bottom">
						<div v-if="!configStore.electronMode" class="bottom-item" @click="onSwtichFullScreen">
							<i class="el-icon-full-screen"></i>
						</div>
						<div class="bottom-item" @click="onExit()" :title="$t('home.logout')">
							<span class="icon iconfont icon-exit"></span>
						</div>
					</div>
				</div>
			</div>
			<div class="content-box">
				<router-view></router-view>
			</div>
			<user-info ref="userInfo"></user-info>
			<group-info ref="groupInfo"></group-info>
			<full-image ref="fullImage"></full-image>
			<preview-file ref="previewFile"></preview-file>
			<rtc-private-video ref="rtcPrivateVideo"></rtc-private-video>
			<rtc-group-video ref="rtcGroupVideo"></rtc-group-video>
			<user-profile-card ref="userProfileCard"></user-profile-card>
		</div>
	</div>
</template>

<script>
import HeadImage from '../components/common/HeadImage.vue';
import UserInfo from '../components/common/UserInfo.vue';
import GroupInfo from '../components/group/GroupInfo.vue';
import FullImage from '../components/common/FullImage.vue';
import RtcPrivateVideo from '../components/rtc/RtcPrivateVideo.vue';
import RtcPrivateAcceptor from '../components/rtc/RtcPrivateAcceptor.vue';
import RtcGroupVideo from '../components/rtc/RtcGroupVideo.vue';
import UserProfileCard from '../components/common/UserProfileCard.vue';
import PreviewFile from '../components/common/PreviewFile.vue';

export default {
	components: {
		HeadImage,
		UserInfo,
		GroupInfo,
		FullImage,
		RtcPrivateVideo,
		RtcPrivateAcceptor,
		RtcGroupVideo,
		UserProfileCard,
		PreviewFile
	},
	data() {
		return {
			audio: false,
			lastPlayAudioTime: new Date().getTime() - 1000,
			reconnecting: false,
			notification: null,
			privateMessagesBuffer: [],
			groupMessagesBuffer: [],
			systemMessagesBuffer: []
		}
	},
	methods: {
		init() {
			this.$eventBus.$on('exit', () => {
				// 退出登陆
				this.onExit();
			});
			this.$eventBus.$on('openPrivateVideo', (rctInfo) => {
				// 进入单人视频通话
				this.$nextTick(() => this.$refs.rtcPrivateVideo.open(rctInfo));
			});
			this.$eventBus.$on('openGroupVideo', (rctInfo) => {
				// 进入多人视频通话
				this.$nextTick(() => this.$refs.rtcGroupVideo.open(rctInfo));
			});
			this.$eventBus.$on('openUserInfo', (user, pos) => {
				// 打开用户卡片
				this.$nextTick(() => this.$refs.userInfo.open(user, pos));
			});
			this.$eventBus.$on('openGroupInfo', (group, token, pos) => {
				// 打开群卡片
				this.$nextTick(() => this.$refs.groupInfo.open(group, token, pos));
			});
			this.$eventBus.$on('openFullImage', url => {
				// 图片大图
				this.$nextTick(() => this.$refs.fullImage.open(url));
			});
			this.$eventBus.$on('openPreviewFile', url => {
				// 文件预览
				this.$nextTick(() => this.$refs.previewFile.open(url));
			});

			this.$eventBus.$on('downloadImage', url => {
				//下载图片
				this.downloadViaCanvas(url, new Date().getTime());
			});

			this.configStore.setAppInit(false)
			this.loadStore().then(() => {
				// ws初始化
				this.$wsApi.connect(this.configStore.apiConfig.wsUrl, sessionStorage.getItem("accessToken"));
				this.$wsApi.onConnect(() => {
					if (this.reconnecting) {
						this.onReconnectWs();
					} else {
						// 加载离线消息
						this.pullOfflineMessage();
						this.configStore.setAppInit(true);
					}
				});
				this.$wsApi.onMessage((cmd, msgInfo) => {
					if (cmd == 2) {
						// 关闭ws
						this.$wsApi.close(3000)
						// 异地登录，强制下线
						this.$alert(this.$t('home.forceLogout'), this.$t('home.forceLogoutTitle'), {
							confirmButtonText: this.$t('common.ok'),
							callback: action => {
								this.onExit();
							}
						});
					} else if (cmd == 3) {
						if (!this.configStore.appInit || this.chatStore.loading) {
							// 如果正在拉取离线消息，先放进缓存区，等待消息拉取完成再处理，防止消息乱序
							this.privateMessagesBuffer.push(msgInfo);
						} else {
							// 插入私聊消息
							this.handlePrivateMessage(msgInfo);
						}
					} else if (cmd == 4) {
						if (!this.configStore.appInit || this.chatStore.loading) {
							// 如果正在拉取离线消息，先放进缓存区，等待消息拉取完成再处理，防止消息乱序
							console.log("消息进入缓存区:", msgInfo)
							this.groupMessagesBuffer.push(msgInfo);
						} else {
							// 插入群聊消息
							this.handleGroupMessage(msgInfo);
						}
					} else if (cmd == 5) {
						if (!this.configStore.appInit || this.chatStore.loading) {
							// 如果正在拉取离线消息，先放进缓存区，等待消息拉取完成再处理，防止消息乱序
							this.systemMessagesBuffer.push(msgInfo);
						} else {
							// 处理系统消息
							this.handleSystemMessage(msgInfo);
						}
					}
				});
				this.$wsApi.onClose(e => {
					console.log(e);
					if (e.code != 3000) {
						// 断线重连
						this.reconnectWs();
						this.configStore.setAppInit(false)
					}
				});
			}).catch(e => {
				console.log(e)
				this.$message.error(this.$t('home.initFailed'));
				this.onExit();
			})
		},
		downloadViaCanvas(imgUrl, fileName) {
			const img = new Image();
			img.crossOrigin = 'Anonymous'; // 关键：声明跨域请求
			img.onload = () => {
				const canvas = document.createElement('canvas');
				canvas.width = img.width;
				canvas.height = img.height;
				const ctx = canvas.getContext('2d');
				ctx.drawImage(img, 0, 0);
				const url = canvas.toDataURL('image/png');
				const a = document.createElement('a');
				a.href = url;
				a.download = fileName || 'downloaded-image.png';
				a.click();
				URL.revokeObjectURL(url);
			};
			img.onerror = () => console.error('图片加载失败，可能未开启 CORS');
			img.src = imgUrl;
		},
		reconnectWs() {
			// 记录标志
			this.reconnecting = true;
			// 重新加载一次个人信息，目的是为了保证网络已经正常且token有效
			this.userStore.loadUser().then(() => {
				// 断线重连
				this.$message.error(this.$t('home.reconnecting'));
				this.$wsApi.reconnect(this.configStore.apiConfig.wsUrl, sessionStorage.getItem(
					"accessToken"));
			}).catch(() => {
				// 10s后重试
				setTimeout(() => this.reconnectWs(), 10000)
			})
		},
		onReconnectWs() {
			// 重连成功
			this.reconnecting = false;
			// 重新加载群和好友
			const promises = [];
			promises.push(this.friendStore.loadFriend());
			promises.push(this.groupStore.loadGroup());
			Promise.all(promises).then(() => {
				// 加载离线消息
				this.pullOfflineMessage();
				this.configStore.setAppInit(true);
				this.$message.success(this.$t('home.reconnectSuccess'));
			}).catch(() => {
				this.$message.error(this.$t('home.initFailed'));
				this.onExit();
			})
		},
		loadStore() {
			return this.userStore.loadUser().then(() => {
				const promises = [];
				promises.push(this.friendStore.loadFriend());
				promises.push(this.groupStore.loadGroup());
				promises.push(this.chatStore.loadChat());
				promises.push(this.configStore.loadConfig());
				return Promise.all(promises);
			})
		},
		unloadStore() {
			this.friendStore.clear();
			this.groupStore.clear();
			this.chatStore.clear();
			this.userStore.clear();
		},
		pullOfflineMessage() {
			let timeStamp = new Date().getTime();
			this.chatStore.setLoading(true);
			const promises = [];
			promises.push(this.pullPrivateOfflineMessage(this.chatStore.privateMsgMaxId));
			promises.push(this.pullGroupOfflineMessage(this.chatStore.groupMsgMaxId));
			promises.push(this.pullSystemOfflineMessage(this.chatStore.systemMsgMaxSeqNo));
			Promise.all(promises).then(messages => {
				// 处理离线消息
				messages[0].forEach(m => this.handlePrivateMessage(m));
				messages[1].forEach(m => this.handleGroupMessage(m));
				messages[2].forEach(m => this.handleSystemMessage(m));
				// 处理缓冲区收到的实时消息
				this.privateMessagesBuffer.forEach(m => this.handlePrivateMessage(m));
				this.groupMessagesBuffer.forEach(m => this.handleGroupMessage(m));
				this.systemMessagesBuffer.forEach(m => this.handleSystemMessage(m));
				// 清空缓冲区
				this.privateMessagesBuffer = [];
				this.groupMessagesBuffer = [];
				this.systemMessagesBuffer = [];
				// 关闭加载离线标记
				this.chatStore.setLoading(false);
				// 刷新会话
				this.chatStore.refreshChats();
				// 打印耗时
				let size = messages[0].length + messages[1].length + messages[2].length;
				let time = new Date().getTime() - timeStamp;
				console.log("加载离线消息耗时:", time, ",消息数量:", size)
			}).catch((e) => {
				console.log(e)
				this.$message.error(this.$t('home.pullMsgFailed'));
				this.onExit();
			})
		},
		pullPrivateOfflineMessage(minId) {
			return this.$http({
				url: "/message/private/loadOfflineMessage?minId=" + minId,
				method: 'GET'
			})
		},
		pullGroupOfflineMessage(minId) {
			return this.$http({
				url: "/message/group/loadOfflineMessage?minId=" + minId,
				method: 'GET'
			})
		},
		pullSystemOfflineMessage(minSeqNo) {
			return this.$http({
				url: "/message/system/loadOfflineMessage?minSeqNo=" + minSeqNo,
				method: 'GET'
			})
		},
		handlePrivateMessage(msg) {
			// 标记这条消息是不是自己发的
			msg.selfSend = msg.sendId == this.mine.id;
			// 好友id
			let friendId = msg.selfSend ? msg.recvId : msg.sendId;
			// 会话信息
			let chatInfo = {
				type: 'PRIVATE',
				targetId: friendId
			}
			// 消息已读处理，清空已读数量
			if (msg.type == this.$enums.MESSAGE_TYPE.READED) {
				this.chatStore.resetUnreadCount(chatInfo)
				return;
			}
			// 消息回执处理,改消息状态为已读
			if (msg.type == this.$enums.MESSAGE_TYPE.RECEIPT) {
				this.chatStore.readedMessage({
					friendId: msg.sendId
				})
				return;
			}
			// 消息撤回
			if (msg.type == this.$enums.MESSAGE_TYPE.RECALL) {
				this.chatStore.recallMessage(msg, chatInfo)
				return;
			}
			// 好友申请
			if (msg.type == this.$enums.MESSAGE_TYPE.FRIEND_REQ_APPLY) {
				this.friendStore.addRequest(JSON.parse(msg.content))
				return;
			}
			// 好友申请被同意、拒绝、撤回
			if (msg.type == this.$enums.MESSAGE_TYPE.FRIEND_REQ_APPROVE
				|| msg.type == this.$enums.MESSAGE_TYPE.FRIEND_REQ_REJECT
				|| msg.type == this.$enums.MESSAGE_TYPE.FRIEND_REQ_RECALL) {
				this.friendStore.removeRequest(JSON.parse(msg.content).id)
				return;
			}
			// 新增好友
			if (msg.type == this.$enums.MESSAGE_TYPE.FRIEND_NEW) {
				this.friendStore.addFriend(JSON.parse(msg.content));
				return;
			}
			// 删除好友
			if (msg.type == this.$enums.MESSAGE_TYPE.FRIEND_DEL) {
				this.friendStore.removeFriend(friendId);
				this.chatStore.removeChat(chatInfo);
				return;
			}
			// 好友在线状态
			if (msg.type == this.$enums.MESSAGE_TYPE.FRIEND_ONLINE) {
				this.friendStore.updateOnlineStatus(JSON.parse(msg.content));
				return;
			}
			// 对好友设置免打扰
			if (msg.type == this.$enums.MESSAGE_TYPE.FRIEND_DND) {
				this.friendStore.setDnd(friendId, JSON.parse(msg.content));
				this.chatStore.setDnd(chatInfo, JSON.parse(msg.content));
				return;
			}
			// 对好友进行会话置顶
			if (msg.type == this.$enums.MESSAGE_TYPE.FRIEND_TOP) {
				this.friendStore.setTop(friendId, JSON.parse(msg.content));
				this.chatStore.setTop(chatInfo, JSON.parse(msg.content));
				return;
			}
			// 单人webrtc 信令
			if (this.$msgType.isRtcPrivate(msg.type)) {
				this.$refs.rtcPrivateVideo.onRTCMessage(msg)
				return;
			}
			// 消息插入
			if (this.$msgType.isNormal(msg.type) || this.$msgType.isTip(msg.type) || this.$msgType.isAction(msg.type)) {
				let friend = this.loadFriendInfo(friendId);
				this.insertPrivateMessage(friend, msg);
			}
		},
		insertPrivateMessage(friend, msg) {
			let chatInfo = {
				type: 'PRIVATE',
				targetId: friend.id,
				showName: friend.showNickName,
				headImage: friend.headImage,
				companyName: friend.companyName,
				isDnd: friend.isDnd,
				isTop: friend.isTop
			};
			// 打开会话
			this.chatStore.openChat(chatInfo);
			// 插入消息
			this.chatStore.insertMessage(msg, chatInfo);
			if (!friend.isDnd && !this.chatStore.loading &&
				!msg.selfSend && this.$msgType.isNormal(msg.type)
				&& msg.status != this.$enums.MESSAGE_STATUS.READED) {
				// 播放提示音
				this.playAudioTip();
				// 消息提醒
				let chat = this.chatStore.findChat(chatInfo);
				this.showNotification(chat, friend.showNickName, friend.headImage)
			}
		},
		handleGroupMessage(msg) {
			// 标记这条消息是不是自己发的
			msg.selfSend = msg.sendId == this.mine.id;
			// 发送用户昵称优先显示好友备注的名字
			if (msg.sendId && msg.sendNickName) {
				let f = this.friendStore.findFriend(msg.sendId);
				if (f && !f.deleted && f.remarkNickName) {
					msg.sendNickName = f.remarkNickName;
				}
			}
			let chatInfo = {
				type: 'GROUP',
				targetId: msg.groupId
			}
			// 消息已读处理
			if (msg.type == this.$enums.MESSAGE_TYPE.READED) {
				// 我已读对方的消息，清空已读数量
				this.chatStore.resetUnreadCount(chatInfo)
				this.chatStore.resetAtMessage(chatInfo)
				return;
			}
			// 消息回执处理
			if (msg.type == this.$enums.MESSAGE_TYPE.RECEIPT) {
				// 更新消息已读人数
				let msgInfo = {
					id: msg.id,
					groupId: msg.groupId,
					readedCount: msg.readedCount,
					receiptOk: msg.receiptOk
				};
				this.chatStore.updateMessage(msgInfo, chatInfo)
				return;
			}
			// 消息撤回
			if (msg.type == this.$enums.MESSAGE_TYPE.RECALL) {
				this.chatStore.recallMessage(msg, chatInfo)
				return;
			}
			// 新增群
			if (msg.type == this.$enums.MESSAGE_TYPE.GROUP_NEW) {
				this.groupStore.addGroup(JSON.parse(msg.content));
				return;
			}
			// 删除群
			if (msg.type == this.$enums.MESSAGE_TYPE.GROUP_DEL) {
				this.groupStore.removeGroup(msg.groupId);
				this.chatStore.removeChat(chatInfo);
				return;
			}
			// 群消息置顶
			if (msg.type == this.$enums.MESSAGE_TYPE.GROUP_TOP_MESSAGE) {
				let topMessage = msg.content ? JSON.parse(msg.content) : null;
				this.groupStore.updateTopMessage(msg.groupId, topMessage);
				return;
			}
			// 对群设置免打扰
			if (msg.type == this.$enums.MESSAGE_TYPE.GROUP_DND) {
				this.groupStore.setDnd(msg.groupId, JSON.parse(msg.content));
				this.chatStore.setDnd(chatInfo, JSON.parse(msg.content));
				return;
			}
			// 群全体禁言
			if (msg.type == this.$enums.MESSAGE_TYPE.GROUP_ALL_MUTED) {
				this.groupStore.setAllMuted(msg.groupId, JSON.parse(msg.content));
				return;
			}
			// 被禁言
			if (msg.type == this.$enums.MESSAGE_TYPE.GROUP_MEMBER_MUTED) {
				this.groupStore.setMuted(msg.groupId, JSON.parse(msg.content));
				return;
			}
			// 对好友进行会话置顶
			if (msg.type == this.$enums.MESSAGE_TYPE.GROUP_TOP) {
				this.groupStore.setTop(msg.groupId, JSON.parse(msg.content));
				this.chatStore.setTop(chatInfo, JSON.parse(msg.content));
				return;
			}
			// 群通话信令
			if (this.$msgType.isRtcGroup(msg.type)) {
				if (msg.type == this.$enums.MESSAGE_TYPE.RTC_GROUP_INFO) {
					// 群通话状态变化
					const rtcInfo = JSON.parse(msg.content);
					this.groupStore.setRtcInfo(msg.groupId, rtcInfo);
				} else {
					this.$nextTick(() => {
						this.$refs.rtcGroupVideo.onRTCMessage(msg);
					})
				}
				return;
			}
			// 插入群聊消息
			if (this.$msgType.isNormal(msg.type) || this.$msgType.isTip(msg.type) || this.$msgType.isAction(msg.type)) {
				let group = this.loadGroupInfo(msg.groupId);
				this.insertGroupMessage(group, msg);
			}
		},
		insertGroupMessage(group, msg) {
			let chatInfo = {
				type: 'GROUP',
				targetId: group.id,
				showName: group.showGroupName,
				headImage: group.headImageThumb,
				isDnd: group.isDnd,
				isTop: group.isTop
			};
			// 打开会话
			this.chatStore.openChat(chatInfo);
			// 插入消息
			this.chatStore.insertMessage(msg, chatInfo);
			// 提示音和消息提醒
			if (!group.isDnd && !msg.selfSend && !this.chatStore.loading && this.$msgType.isNormal(msg.type)
				&& msg.status != this.$enums.MESSAGE_STATUS.READED) {
				// 播放提示音
				this.playAudioTip();
				// 消息提醒
				let chat = this.chatStore.findChat(chatInfo);
				this.showNotification(chat, group.showGroupName, group.headImageThumb)
			}
		},
		handleSystemMessage(msg) {
			// 消息已读处理，清空已读数量
			if (msg.type == this.$enums.MESSAGE_TYPE.READED) {
				this.chatStore.resetUnreadCount({
					type: 'SYSTEM',
					targetId: 0
				})
				return;
			}
			// 用户被封禁
			if (msg.type == this.$enums.MESSAGE_TYPE.USER_BANNED) {
				this.$wsApi.close(3000);
				this.$alert(this.$t('home.accountBannedReason', { reason: msg.content }), this.$t('home.accountBannedTitle'), {
					confirmButtonText: this.$t('common.ok'),
					callback: action => {
						this.onExit();
					}
				});
				return;
			}
			// 用户账户注销
			if (msg.type == this.$enums.MESSAGE_TYPE.USER_UNREG) {
				this.$wsApi.close(3000);
				this.$alert(this.$t('home.accountCancelled'), {
					confirmButtonText: this.$t('common.ok'),
					callback: action => {
						this.onExit();
					}
				});
				return;
			}
			// 插入消息
			this.insertSystemMessage(msg);
		},
		insertSystemMessage(msg) {
			let headImage = require('@/assets/image/chat_system.png')
			let chatInfo = {
				type: 'SYSTEM',
				targetId: 0,
				showName: this.$t('home.systemNotify'),
				headImage: headImage
			};
			// 打开会话
			this.chatStore.openChat(chatInfo);
			// 插入消息
			this.chatStore.insertMessage(msg, chatInfo);
		},
		onSwtichFullScreen() {
			this.configStore.setFullScreen(!this.configStore.fullScreen);
		},
		onExit() {
			this.unloadStore();
			this.configStore.setAppInit(false);
			this.$wsApi.close(3000);
			sessionStorage.removeItem("accessToken");
			localStorage.setItem("isAutoLogin", false)
			this.$router.push("/login");
		},
		closeAllBox() {
			this.$refs.groupInfo.close();
			this.$refs.userInfo.close();
		},
		playAudioTip() {
			// 播放间隔必须大于1s
			let interval = new Date().getTime() - this.lastPlayAudioTime;
			if (this.mine.isAudioTip && interval > 1000) {
				if (!this.audio) {
					this.audio = new Audio();
					this.audio.src = require(`@/assets/audio/tip.mp3`);
				}
				this.lastPlayAudioTime = new Date().getTime();
				this.audio.play();
			}
		},
		showNotification(chat, title, icon) {
			// 消息提醒
			if (window.Notification && window.electronAPI) {
				// 当窗口失去焦点，则弹出通知消息
				window.electronAPI.invoke("isFocused").then(foucus => {
					if (!foucus) {
						this.notification && this.notification.close();
						let iconPath = icon ? icon : 'logo.ico';
						this.notification = new Notification(title, {
							body: chat.lastContent,
							icon: iconPath
						})
						// 点击通知消息，激活聊天会话
						this.notification.onclick = () => {
							this.chatStore.openChat(chat);
							this.chatStore.setActiveChat(chat);
							this.$router.push("/home/chat");
							// 唤醒在后台的客户端
							window.electronAPI.sendEvent("show");
						}
					}
				})
			}
		},
		loadFriendInfo(id) {
			let friend = this.friendStore.findFriend(id);
			if (!friend) {
				friend = {
					id: id,
					showNickName: this.$t('home.unknownUser'),
					headImage: ""
				}
			}
			return friend;
		},
		loadGroupInfo(id) {
			let group = this.groupStore.findGroup(id);
			if (!group) {
				group = {
					id: id,
					showGroupName: this.$t('home.unknownGroup'),
					headImageThumb: ""
				}
			}
			return group;
		},
		showUserProfile() {
			this.$refs.userProfileCard.open();
		}
	},
	computed: {
		mine() {
			return this.userStore.userInfo;
		},
		unreadCount() {
			let unreadCount = 0;
			let chats = this.chatStore.chats;
			chats.forEach((chat) => {
				if (!chat.delete && !chat.isDnd) {
					unreadCount += chat.unreadCount
				}
			});
			return unreadCount;
		},
		recvCount() {
			let requests = this.friendStore.requests;
			return requests.filter((req) => req.recvId == this.mine.id).length;
		}
	},
	watch: {
		unreadCount: {
			handler(newCount, oldCount) {
				let tip = newCount > 0 ? this.$t('home.nUnreadTitle', { n: newCount }) : "";
				this.$elm.setTitleTip(tip);
				// 控制托盘图标闪烁
				if (window.electronAPI) {
					if (newCount > 0) {
						// 有未读消息时，检查窗口是否在焦点
						window.electronAPI.invoke('isFocused').then(foucus => {
							if (!foucus) {
								// 窗口不在焦点时开始闪烁
								window.electronAPI.sendEvent('startTrayBlink');
							}
						});
					} else {
						// 没有未读消息时停止闪烁
						window.electronAPI.sendEvent('stopTrayBlink');
					}
				}
			},
			immediate: true
		}
	},
	mounted() {
		this.$wsApi.close();
		this.init();
		// 修改electron窗口尺寸
		window.electronAPI && window.electronAPI.sendEvent('resize', {
			width: 970,
			height: 660,
			maximizable: true
		})
		window.electronAPI && window.electronAPI.sendEvent('center')
	},
	unmounted() {
		this.$wsApi.close();
	}
}
</script>

<style scoped lang="scss">
.home-page {
	height: 100vh;
	width: 100vw;
	display: flex;
	justify-content: center;
	align-items: center;
	border-radius: 4px;
	overflow: hidden;
	background: var(--im-color-primary-light-9);

	.app-container {
		width: 100%;
		height: 100%;
		// width: 62vw;
		// height: 80vh;
		display: flex;
		// min-height: 660px;
		// min-width: 970px;
		position: absolute;
		border-radius: 4px;
		overflow: hidden;
		box-shadow: var(--im-box-shadow-dark);
		transition: 0.2s;

		&.fullscreen {
			transition: 0.2s;
			width: 100vw;
			height: 100vh;
		}
	}

	.navi-bar {
		--icon-font-size: 22px;
		--width: 70px;
		width: var(--width);
		background: linear-gradient(180deg, var(--im-color-primary-light-1) 0%, var(--im-color-primary-light-2) 100%);
		padding-top: 25px;
		position: relative;
		box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);

		// 添加顶部装饰线
		&::before {
			content: '';
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			height: 3px;
			background: linear-gradient(90deg, var(--im-color-primary) 0%, var(--im-color-primary-light-3) 50%, var(--im-color-primary) 100%);
		}

		.navi-bar-box {
			height: 100%;
			display: flex;
			flex-direction: column;
			justify-content: space-between;

			.bottom {
				margin-bottom: 25px;
			}
		}

		.avater {
			display: flex;
			justify-content: center;
			margin-bottom: 10px;

			// 为头像添加容器样式
			:deep(.head-image) {
				border: 3px solid rgba(255, 255, 255, 0.2);
				border-radius: 50%;
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
				transition: all 0.3s ease;

				&:hover {
					border-color: rgba(255, 255, 255, 0.4);
					transform: scale(1.05);
					box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
				}
			}
		}

		.menu {
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-content: center;
			flex-wrap: wrap;
			margin-top: 25px;
			gap: 8px;

			.link {
				text-decoration: none;
				display: flex;
				justify-content: center;
			}

			.router-link-active .menu-item {
				color: white;
				background: linear-gradient(135deg, var(--im-color-primary-light-2) 0%, var(--im-color-primary) 100%);
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
				transform: translateX(2px);

				&::before {
					opacity: 1;
					transform: scale(1);
				}
			}

			.link:not(.router-link-active) .menu-item:hover {
				background: linear-gradient(135deg, var(--im-color-primary) 0%, var(--im-color-primary-light-2) 100%);
				transform: scale(1.08) translateX(2px);
				box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
				color: white;
			}

			.menu-item {
				position: relative;
				color: rgba(255, 255, 255, 0.8);
				width: 50px;
				height: 50px;
				display: flex;
				justify-content: center;
				align-items: center;
				margin-top: 10px;
				border-radius: 12px;
				transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
				cursor: pointer;

				// 添加左侧指示条
				&::before {
					content: '';
					position: absolute;
					left: -5px;
					width: 3px;
					height: 20px;
					background: white;
					border-radius: 2px;
					opacity: 0;
					transition: all 0.3s ease;
				}

				.icon {
					font-size: var(--icon-font-size);
					transition: all 0.3s ease;
				}

				.unread-text {
					position: absolute;
					background: var(--im-color-danger);
					left: 32px;
					top: 3px;
					color: white;
					border-radius: 10px;
					padding: 1px 6px;
					font-size: 10px;
					font-weight: 600;
					text-align: center;
					white-space: nowrap;
					border: 1px solid rgba(255, 255, 255, 0.9);
					box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
					min-width: 16px;
					height: 16px;
					display: flex;
					align-items: center;
					justify-content: center;
					z-index: 1;
				}
			}
		}

		.bottom-item {
			display: flex;
			justify-content: center;
			align-items: center;
			height: 45px;
			width: 100%;
			cursor: pointer;
			color: rgba(255, 255, 255, 0.7);
			font-size: var(--icon-font-size);
			border-radius: 8px;
			margin: 4px 0;
			transition: all 0.3s ease;
			position: relative;

			.icon {
				font-size: var(--icon-font-size);
				transition: all 0.3s ease;
			}

			&:hover {
				color: white;
				background: rgba(255, 255, 255, 0.1);
				transform: scale(1.05);

				.icon {
					transform: scale(1.1);
				}
			}

			&:active {
				transform: scale(0.95);
			}
		}
	}

	.content-box {
		flex: 1;
		padding: 0;
		background: var(--im-background);
		text-align: center;
	}
}
</style>
