<template>
	<div class="chat-box" @click="onClickChatBox()" @mousemove="readedMessage()">
		<SeamlessScroll :data="sensitiveText" v-if="sensitiveShow" @handleClose="handleClose">
		</SeamlessScroll>
		<el-container>
			<el-header height="60px" :class="configStore.electronMode ? 'header-menu-wrap' : ''">
				<div class="title">{{ title }}</div>
				<div v-if="chat.companyName" class="company-tag" :title="chat.companyName">@{{ chat.companyName }}</div>
				<span :title="$t('chat.groupInfo')" class="btn-side el-icon-more" @click="onClickMore"></span>
			</el-header>

			<el-main style="padding: 0;">
				<el-container>
					<el-container class="content-box">
						<div v-if="isGroup && group.topMessage">
							<chat-top-message :group="group" :groupMembers="groupMembers" :msgInfo="group.topMessage"
								:headImage="headImage(group.topMessage)" :showName="showName(group.topMessage)"
								@locate="locateMessage">
							</chat-top-message>
						</div>
						<chat-group-rtc-banner v-if="isGroup && group.rtcInfo && group.rtcInfo.isChating"
							:rtcInfo="group.rtcInfo" @join="onGroupVideo()">
						</chat-group-rtc-banner>
						<el-main class="im-chat-main" id="chatScrollBox" @scroll="onScroll">
							<div class="im-chat-box" :class="{ 'multi-select-mode': isMultiSelectMode }">
								<div v-for="(msgInfo, idx) in showMessages" :key="showMinIdx + idx"
									:class="{ 'message-selected': isMessageSelected(msgInfo) }"
									@click="onMessageClick($event, msgInfo)">
									 <!-- && msgInfo.type != $enums.MESSAGE_TYPE.AUDIO -->
									<div v-if="isMultiSelectMode && isAllowSelectMessage(msgInfo)"
										class="message-checkbox" @click.stop>
										<el-checkbox :value="isMessageSelected(msgInfo)"
											@change="toggleMessageSelect(msgInfo)"></el-checkbox>
									</div>
									<chat-message-item :id="msgInfo.id" @call="onCall(msgInfo.type)"
										:active="activeMessageIdx == showMinIdx + idx || isMessageSelected(msgInfo)"
										:mine="msgInfo.sendId == mine.id" :headImage="headImage(msgInfo)"
										:showName="showName(msgInfo)" :msgInfo="msgInfo"
										:quoteShowName="showName(msgInfo.quoteMessage)" :group="group"
										:groupMembers="groupMembers" @locateQuote="onLocateQuoteMessage"
										@copy="onCopyMessage" @resend="onResendMessage" @delete="onDeleteMessage"
										@recall="onRecallMessage" @quote="onQuoteMessage" @top="onTopMessage"
										@forward="onForwardMessage" @multiSelect="onMultiSelectMessage"
										@addSticker="onAddToSticker" @download="onDownloadFile" @atMember="onAtMember">
									</chat-message-item>
								</div>
							</div>
						</el-main>
						<!-- 多选操作工具栏 -->
						<div v-if="isMultiSelectMode" class="multi-select-toolbar">
							<div class="toolbar-info">
								{{ $t('chat.selectedCount', { n: selectedMessages.length }) }}
								<span v-if="selectedMessages.length >= 20" class="max-limit-tip">（{{ $t('chat.maxLimit')
								}}）</span>
							</div>
							<div class="toolbar-actions">
								<el-button size="small" type="primary" @click.stop="onBatchForward"
									:disabled="selectedMessages.length === 0">{{ $t('chat.forwardOneByOne')
									}}</el-button>
								<el-button size="small" type="success" @click.stop="onMergeForward"
									:disabled="selectedMessages.length < 2">{{ $t('chat.mergeForward') }}</el-button>
								<el-button size="small" type="danger" @click.stop="onBatchDelete"
									:disabled="selectedMessages.length === 0">{{ $t('common.delete') }}</el-button>
								<el-button size="small" @click="exitMultiSelectMode">{{ $t('common.cancel')
								}}</el-button>
							</div>
						</div>
						<div v-if="chat.atMe || chat.atAll" class="locate-tip" @click="scrollToAtMessage">{{
							$t('chat.atMe') }} </div>
						<div v-else-if="!isInBottom" class="locate-tip" @click="scrollToBottom">
							{{ newMessageSize > 0 ? $t('chat.newMessages', { n: newMessageSize }) :
								$t('chat.backToBottom') }}
						</div>
						<el-footer height="220px" class="im-chat-footer">
							<div class="chat-tool-bar">
								<div :title="$t('chat.emoji')" class="icon iconfont icon-emoji" ref="emotion"
									@click.stop="showEmotionBox()">
								</div>
								<div v-if="configStore.electronMode" :title="$t('chat.screenshotShortcut')"
									class="icon iconfont icon-screenshot" ref="emotion" @click.stop="onScreenshot()">
								</div>
								<i v-if="configStore.electronMode" class="el-icon-caret-bottom"
									@click="onShowScreenshotMenu"></i>
								<div :title="$t('chat.sendImage')">
									<file-upload :action="'/image/upload'" :maxSize="100 * 1024 * 1024"
										:fileTypes="['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif']"
										@before="onImageBefore" @success="onImageSuccess" @fail="onImageFail">
										<i class="el-icon-picture-outline"></i>
									</file-upload>
								</div>
								<div :title="$t('chat.sendVideo')">
									<file-upload :action="'/video/upload'" :maxSize="500 * 1024 * 1024"
										:fileTypes="['video/mp4']" @before="onVideoBefore" @success="onVideoSuccess"
										@fail="onVideoFail">
										<i class="el-icon-film"></i>
									</file-upload>
								</div>
								<div :title="$t('chat.sendFile')">
									<file-upload ref="fileUpload" :action="'/file/upload'" :maxSize="100 * 1024 * 1024"
										@before="onFileBefore" @success="onFileSuccess" @fail="onFileFail">
										<i class="el-icon-wallet"></i>
									</file-upload>
								</div>
								<!-- <div :title="$t('chat.receiptMsg')" v-show="isGroup" class="icon iconfont icon-receipt"
									:class="isReceipt ? 'chat-tool-active' : ''" @click="onSwitchReceipt">
								</div> -->
								<div :title="$t('chat.sendVoice')" class="el-icon-microphone" @click="showRecordBox()">
								</div>
								<div :title="$t('chat.voiceCall')" v-show="isPrivate" class="el-icon-phone-outline"
									@click="showPrivateVideo('voice')">
								</div>
								<!-- <div :title="$t('chat.groupCall')" v-show="isGroup" class="el-icon-video-camera"
									@click="onGroupVideo()">
								</div> -->
								<!-- <div :title="$t('chat.videoCall')" v-show="isPrivate" class="el-icon-video-camera"
									@click="showPrivateVideo('video')">
								</div> -->
								<div :title="$t('chat.chatHistory')" class="icon iconfont icon-chat-history"
									@click="showHistoryBox()"></div>
							</div>
							<div class="send-content-area">
								<ChatInput :group="group" ref="chatInputEditor" :group-members="groupMembers"
									@submit="sendMessage" />
								<div v-if="quoteMessage" class="quote-message">
									<chat-quote-message :showName="showName(quoteMessage)" :msgInfo="quoteMessage">
									</chat-quote-message>
									<div class="quote-remove" @click="onQuoteMessage(null)"><i
											class="el-icon-close"></i></div>
								</div>
								<div class="send-btn-area">
									<el-button type="primary" icon="el-icon-s-promotion" @click="notifySend()">{{
										$t('common.send') }}</el-button>
								</div>
							</div>
							<div class="chat-editer-mask" v-if="notAllowInputTip">
								<span class="icon el-icon-warning"></span>
								<span>{{ notAllowInputTip }}</span>
							</div>
						</el-footer>
					</el-container>
					<el-aside class="chat-side-box" :class="{ fullscreen: configStore.fullScreen }" width="265px"
						v-if="showSide">
						<chat-group-side v-if="isGroup" :chat="chat" :groupId="group.id" :groupMembers="groupMembers"
							@reload="loadGroup(group.id)"></chat-group-side>
						<chat-private-side v-if="isPrivate" :chat="chat" :userInfo="userInfo"></chat-private-side>
					</el-aside>
				</el-container>
			</el-main>
			<chat-emotion ref="emoBox" @emotion="onEmotion"></chat-emotion>
			<chat-record :visible="showRecord" @close="closeRecordBox" @send="onSendRecord"></chat-record>
			<group-member-selector v-if="isGroup" ref="rtcSel" :title="$t('rtc.inviteMember')" :group="group"
				@complete="onInviteOk"></group-member-selector>
			<chat-selector ref="chatSel" :title="$t('chat.forwardMsg')"></chat-selector>
			<rtc-group-join v-if="isGroup" ref="rtcJoin" :groupId="group.id"></rtc-group-join>
			<chat-history ref="chatHistory" :chat="chat" :friend="friend" :group="group" @locateQuote="locateMessage"
				:groupMembers="groupMembers"></chat-history>
			<right-menu ref="rightMenu" @select="onSelectMenu"></right-menu>
		</el-container>
	</div>
</template>

<script>
	import axios from 'axios'
	import ChatGroupSide from "./ChatGroupSide.vue";
	import ChatPrivateSide from "./ChatPrivateSide.vue";
	import ChatMessageItem from "./ChatMessageItem.vue";
	import FileUpload from "../common/FileUpload.vue";
	import ChatEmotion from "./ChatEmotion.vue";
	import ChatRecord from "./ChatRecord.vue";
	import ChatHistory from "./ChatHistory.vue";
	import ChatAtBox from "./ChatAtBox.vue"
	import GroupMemberSelector from "../group/GroupMemberSelector.vue"
	import ChatSelector from "./ChatSelector.vue";
	import RtcGroupJoin from "../rtc/RtcGroupJoin.vue"
	import ChatInput from "./ChatInput";
	import ChatQuoteMessage from "./ChatQuoteMessage.vue";
	import ChatTopMessage from "./ChatTopMessage.vue";
	import ChatGroupRtcBanner from "./ChatGroupRtcBanner.vue";
	import configStore from "../../store/configStore";
	import RightMenu from '../../components/common/RightMenu.vue';
	import SeamlessScroll from "../../components/common/SeamlessScroll.vue";

	export default {
		name: "chatBox",
		components: {
			ChatInput,
			ChatMessageItem,
			FileUpload,
			ChatGroupSide,
			ChatPrivateSide,
			ChatEmotion,
			ChatRecord,
			ChatHistory,
			ChatAtBox,
			GroupMemberSelector,
			RtcGroupJoin,
			ChatQuoteMessage,
			ChatTopMessage,
			ChatGroupRtcBanner,
			ChatSelector,
			RightMenu,
			SeamlessScroll
		},
		props: {
			chat: {
				type: Object
			}
		},
		data() {
			return {
				userInfo: {},
				groupId: null,
				sendImageUrl: "",
				sendImageFile: "",
				isReceipt: true, // 是否回执消息
				showRecord: false, // 是否显示语音录制弹窗
				showSide: false, // 是否显示群聊信息栏
				showMinIdx: 0, // 下标低于showMinIdx的消息不显示，否则页面会很卡
				showMaxIdx: -1, // 下标大于showMaxIdx的消息不显示，否则可能很卡,-1表示不限制
				activeMessageIdx: -1, //选择消息idx（单条选中，用于定位）
				selectedMessages: [], // 多选消息数组（使用数组以支持Vue响应式）
				isMultiSelectMode: false, // 是否处于多选模式
				quoteMessage: null, // 被引用的消息
				reqQueue: [], // 等待发送的请求队列
				isSending: false, // 是否正在发消息
				isInBottom: true, // 滚动条是否在底部
				newMessageSize: 0, // 滚动条不在底部时新的消息数量
				maxTmpId: 0, // 最后生成的临时id
				sensitiveText: [],
				sensitiveShow: false,
				sensitiveList: []
			}
		},
		methods: {
			moveChatToTop() {
				this.chatStore.moveTop(this.chat);
			},
			onClickChatBox() {
				// 关闭表情窗口
				this.$refs.emoBox.close();
				// 取消消息选中
				this.activeMessageIdx = -1;
				// 如果不在多选模式，点击空白区域退出多选模式
				if (this.isMultiSelectMode) {
					this.exitMultiSelectMode();
				}
			},
			enterMultiSelectMode(msgInfo) {
				// if (msgInfo.type != this.$enums.MESSAGE_TYPE.AUDIO) {
					this.isMultiSelectMode = true;
					this.selectedMessages = [];
					this.toggleMessageSelect(msgInfo);
				// }
			},
			exitMultiSelectMode() {
				this.isMultiSelectMode = false;
				this.selectedMessages = [];
			},
			isAllowSelectMessage(msgInfo) {
				return this.$msgType.isNormal(msgInfo.type) || this.$msgType.isAction(msgInfo.type);
			},
			toggleMessageSelect(msgInfo) {
				if (!this.isMultiSelectMode) {
					this.enterMultiSelectMode(msgInfo);
					return;
				}
				const index = this.selectedMessages.indexOf(msgInfo);
				if (index > -1) {
					// 取消选中
					this.selectedMessages.splice(index, 1);
				} else {
					// 检查是否已达到最大选择数量
					if (this.selectedMessages.length >= 20) {
						this.$message.warning(this.$t('chat.maxSelect20'));
						return;
					}
					// 选中
					this.selectedMessages.push(msgInfo);
				}
				// 如果没有选中任何消息，退出多选模式
				if (this.selectedMessages.length === 0) {
					this.exitMultiSelectMode();
				}
			},
			isMessageSelected(msgInfo) {
				return this.selectedMessages.indexOf(msgInfo) > -1;
			},
			onCall(type) {
				if (type == this.$enums.MESSAGE_TYPE.ACT_RT_VOICE) {
					this.showPrivateVideo('voice');
				} else if (type == this.$enums.MESSAGE_TYPE.ACT_RT_VIDEO) {
					this.showPrivateVideo('video');
				}
			},
			onSwitchReceipt() {
				this.isReceipt = !this.isReceipt;
			},
			onImageSuccess(data, file) {
				console.log("onImageSuccess")
				let msgInfo = JSON.parse(JSON.stringify(file.msgInfo));
				msgInfo.content = JSON.stringify(data);
				msgInfo.receipt = this.isReceipt;
				this.sendMessageRequest(file.chat, msgInfo).then(m => {
					msgInfo.id = m.id;
					msgInfo.status = m.status;
					this.isReceipt = false;
					this.chatStore.updateMessage(msgInfo, file.chat);
				}).catch((e) => {
					console.log(e)
					msgInfo.status = this.$enums.MESSAGE_STATUS.FAILED;
					this.chatStore.updateMessage(msgInfo, file.chat);
				})
			},
			onImageFail(e, file) {
				let msgInfo = JSON.parse(JSON.stringify(file.msgInfo));
				msgInfo.status = this.$enums.MESSAGE_STATUS.FAILED;
				this.chatStore.updateMessage(msgInfo, file.chat);
			},
			onImageBefore(file) {
				let url = URL.createObjectURL(file);
				let data = {
					originUrl: url,
					thumbUrl: url
				}
				let msgInfo = {
					tmpId: this.generateId(),
					fileId: file.uid,
					sendId: this.mine.id,
					content: JSON.stringify(data),
					sendTime: new Date().getTime(),
					selfSend: true,
					type: this.$enums.MESSAGE_TYPE.IMAGE,
					readedCount: 0,
					status: this.$enums.MESSAGE_STATUS.SENDING
				}
				// 填充对方id
				this.fillTargetId(msgInfo, this.chat.targetId);
				// 插入消息
				this.chatStore.insertMessage(msgInfo, this.chat);
				// 会话置顶
				this.moveChatToTop();
				// 借助file对象保存
				file.msgInfo = msgInfo;
				file.chat = this.chat;
				// 更新图片尺寸
				let chat = this.chat;
				this.getImageSize(file).then(size => {
					data.width = size.width;
					data.height = size.height;
					msgInfo.content = JSON.stringify(data)
					this.chatStore.updateMessage(msgInfo, chat);
					this.scrollToBottom();
				})
			},
			onFileSuccess(url, file) {
				let data = {
					name: file.name,
					size: file.size,
					url: url
				}
				let msgInfo = JSON.parse(JSON.stringify(file.msgInfo));
				msgInfo.content = JSON.stringify(data);
				msgInfo.receipt = this.isReceipt
				this.sendMessageRequest(file.chat, msgInfo).then((m) => {
					msgInfo.id = m.id;
					msgInfo.status = m.status;
					this.isReceipt = false;
					this.chatStore.updateMessage(msgInfo, file.chat);
				}).catch(() => {
					msgInfo.status = this.$enums.MESSAGE_STATUS.FAILED;
					this.chatStore.updateMessage(msgInfo, file.chat);
				})
			},
			onFileFail(e, file) {
				let msgInfo = JSON.parse(JSON.stringify(file.msgInfo));
				msgInfo.status = this.$enums.MESSAGE_STATUS.FAILED;
				this.chatStore.updateMessage(msgInfo, file.chat);
			},
			onFileBefore(file) {
				let url = URL.createObjectURL(file);
				let data = {
					name: file.name,
					size: file.size,
					url: url
				}
				let msgInfo = {
					tmpId: this.generateId(),
					sendId: this.mine.id,
					content: JSON.stringify(data),
					sendTime: new Date().getTime(),
					selfSend: true,
					type: this.$enums.MESSAGE_TYPE.FILE,
					readedCount: 0,
					status: this.$enums.MESSAGE_STATUS.SENDING
				}
				// 填充对方id
				this.fillTargetId(msgInfo, this.chat.targetId);
				// 插入消息
				this.chatStore.insertMessage(msgInfo, this.chat);
				// 会话置顶
				this.moveChatToTop();
				// 借助file对象透传
				file.msgInfo = msgInfo;
				file.chat = this.chat;
			},
			onVideoSuccess(data, file) {
				let msgInfo = JSON.parse(JSON.stringify(file.msgInfo));
				msgInfo.content = JSON.stringify(data);
				msgInfo.receipt = this.isReceipt;
				this.sendMessageRequest(file.chat, msgInfo).then(m => {
					msgInfo.id = m.id;
					msgInfo.status = m.status;
					this.isReceipt = false;
					this.chatStore.updateMessage(msgInfo, file.chat);
				}).catch(() => {
					msgInfo.status = this.$enums.MESSAGE_STATUS.FAILED;
					this.chatStore.updateMessage(msgInfo, file.chat);
				})
			},
			onVideoFail(e, file) {
				let msgInfo = JSON.parse(JSON.stringify(file.msgInfo));
				msgInfo.status = this.$enums.MESSAGE_STATUS.FAILED;
				this.chatStore.updateMessage(msgInfo, file.chat);
			},
			onVideoBefore(file) {
				let url = URL.createObjectURL(file);
				let data = {
					videoUrl: url
				}
				let msgInfo = {
					tmpId: this.generateId(),
					sendId: this.mine.id,
					content: JSON.stringify(data),
					sendTime: new Date().getTime(),
					selfSend: true,
					type: this.$enums.MESSAGE_TYPE.VIDEO,
					readedCount: 0,
					status: this.$enums.MESSAGE_STATUS.SENDING
				}
				// 填充对方id
				this.fillTargetId(msgInfo, this.chat.targetId);
				// 插入消息
				this.chatStore.insertMessage(msgInfo, this.chat);
				// 会话置顶
				this.moveChatToTop();
				// 借助file对象透传
				file.msgInfo = msgInfo;
				file.chat = this.chat;
				// 更新视频尺寸
				let chat = this.chat;
				this.getVideoSize(file).then(size => {
					data.width = size.width;
					data.height = size.height;
					msgInfo.content = JSON.stringify(data)
					this.chatStore.updateMessage(msgInfo, chat);
					this.scrollToBottom();
				})
			},
			onClickMore() {
				this.showSide = !this.showSide;
				if (this.showSide && this.isGroup) {
					// 刷新一下群和成员信息
					this.loadGroup(this.group.id);
				}
			},
			onScroll(e) {
				let scrollElement = e.target
				let scrollTop = scrollElement.scrollTop
				// 滚到顶部
				if (scrollTop < 30) {
					// 多展示20条信息
					this.showMinIdx = this.showMinIdx > 20 ? this.showMinIdx - 20 : 0;
					// 清除底部标志
					this.isInBottom = false;
					this.refreshAtMessage();
				}
				// 滚到底部
				if (scrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight - 30) {
					if (this.showMaxIdx > 0) {
						// 多展示20条信息
						this.showMaxIdx += 20;
					}
					// 已滚至消息底部
					if (this.showMaxIdx >= this.messageSize) {
						this.showMaxIdx = -1;
					}
					// 设置底部标志
					if (this.showMaxIdx < 0) {
						this.isInBottom = true;
						this.newMessageSize = 0;
					}
				}
			},
			showEmotionBox() {
				let width = this.$refs.emotion.offsetWidth;
				let left = this.$elm.fixLeft(this.$refs.emotion);
				let top = this.$elm.fixTop(this.$refs.emotion);
				this.$refs.emoBox.open({
					x: left + width / 2,
					y: top
				})
			},
			onScreenshot() {
				window.electronAPI.invoke('screenshot').then((buffer) => {
					if (buffer) {
						// 粘贴截图到聊天编辑框
						this.$refs.chatInputEditor.pasteScreenShot(buffer);
					}
				})
			},
			onShowScreenshotMenu(e) {
				let menuItems = [{
					key: 'SCREEN_SHOT',
					name: this.$t('chat.screenshotHideWindow'),
				}];
				this.$refs.rightMenu.open(e, menuItems)
			},
			screenshotAndHideWin() {
				// 隐藏当前窗口
				window.electronAPI.sendEvent("close");
				setTimeout(() => {
					window.electronAPI.invoke('screenshot').then((buffer) => {
						if (buffer) {
							// 粘贴截图到聊天编辑框
							this.$refs.chatInputEditor.pasteScreenShot(buffer);
						}
						// 截图完成后还原窗口
						window.electronAPI.sendEvent("show");
					})
				}, 100)
			},
			onSelectMenu(item) {
				switch (item.key) {
					case "SCREEN_SHOT":
						this.screenshotAndHideWin();
						break;
				}
			},
			onEmotion(payload) {
				if (typeof payload === 'string') {
					this.$refs.chatInputEditor.insertEmoji(payload);
					return;
				}
				if (payload && payload.type === 'sticker' && payload.data) {
					this.sendStickerMessage(payload.data);
				}
			},
			showRecordBox() {
				this.showRecord = true;
			},
			closeRecordBox() {
				this.showRecord = false;
			},
			showPrivateVideo(mode) {
				if (!this.isFriend) {
					this.$message.error(this.$t('chat.notFriendCall'));
					return
				}
				if (this.userStore.isInRtc) {
					this.$message.error(this.$t('chat.inCall'));
					return;
				}
				let rtcInfo = {
					mode: mode,
					isHost: true,
					friend: this.friend,
				}
				// 通过home.vue打开单人视频窗口
				this.$eventBus.$emit("openPrivateVideo", rtcInfo);
			},
			onGroupVideo() {
				if (this.userStore.isInRtc) {
					this.$message.error(this.$t('chat.inCall'));
					return;
				}
				this.$http({
					url: "/webrtc/group/info?groupId=" + this.group.id,
					method: 'GET'
				}).then((rtcInfo) => {
					if (rtcInfo.isChating) {
						// 已在通话中，可以直接加入通话
						this.$refs.rtcJoin.open(rtcInfo);
					} else {
						// 邀请成员发起通话
						let ids = [this.mine.id];
						let maxChannel = this.configStore.webrtc.maxChannel;
						this.$refs.rtcSel.open(maxChannel, ids, ids, []);
					}
				})
			},
			onInviteOk(members) {
				if (members.length < 2) {
					return;
				}
				let userInfos = [];
				members.forEach(m => {
					userInfos.push({
						id: m.userId,
						nickName: m.showNickName,
						headImage: m.headImage,
						isCamera: false,
						isMicroPhone: true,
						isShareScreen: false
					})
				})
				let rtcInfo = {
					isHost: true,
					groupId: this.group.id,
					inviterId: this.mine.id,
					userInfos: userInfos
				}
				// 通过home.vue打开多人视频窗口
				this.$eventBus.$emit("openGroupVideo", rtcInfo);
			},
			showHistoryBox() {
				this.$refs.chatHistory.open();
			},
			onSendRecord(data) {
				let msgInfo = {
					tmpId: this.generateId(),
					content: JSON.stringify(data),
					type: this.$enums.MESSAGE_TYPE.AUDIO,
					receipt: this.isReceipt
				}
				// 填充对方id
				this.fillTargetId(msgInfo, this.chat.targetId);
				// 防止发送期间用户切换会话导致串扰
				const chat = this.chat;
				// 临时消息回显	
				let tmpMessage = this.buildTmpMessage(msgInfo);
				this.chatStore.insertMessage(tmpMessage, chat);
				this.moveChatToTop();
				this.sendMessageRequest(chat, msgInfo).then(m => {
					// 更新消息
					tmpMessage.id = m.id;
					tmpMessage.status = m.status;
					this.chatStore.updateMessage(tmpMessage, chat);
					// 保持输入框焦点
					this.$refs.chatInputEditor.focus();
					// 滚动到底部
					this.scrollToBottom();
					// 关闭录音窗口
					this.showRecord = false;
					this.isReceipt = false;
				}).catch(() => {
					tmpMessage.status = this.$enums.MESSAGE_STATUS.FAILED;
					this.chatStore.updateMessage(tmpMessage, chat);
				})
			},
			fillTargetId(msgInfo, targetId) {
				if (this.isGroup) {
					msgInfo.groupId = targetId;
				} else {
					msgInfo.recvId = targetId;
				}
			},
			notifySend() {
				this.$refs.chatInputEditor.submit();
			},
			async sendMessage(fullList) {
				this.resetEditor();
				this.readedMessage();
				let sendText = this.isReceipt ? this.$t("chat.receiptMessage") : "";
				fullList.forEach(async msg => {
					switch (msg.type) {
						case "text":
							await this.sendTextMessage(sendText + msg.content, msg.atUserIds);
							break;
						case "image":
							await this.sendImageMessage(msg.content.file);
							break;
						case "file":
							await this.sendFileMessage(msg.content.file);
							break;
					}
				})
			},
			sendImageMessage(file) {
				return new Promise((resolve, reject) => {
					this.onImageBefore(file);
					let formData = new FormData()
					formData.append('file', file)
					this.$http.post("/image/upload?isPermanent=false", formData, {
						headers: {
							'Content-Type': 'multipart/form-data'
						}
					}).then((data) => {
						this.onImageSuccess(data, file);
						resolve();
					}).catch((res) => {
						this.onImageFail(res, file);
						reject();
					})
					this.$nextTick(() => this.$refs.chatInputEditor.focus());
					this.scrollToBottom();
				});
			},
			sendTextMessage(sendText, atUserIds) {
				return new Promise((resolve, reject) => {
					if (!sendText.trim()) {
						reject();
					}
					let msgInfo = {
						tmpId: this.generateId(),
						content: sendText,
						type: this.$enums.MESSAGE_TYPE.TEXT
					}
					// 填充对方id
					this.fillTargetId(msgInfo, this.chat.targetId);
					// 被@人员列表
					if (this.isGroup) {
						msgInfo.atUserIds = atUserIds;
						msgInfo.receipt = this.isReceipt;
					}
					// 引用消息
					if (this.quoteMessage) {
						msgInfo.quoteMessageId = this.quoteMessage.id
					}
					// 防止发送期间用户切换会话导致串扰
					const chat = this.chat;
					// 回显消息
					let tmpMessage = this.buildTmpMessage(msgInfo);
					this.chatStore.insertMessage(tmpMessage, chat);
					this.moveChatToTop();
					// 发送
					this.sendMessageRequest(chat, msgInfo).then(m => {
						// 更新消息
						tmpMessage.id = m.id;
						tmpMessage.status = m.status;
						tmpMessage.content = m.content;
						tmpMessage.quoteMessage = m.quoteMessage;
						this.chatStore.updateMessage(tmpMessage, chat);
					}).catch(() => {
						// 更新消息
						tmpMessage.status = this.$enums.MESSAGE_STATUS.FAILED;
						this.chatStore.updateMessage(tmpMessage, chat);
					}).finally(() => {
						this.isReceipt = false;
						this.quoteMessage = null;
						resolve();
					});
				});
			},
			sendFileMessage(file) {
				return new Promise((resolve, reject) => {
					let check = this.$refs.fileUpload.beforeUpload(file);
					if (check) {
						this.$refs.fileUpload.onFileUpload({
							file
						});
					}
				})
			},
			onCopyMessage(msgInfo) {
				// 使用现代浏览器的 Clipboard API
				if (navigator.clipboard && window.isSecureContext) {
					navigator.clipboard.writeText(msgInfo.content).then(() => {
						this.$message.success(this.$t('chat.copySuccess2'));
					}).catch(() => {
						this.$message.error(this.$t('chat.copyFailed'));
					});
				} else {
					this.$message.error(this.$t('chat.copyFailed'));
				}
			},
			onResendMessage(msgInfo) {
				// if (msgInfo.type != this.$enums.MESSAGE_TYPE.TEXT) {
				// 	this.$message.error(this.$t('chat.resendNotSupport'))
				// 	return;
				// }
				// 防止发送期间用户切换会话导致串扰
				const chat = this.chat;
				// 删除旧消息
				this.chatStore.deleteMessage(msgInfo, chat);
				// 重新推送
				msgInfo.tmpId = this.generateId();
				let tmpMessage = this.buildTmpMessage(msgInfo);
				this.chatStore.insertMessage(tmpMessage, chat);
				this.moveChatToTop();
				// 发送
				this.sendMessageRequest(chat, msgInfo).then(m => {
					// 更新消息
					tmpMessage.id = m.id;
					tmpMessage.status = m.status;
					tmpMessage.content = m.content;
					this.chatStore.updateMessage(tmpMessage, chat);
				}).catch(() => {
					// 更新消息
					tmpMessage.status = this.$enums.MESSAGE_STATUS.FAILED;
					this.chatStore.updateMessage(tmpMessage, chat);
				}).finally(() => {
					this.scrollToBottom();
				});
			},
			onMessageClick(e, msgInfo) {
				if (this.isMultiSelectMode) {
					// 选中
					if (this.isAllowSelectMessage(msgInfo)) {
						this.toggleMessageSelect(msgInfo);
					}
					e.stopPropagation();
				}
			},
			onMultiSelectMessage(msgInfo) {
				// 进入多选模式
				this.enterMultiSelectMode(msgInfo);
			},
			onDeleteMessage(msgInfo) {
				this.$confirm(this.$t('chat.deleteMsgConfirm'), this.$t('chat.deleteMsgTitle'), {
					confirmButtonText: this.$t('common.ok'),
					cancelButtonText: this.$t('common.cancel'),
					type: 'warning'
				}).then(async () => {
					if (msgInfo.id) {
						const data = {
							chatId: this.chat.targetId,
							messageIds: [msgInfo.id]
						}
						await this.$http({
							url: `/message/${this.chat.type.toLowerCase()}/deleteMessage`,
							method: 'delete',
							data: data
						});
					}
					this.chatStore.deleteMessage(msgInfo, this.chat);
					this.chatStore.refreshLastContent(this.chat);
				});
			},
			onAddToSticker(msgInfo) {
				const sticker = JSON.parse(msgInfo.content);
				this.$http({
					url: '/sticker/custom/add',
					method: 'post',
					data: sticker
				}).then(() => {
					this.$message.success(this.$t('chat.addStickerSuccess'));
					// 刷新表情面板的自定义表情列表
					if (this.$refs.emoBox && this.$refs.emoBox.refreshCustomStickers) {
						this.$refs.emoBox.refreshCustomStickers();
					}
				})
			},
			onDownloadFile(msgInfo) {
				const url = JSON.parse(msgInfo.content).url;
				const name = JSON.parse(msgInfo.content).name;
				let a = document.createElement('a')
				a.download = name
				a.style.display = 'none'
				a.href = url
				a.target = "_blank"
				document.body.appendChild(a)
				a.click()
				document.body.removeChild(a)
			},
			// 批量删除消息
			onBatchDelete() {
				if (this.selectedMessages.length === 0) {
					this.$message.warning(this.$t('chat.selectToDelete'));
					return;
				}
				this.$confirm(this.$t('chat.batchDeleteConfirm', {
					n: this.selectedMessages.length
				}), this.$t('chat.batchDeleteTitle'), {
					confirmButtonText: this.$t('common.ok'),
					cancelButtonText: this.$t('common.cancel'),
					type: 'warning'
				}).then(async () => {
					const ids = this.selectedMessages.filter(m => m.id).map(m => m.id);
					if (ids.length > 0) {
						const data = {
							chatId: this.chat.targetId,
							messageIds: ids
						}
						await this.$http({
							url: `/message/${this.chat.type.toLowerCase()}/deleteMessage`,
							method: 'delete',
							data: data
						});
					}
					this.selectedMessages.forEach(msgInfo => {
						this.chatStore.deleteMessage(msgInfo, this.chat);
					});
					this.chatStore.refreshLastContent(this.chat);
					this.exitMultiSelectMode();
					this.$message.success(this.$t('chat.deleteSuccess'));
				});
			},
			// 批量转发消息（逐条转发）
			onBatchForward() {
				if (this.selectedMessages.length === 0) {
					this.$message.warning(this.$t('chat.selectToForward'));
					return;
				}
				// 需要过滤掉的消息类型
				const filteredTypes = [
					this.$enums.MESSAGE_TYPE.ACT_RT_VOICE, // 语音通话
					this.$enums.MESSAGE_TYPE.ACT_RT_VIDEO, // 视频通话
					this.$enums.MESSAGE_TYPE.USER_CARD, // 个人名片
					this.$enums.MESSAGE_TYPE.GROUP_CARD // 群名片
				];
				// 统计被过滤的消息（未发送成功的消息 + 不支持转发的消息类型）
				const forwardableMessages = this.selectedMessages.filter(msg =>
					msg.id && !filteredTypes.includes(msg.type)
				);
				// 如果有被过滤的消息，提示用户
				if (forwardableMessages.length < this.selectedMessages.length) {
					this.$confirm(this.$t('chat.forwardTip'), this.$t('common.tip'), {
						confirmButtonText: this.$t('chat.continueSend'),
						cancelButtonText: this.$t('common.cancel'),
						type: 'warning'
					}).then(() => {
						// 用户确认后继续转发
						this.doBatchForward(forwardableMessages);
					})
					return;
				}
				this.doBatchForward(forwardableMessages);
			},
			// 执行批量转发
			async doBatchForward(forwardableMessages) {
				if (forwardableMessages.length === 0) {
					this.$message.warning(this.$t('chat.noForwardMsg'));
					return;
				}
				this.$refs.chatSel.open(async (chats) => {
					this.exitMultiSelectMode();
					// 逐个会话逐条发送消息，保证顺序
					let successCount = 0;
					let totalCount = chats.length * forwardableMessages.length;
					let completedCount = 0;

					// 对每个会话串行发送消息
					for (const chat of chats) {
						// 对每条消息串行发送，保证顺序
						for (const msgInfo of forwardableMessages) {
							try {
								let message = {
									content: msgInfo.content,
									type: msgInfo.type
								}
								if (chat.type == 'GROUP') {
									message.groupId = chat.targetId
								} else {
									message.recvId = chat.targetId;
								}
								const m = await this.$http({
									url: `/message/${chat.type.toLowerCase()}/send`,
									method: 'post',
									data: message
								});
								m.selfSend = true;
								this.chatStore.openChat(chat);
								this.chatStore.insertMessage(m, chat);
								successCount++;
							} finally {
								completedCount++;
								// 所有消息发送完成
								if (completedCount === totalCount) {
									if (successCount === totalCount) {
										this.$message.success(this.$t('chat.forwardSuccessToChats', {
											n: forwardableMessages.length,
											m: chats.length
										}));
									} else {
										this.$message.warning(this.$t('chat.forwardPartialFail', {
											success: successCount,
											total: totalCount
										}));
									}
								}
							}
						}
					}
				});
			},
			// 合并转发消息
			onMergeForward() {
				if (this.selectedMessages.length < 2) {
					this.$message.warning(this.$t('chat.mergeForwardMin2'));
					return;
				}
				// 过滤出已发送成功的消息（有id的消息）
				const forwardableMessages = this.selectedMessages.filter(m => m.id).sort((a, b) => a.id - b.id);
				// 统计未发送成功的消息
				const unsentMessages = this.selectedMessages.filter(m => !m.id);
				// 如果有未发送成功的消息，提示用户
				if (unsentMessages.length > 0) {
					this.$confirm(this.$t('chat.unsentForwardTip', {
						n: unsentMessages.length
					}), this.$t('common.tip'), {
						confirmButtonText: this.$t('chat.continueSend'),
						cancelButtonText: this.$t('common.cancel'),
						type: 'warning'
					}).then(() => {
						// 用户确认后继续转发
						this.doMergeForward(forwardableMessages);
					})
					return;
				}
				this.doMergeForward(forwardableMessages);
			},
			// 执行合并转发
			doMergeForward(forwardableMessages) {
				if (forwardableMessages.length === 0) {
					this.$message.warning(this.$t('chat.noForwardMsg'));
					return;
				}
				// 使用 key+params 存储 title，语言切换时自动渲染
				let title;
				if (this.isGroup) {
					title = JSON.stringify({
						key: 'merge.title.groupChatHistory',
						params: [this.group.name]
					});
				} else {
					title = JSON.stringify({
						key: 'merge.title.privateChatHistory',
						params: [this.chat.showName, this.mine.nickName]
					});
				}
				// 构建合并转发的数据
				const mergeData = {
					messages: forwardableMessages.map(msg => {
						let message = {
							id: msg.id,
							type: msg.type,
							sendId: msg.sendId,
							sendNickName: this.showName(msg),
							sendHeadImage: this.headImage(msg),
							sendTime: msg.sendTime,
							content: msg.content
						}
						if (msg.type == this.$enums.MESSAGE_TYPE.MERGE_FORWARD) {
							// 合并转发里面又嵌套了合并转发内容，清空消息体避免报文体积过大
							const mergeData = JSON.parse(msg.content)
							mergeData.messages = mergeData.messages.map(m => m.id);
							message.content = JSON.stringify(mergeData);
						}
						return message;
					}),
					title: title,
					chatType: this.chat.type
				};
				// 用户确认后，打开会话选择器
				this.$refs.chatSel.open(chats => {
					this.exitMultiSelectMode();
					// 发送合并转发消息
					let successCount = 0;
					let totalCount = chats.length;
					let completedCount = 0;
					chats.forEach(chat => {
						let message = {
							content: JSON.stringify(mergeData),
							type: this.$enums.MESSAGE_TYPE.MERGE_FORWARD
						}
						if (chat.type == 'GROUP') {
							message.groupId = chat.targetId
						} else {
							message.recvId = chat.targetId;
						}
						this.$http({
							url: `/message/${chat.type.toLowerCase()}/send`,
							method: 'post',
							data: message
						}).then((m) => {
							m.selfSend = true;
							this.chatStore.openChat(chat);
							this.chatStore.insertMessage(m, chat);
							successCount++;
						}).finally(() => {
							completedCount++;
							if (completedCount === totalCount) {
								if (successCount === totalCount) {
									this.$message.success(this.$t(
										'chat.mergeForwardSuccessToChats', {
											n: forwardableMessages.length,
											m: chats.length
										}));
								} else {
									this.$message.warning(this.$t('chat.mergeForwardPartialFail', {
										success: successCount,
										total: totalCount
									}));
								}
							}
						})
					})
				});
			},
			onRecallMessage(msgInfo) {
				this.$confirm(this.$t('chat.recallConfirm'), this.$t('chat.recallTitle'), {
					confirmButtonText: this.$t('common.ok'),
					cancelButtonText: this.$t('common.cancel'),
					type: 'warning'
				}).then(() => {
					let url = `/message/${this.chat.type.toLowerCase()}/recall/${msgInfo.id}`
					this.$http({
						url: url,
						method: 'delete'
					}).then((m) => {
						this.$message.success(this.$t('chat.recallMsgSuccess'));
						m.selfSend = true;
						this.chatStore.recallMessage(m, this.chat);
					})
				});
			},
			onQuoteMessage(msgInfo) {
				this.quoteMessage = msgInfo;
			},
			onForwardMessage(msgInfo) {
				this.$refs.chatSel.open(chats => {
					// 逐个会话发送消息
					let idx = 0;
					chats.forEach(chat => {
						let message = {
							content: msgInfo.content,
							type: msgInfo.type
						}
						if (chat.type == 'GROUP') {
							message.groupId = chat.targetId
						} else {
							message.recvId = chat.targetId;
						}
						this.$http({
							url: `/message/${chat.type.toLowerCase()}/send`,
							method: 'post',
							data: message
						}).then((m) => {
							m.selfSend = true;
							this.chatStore.openChat(chat);
							this.chatStore.insertMessage(m, chat);
							if (++idx == chats.length) {
								this.$message.success(this.$t('chat.forwardSuccess'))
							}
						})
					})
				});
			},
			onTopMessage(msgInfo) {
				this.$http({
					url: `/group/setTopMessage/${msgInfo.groupId}?messageId=${msgInfo.id}`,
					method: 'post'
				}).then(() => {})
			},
			onLocateQuoteMessage(msgInfo) {
				this.locateMessage(msgInfo.quoteMessage);
			},
			locateMessage(msgInfo) {
				// 寻找消息位置
				const idx = this.findMessageIdx(msgInfo);
				if (idx < 0) {
					this.$message.error(this.$t('chat.locateFail'));
					return;
				}
				// 要定位到消息，首先要渲染这条消息
				this.showMinIdx = Math.max(idx - 10, 0);
				this.showMaxIdx = this.showMinIdx + 20;
				// 定位消息
				this.scrollToMessage(msgInfo.id, 100, 0);
				// 选中消息
				this.activeMessageIdx = idx;
				// 设置底部标记
				if (this.showMaxIdx > 0 && this.showMaxIdx < this.messageSize) {
					// 延时是为了在滚动事件触发之后设置
					setTimeout(() => {
						this.isInBottom = false;
						this.newMessageSize = 0;
					}, 100)
				}
				this.$refs.chatHistory.close();
			},
			scrollToMessage(id, delay, times) {
				setTimeout(() => {
					let messgaeItem = document.getElementById(id);
					if (messgaeItem) {
						messgaeItem.scrollIntoView({
							behavior: 'smooth'
						});
					} else if (times < 3) {
						this.scrollToMessage(id, delay * 3, times + 1)
					} else {
						console.log("消息定位失败", delay)
					}
				}, delay)
			},
			scrollToAtMessage() {
				this.locateMessage({
					id: this.chat.lastAtMessageId
				});
				this.chatStore.resetAtMessage(this.chat);
			},
			resetShowMessages() {
				// 初始状态仅渲染最后30条数据
				this.showMinIdx = this.messageSize > 30 ? this.messageSize - 30 : 0;
				this.showMaxIdx = -1;
				this.refreshAtMessage();
			},
			refreshAtMessage() {
				// @我的消息已读，需要清除“有人@我”标志
				if (this.chat.atMe || this.chat.atAll) {
					const idx = this.findMessageIdx({
						id: this.chat.lastAtMessageId
					});
					if (this.showMinIdx < idx) {
						this.chatStore.resetAtMessage(this.chat);
					}
				}
			},
			findMessageIdx(msgInfo) {
				for (let idx in this.chat.messages) {
					const message = this.chat.messages[idx];
					// 通过id判断
					if (msgInfo.id && message.id && message.id == msgInfo.id) {
						return idx;
					}
					// 正在发送中的消息可能没有id,只有tmpId
					if (msgInfo.tmpId && message.tmpId && message.tmpId == msgInfo.tmpId) {
						return idx;
					}
				}
				return -1;
			},
			readedMessage() {
				if (this.chat.unreadCount > 0) {
					if (this.isGroup) {
						var url = `/message/group/readed?groupId=${this.chat.targetId}&messageId=${this.maxMessageId}`
					} else {
						url = `/message/private/readed?friendId=${this.chat.targetId}`
					}
					this.$http({
						url: url,
						method: 'put'
					}).then(() => {})
					this.chatStore.resetUnreadCount(this.chat)
				}
			},
			loadReaded(fId) {
				this.$http({
					url: `/message/private/maxReadedId?friendId=${fId}`,
					method: 'get'
				}).then((id) => {
					this.chatStore.readedMessage({
						friendId: fId,
						maxId: id
					});
				});
			},
			loadGroup(groupId) {
				this.groupId = groupId;
				this.$http({
					url: `/group/find/${groupId}`,
					method: 'get'
				}).then((group) => {
					this.chatStore.updateChatFromGroup(group);
					this.groupStore.updateGroup(group);
					this.groupStore.refreshMember(groupId);
				});
			},
			updateFriendInfo() {
				if (this.isFriend) {
					// store的数据不能直接修改，深拷贝一份store的数据
					let friend = JSON.parse(JSON.stringify(this.friend));
					friend.headImage = this.userInfo.headImageThumb;
					friend.nickName = this.userInfo.nickName;
					friend.showNickName = friend.remarkNickName ? friend.remarkNickName : friend.nickName;
					this.chatStore.updateChatFromFriend(friend);
					this.friendStore.updateFriend(friend);
				} else {
					this.chatStore.updateChatFromUser(this.userInfo);
				}
			},
			loadFriend(friendId) {
				// 获取好友信息
				this.$http({
					url: `/user/find/${friendId}`,
					method: 'GET'
				}).then((userInfo) => {
					this.userInfo = userInfo;
					this.updateFriendInfo();
				})
			},
			showName(msgInfo) {
				if (!msgInfo) return "";
				if (this.isGroup) {
					let member = this.groupMembers.find(m => m.userId == msgInfo.sendId);
					return member ? member.showNickName : "";
				} else if (msgInfo.sendId == this.mine.id) {
					return this.mine.nickName;
				} else {
					return this.chat.showName;
				}
			},
			headImage(msgInfo) {
				if (this.isGroup) {
					let member = this.groupMembers.find((m) => m.userId == msgInfo.sendId);
					return member ? member.headImage : "";
				} else {
					return msgInfo.selfSend ? this.mine.headImageThumb : this.chat.headImage
				}
			},
			onAtMember(member) {
				this.$refs.chatInputEditor.insertAtMember(member);
			},
			resetEditor() {
				this.$nextTick(() => {
					this.$refs.chatInputEditor.clear();
					this.$refs.chatInputEditor.focus();
				});
			},
			scrollToBottom() {
				this.resetShowMessages();
				this.$nextTick(() => {
					let div = document.getElementById("chatScrollBox");
					div.scrollTop = div.scrollHeight;
				});
			},
			sendMessageRequest(chat, msgInfo) {
				return new Promise((resolve, reject) => {
					const action = this.messageAction(chat)
					// 请求入队列，防止请求"后发先至"，导致消息错序
					this.reqQueue.push({
						msgInfo,
						action,
						resolve,
						reject
					});
					this.processReqQueue();
				})
			},
			processReqQueue() {
				if (this.reqQueue.length && !this.isSending) {
					this.isSending = true;
					const reqData = this.reqQueue.shift();
					this.$http({
						url: reqData.action,
						method: 'post',
						data: reqData.msgInfo
					}).then((res) => {
						reqData.resolve(res)
					}).catch((e) => {
						reqData.reject(e)
					}).finally(() => {
						this.isSending = false;
						// 发送下一条请求
						this.processReqQueue();
					})
				}
			},
			buildTmpMessage(msgInfo) {
				let message = JSON.parse(JSON.stringify(msgInfo));
				message.sendId = this.mine.id;
				message.sendTime = new Date().getTime();
				message.status = this.$enums.MESSAGE_STATUS.SENDING;
				message.selfSend = true;
				if (this.isGroup) {
					message.readedCount = 0;
				}
				return message;
			},
			getImageSize(file) {
				return new Promise((resolve, reject) => {
					const reader = new FileReader();
					reader.onload = function(event) {
						const img = new Image();
						img.onload = function() {
							resolve({
								width: img.width,
								height: img.height
							});
						};
						img.onerror = function() {
							reject(new Error('无法加载图片'));
						};
						img.src = event.target.result;
					};
					reader.onerror = function() {
						reject(new Error('无法读取文件'));
					};
					reader.readAsDataURL(file);
				});
			},
			getVideoSize(file) {
				return new Promise((resolve) => {
					const url = URL.createObjectURL(file);
					const video = document.createElement('video');
					video.onloadedmetadata = () => {
						resolve({
							width: video.videoWidth,
							height: video.videoHeight
						});
						URL.revokeObjectURL(url);
					};
					video.src = url;
				});
			},
			generateId() {
				// 生成临时id 
				const id = String(new Date().getTime()) + String(Math.floor(Math.random() * 1000));
				// 必须保证id是递增
				if (this.maxTmpId > id) {
					return this.generateId();
				}
				this.maxTmpId = id;
				return id;
			},
			sendStickerMessage(sticker) {
				const msgInfo = {
					tmpId: this.generateId(),
					content: JSON.stringify(sticker),
					type: this.$enums.MESSAGE_TYPE.STICKER,
					receipt: this.isReceipt
				};
				this.fillTargetId(msgInfo, this.chat.targetId);
				const chat = this.chat;
				const tmpMessage = this.buildTmpMessage(msgInfo);
				tmpMessage.content = msgInfo.content;
				tmpMessage.type = msgInfo.type;
				this.chatStore.insertMessage(tmpMessage, chat);
				this.moveChatToTop();
				this.sendMessageRequest(chat, msgInfo).then(m => {
					tmpMessage.id = m.id;
					tmpMessage.status = m.status;
					tmpMessage.content = m.content || tmpMessage.content;
					this.chatStore.updateMessage(tmpMessage, chat);
				}).catch(() => {
					tmpMessage.status = this.$enums.MESSAGE_STATUS.FAILED;
					this.chatStore.updateMessage(tmpMessage, chat);
				}).finally(() => {
					this.scrollToBottom();
					this.isReceipt = false;
				})
			},
			messageAction(chat) {
				return `/message/${chat.type.toLowerCase()}/send`;
			},
			handleClose(e) {
				const key = this.mine.id + ',' + this.chat.targetId + this.chat.type;
				const sensitiveData = localStorage.getItem(key);
				if (!this.$isBlank(sensitiveData)) {
					let obj = JSON.parse(sensitiveData);
					obj.closeFlg = false;
					localStorage.setItem(key, JSON.stringify(obj));
					this.sensitiveShow = false;
				}
			},
			getSensitiveFlg() {
				const that = this;
				var num = new Date().getTime();
				var flg = false;
				var sendTime = 0;
				const key = this.mine.id + ',' + this.chat.targetId + this.chat.type;
				var sensitiveObj = localStorage.getItem(key);
				if (!this.$isBlank(sensitiveObj)) {
					var obj = JSON.parse(sensitiveObj)
					var closeFlg = obj.closeFlg
					sendTime = obj.sendTime
					if ((num - sendTime) <= 14400000) {
						if (closeFlg == true) {
							let apiUrl = '';
							if (process.env.VUE_APP_ENV == 'production') {
								apiUrl = process.env.VUE_APP_DEFAULT_BASE_API +
									'/im/service/getAllDictData';
							} else {
								apiUrl = '/admin-api/im/service/getAllDictData';
							}
							axios.get(apiUrl)
								.then((res) => {
									if (res.data.length > 0) {
										that.sensitiveText = [res.data[0], res.data[0]]
										that.sensitiveShow = true
									}
								})
						} else {
							this.sensitiveShow = false
							flg = true
						}
					}
				}
				console.log('@this.chat.messages', this.chat.messages)
				if (this.sensitiveShow == false && flg == false) {
					for (var i = 0; i < this.chat.messages.length; i++) {
						if (this.chat.messages[i].type == 0) {
							if ((num - this.chat.messages[i].sendTime) <= 14400000) {
								if (this.chat.messages[i].sendTime >= (sendTime + 14400000)) {
									const hasSensitiveWord = this.sensitiveList.some(word => this.chat.messages[i].content
										.includes(word));
									if (hasSensitiveWord) {
										let obj = {
											closeFlg: true,
											sendTime: this.chat.messages[i].sendTime
										}
										localStorage.setItem(key, JSON.stringify(obj));

										let apiUrl = '';
										if (process.env.VUE_APP_ENV == 'production') {
											apiUrl = process.env.VUE_APP_DEFAULT_BASE_API +
												'/im/service/getAllDictData';
										} else {
											apiUrl = '/admin-api/im/service/getAllDictData';
										}
										axios.get(apiUrl)
											.then((res) => {
												if (res.data.length > 0) {
													that.sensitiveText = [res.data[0], res.data[0]]
													that.sensitiveShow = true
													console.log('@that.sensitiveText', that.sensitiveText)
												}
											})
										break;
									}
								}
							}
						}
					}
				}
			}
		},
		computed: {
			mine() {
				return this.userStore.userInfo;
			},
			isFriend() {
				return this.friendStore.isFriend(this.userInfo.id);
			},
			friend() {
				return this.friendStore.findFriend(this.userInfo.id) || {}
			},
			group() {
				return this.groupStore.findGroup(this.groupId) || {}
			},
			groupMembers() {
				return this.group.members || [];
			},
			title() {
				let title = this.chat.showName;
				if (this.isGroup) {
					let size = this.groupMembers.filter(m => !m.quit).length;
					title += `(${size})`;
				}
				return title;
			},
			unreadCount() {
				return this.chat.unreadCount;
			},
			showMessages() {
				if (this.showMaxIdx > 0) {
					return this.chat.messages.slice(this.showMinIdx, this.showMaxIdx)
				} else {
					return this.chat.messages.slice(this.showMinIdx)
				}
			},
			messageSize() {
				if (!this.chat || !this.chat.messages) {
					return 0;
				}
				return this.chat.messages.length;
			},
			isGroup() {
				return this.chat.type == 'GROUP';
			},
			isPrivate() {
				return this.chat.type == 'PRIVATE';
			},
			isOwner() {
				return this.group.ownerId == this.mine.id;
			},
			isManager() {
				let m = this.groupMembers.find(m => m.userId == this.mine.id);
				return m && m.isManager;
			},
			loading() {
				return this.chatStore.loading;
			},
			maxMessageId() {
				for (let idx = this.chat.messages.length - 1; idx >= 0; idx--) {
					const message = this.chat.messages[idx];
					if (message.id) {
						return message.id;
					}
				}
				return 0;
			},
			notAllowInputTip() {
				if (this.isGroup) {
					if (this.group.dissolve) {
						return "群聊已解散"
					} else if (this.group.quit) {
						return "您已不在群聊中"
					} else if (this.group.isBanned) {
						let tip = `群聊已被封禁,原因:${this.group.reason}`;
						if (this.group.unbanTime) {
							tip += `,恢复时间: ${this.group.unbanTime}`;
						}
						return tip;
					} else if (this.group.isAllMuted && !this.isOwner && !this.isManager) {
						return "全员禁言中，只有群主和管理员发言"
					} else if (this.group.isMuted) {
						return "您已被群管理员禁言"
					}
				} else if (this.userInfo.isBanned) {
					let tip = `对方账号已被封禁,原因:${this.userInfo.reason}`;
					if (this.userInfo.unbanTime) {
						tip += `,恢复时间: ${this.userInfo.unbanTime}`;
					}
					return tip;
				}
				return "";
			}
		},
		watch: {
			chat: {
				handler(newChat, oldChat) {
					if (newChat.targetId > 0 && (!oldChat || newChat.type != oldChat.type ||
							newChat.targetId != oldChat.targetId)) {
						this.userInfo = {};
						this.groupId = null;
						if (this.isGroup) {
							this.loadGroup(this.chat.targetId);
						} else {
							this.loadFriend(this.chat.targetId);
							// 加载已读状态
							this.loadReaded(this.chat.targetId)
						}
						// 滚到底部
						this.scrollToBottom();
						this.showSide = false;
						// 消息已读
						this.readedMessage()
						// 初始状态只显示30条消息
						this.resetShowMessages();
						// 复位回执消息
						this.isReceipt = false;
						// 清空引用消息
						this.quoteMessage = null;
						// 复位底部标记
						this.isInBottom = true;
						this.newMessageSize = 0;
						// 清空消息临时id
						this.maxTmpId = 0;
						// 退出多选模式
						this.exitMultiSelectMode();
						this.$nextTick(() => {
							// 保存草稿
							this.$refs.chatInputEditor.saveDraft(oldChat);
							// 恢复草稿
							this.$refs.chatInputEditor.restoreDraft(newChat);
						})
					}
				},
				immediate: true
			},
			messageSize: {
				handler(newSize, oldSize) {
					if (newSize > oldSize) {
						// 收到普通消息,则滚动至底部
						let lastMessage = this.chat.messages[newSize - 1];
						if (lastMessage && this.$msgType.isNormal(lastMessage.type) || this.$msgType.isAction(lastMessage
								.type)) {
							if (this.isInBottom || lastMessage.selfSend) {
								this.scrollToBottom();
							} else {
								this.newMessageSize++;
							}
						}
					}
				}
			},
			loading: {
				handler(newLoading, oldLoading) {
					// 断线重连后，需要更新一下已读状态
					if (!newLoading && this.isPrivate) {
						this.loadReaded(this.chat.targetId)
					}
				}
			}
		},
		mounted() {
			let div = document.getElementById("chatScrollBox");
			div.addEventListener('scroll', this.onScroll)

			let sensitiveWord = localStorage.getItem('sensitiveWords');
			let sensWord = sensitiveWord ? JSON.parse(sensitiveWord) : [];
			if (sensWord.length > 0) {
				this.sensitiveList = sensWord;
			}

			this.getSensitiveFlg()
		}
	}
</script>

<style lang="scss">
	.chat-box {
		position: relative;
		width: 100%;

		.el-header {
			display: flex;
			padding: 0 12px;
			line-height: 60px;
			border-bottom: var(--im-border);

			.title {
				font-size: var(--im-font-size-larger);
			}


			.btn-side {
				position: absolute;
				right: 20px;
				line-height: 60px;
				font-size: 20px;
				cursor: pointer;
				color: var(--im-text-color-light);
			}
		}

		.content-box {
			position: relative;

			.im-chat-main {
				padding: 0 10px;
				background: #f6f7f8;

				.im-chat-box {
					position: relative;

					&.multi-select-mode {
						>div {
							position: relative;
							cursor: pointer;
							padding-left: 40px;
							transition: background-color 0.2s;

							&:hover {
								background-color: rgba(0, 0, 0, 0.02);
							}

							&.message-selected {
								background-color: var(--im-background-active-dark)
							}
						}

						.message-checkbox {
							position: absolute;
							left: 10px;
							top: 50%;
							transform: translateY(-50%);
							z-index: 10;
						}
					}
				}
			}

			.locate-tip {
				text-align: center;
				position: absolute;
				right: 20px;
				bottom: 230px;
				color: var(--im-color-primary);
				font-size: var(--im-font-size);
				font-weight: 600;
				background: white;
				padding: 8px 16px;
				border-radius: 18px;
				cursor: pointer;
				z-index: 99;
				box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
				transition: all 0.3s ease;
				border: 1px solid rgba(0, 0, 0, 0.06);

				&:hover {
					transform: translateY(-1px);
					box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
				}

			}

			.im-chat-footer {
				position: relative;
				display: flex;
				flex-direction: column;
				padding: 0;

				.chat-tool-bar {
					display: flex;
					position: relative;
					width: 100%;
					height: 44px;
					text-align: left;
					box-sizing: border-box;
					border-top: 2px solid #EBEEF5;
					padding: 6px 8px;
					align-items: center;
					background: var(--im-background-active);
					color: black;
					gap: 8px;
					opacity: 0.85;

					// 统一所有按钮的样式
					>div,
					>i {
						font-size: 20px;
						cursor: pointer;
						width: 32px;
						height: 32px;
						line-height: 32px;
						text-align: center;
						border-radius: 6px;

						transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
						display: flex;
						align-items: center;
						justify-content: center;
						position: relative;

						&.chat-tool-active {
							color: var(--im-color-primary);
							background: var(--im-background-active-dark);
							transform: scale(1.02);

						}

						&:hover {
							color: var(--im-color-primary);
							background: var(--im-background-active);
							transform: translateY(-1px);
							box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
						}
					}

					// 特殊处理小图标（如el-icon-caret-bottom）
					>i.el-icon-caret-bottom {
						font-size: 14px;
						width: 24px;
						height: 24px;
						line-height: 24px;
					}
				}

				.send-content-area {
					position: relative;
					display: flex;
					flex-direction: column;
					height: 100%;
					background-color: white !important;

					.quote-message {
						position: absolute;
						bottom: 10px;
						left: 10px;
						font-size: 14px;
						max-width: 80%;
						border-radius: 5px;

						&:hover .quote-remove {
							display: block;
						}

						.quote-remove {
							display: none;
							position: absolute;
							top: -8px;
							right: -8px;
							width: 20px;
							height: 20px;
							line-height: 20px;
							font-size: 14px;
							color: white;
							border-radius: 50%;
							background: #aaa;
							cursor: pointer;

							&:hover {
								background: #888;
							}

						}
					}

					.send-btn-area {
						padding: 10px;
						position: absolute;
						bottom: 4px;
						right: 6px;
					}
				}

				.chat-editer-mask {
					position: absolute;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					background: #f8f8f8d0;
					font-size: var(--im-font-size-large);
					color: var(--im-text-color-light);
					display: flex;
					justify-content: center;
					align-items: center;
					border-radius: 10px;
					border: 1px solid #ddd;

					.icon {
						font-size: var(--im-font-size-larger);
						margin-right: 3px;
					}
				}
			}
		}

		.chat-side-box {
			border-left: var(--im-border);
			background: #f6f7f8;

			&.fullscreen {
				width: 335px !important;
			}
		}

		.multi-select-toolbar {
			position: absolute;
			bottom: 230px;
			left: 50%;
			transform: translateX(-50%);
			background: white;
			border-radius: 8px;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
			padding: 12px 20px;
			display: flex;
			align-items: center;
			gap: 16px;
			z-index: 1000;
			border: 1px solid rgba(0, 0, 0, 0.1);
			min-width: 300px;

			.toolbar-info {
				font-size: var(--im-font-size);
				color: var(--im-text-color);
				font-weight: 500;
				white-space: nowrap;
				display: flex;
				align-items: center;
				gap: 4px;

				.max-limit-tip {
					color: var(--im-color-warning);
					font-size: var(--im-font-size-small);
				}
			}

			.toolbar-actions {
				display: flex;
				gap: 8px;
			}
		}
	}
</style>