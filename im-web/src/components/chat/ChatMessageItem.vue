<template>
	<div class="chat-message-item" :class="active ? 'active' : ''">
		<div class="message-tip" v-if="msgInfo.type == $enums.MESSAGE_TYPE.TIP_TEXT" v-html="parsedTipContent"
			@click="onClickTipMessage($event)">
		</div>
		<div class="message-tip" v-else-if="msgInfo.type == $enums.MESSAGE_TYPE.TIP_TIME">
			{{ $date.toTimeText(msgInfo.sendTime) }}
		</div>
		<div class="message-normal " v-else-if="isNormal || isAction" :class="{ 'message-mine': mine }">
			<div class="avatar" @contextmenu.prevent.stop="showAvatarMenu($event)">
				<head-image :name="showName" :size="38" :url="headImage" :id="msgInfo.sendId"></head-image>
			</div>
			<div class="content">
				<div v-if="msgInfo.groupId && !msgInfo.selfSend" class="top">
					<div class="show-name">{{ showName }}</div>
					<el-tag v-if="isGroupOwner(msgInfo.sendId)" size="mini" type="danger">{{ $t('group.owner')
					}}</el-tag>
					<el-tag v-if="isGroupManager(msgInfo.sendId)" size="mini" type="primary">{{ $t('group.manager')
					}}</el-tag>
				</div>
				<div class="bottom" :class="{ fullscreen: configStore.fullScreen }"
					@contextmenu.prevent="showMessageMenu($event)">
					<div ref="chatMsgBox" class="message-content-wrapper">
						<div class="message-text" v-if="isTextMessage" v-html="htmlText"
							@click="onClickTextMessage($event)">
						</div>
						<div class="message-image" v-else-if="msgInfo.type == $enums.MESSAGE_TYPE.IMAGE">
							<div class="image-container" :style="imageStyle">
								<img class="send-image" :src="contentData.thumbUrl" loading="lazy" />
								<div class="image-overlay">
									<i class="el-icon-zoom-in" @click="showFullImage()"></i>
									<i class="el-icon-copy-document" @click="copyImage()"></i>
									<i class="el-icon-download" @click="downloadImage()"></i>
								</div>
							</div>
						</div>
						<div class="message-video" v-else-if="msgInfo.type == $enums.MESSAGE_TYPE.VIDEO">
							<!-- <video class="send-video" :style="imageStyle" controls preload="none"
								:poster="contentData.coverUrl" :src="contentData.videoUrl" /> -->
							<my-video :key="contentData.coverUrl" :imageStyle="imageStyle"
								:coverUrl="contentData.coverUrl" :videoUrl="contentData.videoUrl" />
						</div>
						<div class="message-file" v-else-if="msgInfo.type == $enums.MESSAGE_TYPE.FILE">
							<div class="file-box" v-loading="sending">
								<div class="file-info">
									<div class="file-name" @click="onPreviewFile">{{
										contentData.name
									}}</div>
									<div class="file-size">{{ fileSize }}</div>
								</div>
								<div class="file-icon">
									<span type="primary" class="el-icon-document"></span>
								</div>
							</div>
						</div>
						<div class="message-sticker" v-else-if="msgInfo.type == $enums.MESSAGE_TYPE.STICKER"
							@click="showFullSticker()">
							<img :style="stickerStyle" :src="contentData.imageUrl" loading="lazy" />
						</div>
						<div class="message-voice" v-else-if="msgInfo.type == $enums.MESSAGE_TYPE.AUDIO"
							@click="onPlayVoice()">
							<audio controls :src="contentData.url"></audio>
						</div>
						<chat-user-card v-else-if="msgInfo.type == $enums.MESSAGE_TYPE.USER_CARD"
							:cardInfo="contentData"></chat-user-card>
						<chat-group-card v-else-if="msgInfo.type == $enums.MESSAGE_TYPE.GROUP_CARD"
							:cardInfo="contentData" :sendTime="msgInfo.sendTime"></chat-group-card>
						<div class="message-merge-forward" v-else-if="isMergeForward" @click="onClickMergeForward">
							<div class="merge-forward-header">
								<span class="merge-forward-title">{{ mergeForwardTitle }}</span>
								<span class="merge-forward-count">{{ $t('chat.newMessageCount', {
									n: contentData.messages.length
								}) }}</span>
							</div>
							<div class="merge-forward-preview">
								<div class="preview-item" v-for="(msg, idx) in mergeForwardPreview" :key="idx">
									<span class="preview-sender">{{ msg.sendNickName }}:</span>
									<span class="preview-content" v-if="msg.type == $enums.MESSAGE_TYPE.TEXT"
										v-html="$emo.transform($str.html2Escape(msg.content), 'emoji-small')"></span>
									<span class="preview-content" v-else>{{
										$msgUtil.previewContent(msg) }}</span>
								</div>
							</div>
						</div>
						<div class="chat-action message-text" v-else-if="isAction">
							<span v-if="msgInfo.type == $enums.MESSAGE_TYPE.ACT_RT_VOICE" :title="$t('chat.recallCall')"
								@click="$emit('call')" class="iconfont icon-chat-voice"></span>
							<span v-if="msgInfo.type == $enums.MESSAGE_TYPE.ACT_RT_VIDEO" :title="$t('chat.recallCall')"
								@click="$emit('call')" class="iconfont icon-chat-video"></span>
							<span>{{ displayContent }}</span>
						</div>
						<div v-else class="message-text">{{ $t('chat.unsupportedType') }}</div>
						<div :title="$t('chat.sending')" v-if="sending" class="sending" v-loading="sending"></div>
						<div :title="$t('chat.sendFail')" v-else-if="sendFail" @click="onSendFail"
							class="send-fail el-icon-warning">
						</div>
					</div>
					<div class="quote-message" v-if="msgInfo.quoteMessage"
						@contextmenu.prevent.stop="showQuoteMenu($event)">
						<chat-quote-message :msgInfo="msgInfo.quoteMessage"
							@click.native.stop="$emit('locateQuote', msgInfo)"
							:showName="quoteShowName"></chat-quote-message>
					</div>
					<div class="message-status" v-if="!isAction && msgInfo.selfSend && !isGroupMessage">
						<span class="chat-readed" v-if="msgInfo.status == $enums.MESSAGE_STATUS.READED">{{
							$t('chat.read') }}</span>
						<span class="chat-unread" v-else>{{ $t('chat.unread') }}</span>
					</div>
					<!-- v-if="msgInfo.receipt && msgInfo.selfSend" -->
					<div class="chat-receipt" v-if="msgInfo.groupId && (isOwner || isManager)" @click="onShowReadedBox">
						<span v-if="msgInfo.receiptOk" class="icon iconfont icon-ok" :title="$t('chat.allRead')"></span>
						<span v-else>{{ $t('chat.nRead', { n: msgInfo.readedCount }) }}</span>
					</div>
				</div>
			</div>
		</div>
		<right-menu ref="rightMenu" @select="onSelectMenu"></right-menu>
		<chat-group-readed ref="chatGroupReadedBox" :msgInfo="msgInfo" :group="group"
			:groupMembers="groupMembers"></chat-group-readed>
		<chat-merge-forward ref="mergeForward"></chat-merge-forward>
	</div>
</template>

<script>
	import HeadImage from "../common/HeadImage.vue";
	import RightMenu from '../common/RightMenu.vue';
	import ChatGroupReaded from './ChatGroupReaded.vue';
	import ChatQuoteMessage from "./ChatQuoteMessage.vue";
	import ChatUserCard from "./ChatUserCard.vue";
	import ChatGroupCard from "./ChatGroupCard.vue";
	import ChatMergeForward from "./ChatMergeForward.vue";
	import MyVideo from "../common/MyVideo.vue";
	import axios from 'axios';

	export default {
		name: "messageItem",
		components: {
			HeadImage,
			RightMenu,
			ChatGroupReaded,
			ChatQuoteMessage,
			ChatUserCard,
			ChatGroupCard,
			ChatMergeForward,
			MyVideo
		},
		props: {
			mode: {
				type: Number,
				default: 1
			},
			active: {
				type: Boolean,
				default: false
			},
			mine: {
				type: Boolean,
				required: true
			},
			headImage: {
				type: String,
				default: ''
			},
			showName: {
				type: String,
				required: true
			},
			quoteShowName: {
				type: String,
				default: ''
			},
			msgInfo: {
				type: Object,
				required: true
			},
			group: {
				type: Object,
			},
			groupMembers: {
				type: Array
			}
		},
		data() {
			return {
				avatarMenuEvent: null
			}
		},
		methods: {
			onSendFail() {
				this.$emit("resend", this.msgInfo);
			},
			parseTipMessage(content) {
				// 匹配格式：#{displayName:userId},正则表达式：#\{([^:]+):(\d+)\}
				const userMarkPattern = /#\{([^:]+):(\d+)\}/g;
				let lastIndex = 0;
				let result = '';
				let match;
				while ((match = userMarkPattern.exec(content)) !== null) {
					// 添加匹配前的文本
					result += this.$str.html2Escape(content.substring(lastIndex, match.index));
					let displayName = match[1];
					const userId = match[2];
					// 如果是当前登录用户，用"你"代替用户昵称
					if (userId == this.userStore.userInfo.id) {
						displayName = this.$t('chat.you');
					}
					// 渲染为可点击元素
					result +=
						`<span class="tip-user-name" data-user-id="${userId}">${this.$str.html2Escape(displayName)}</span>`;
					lastIndex = match.index + match[0].length;
				}
				// 添加剩余文本
				result += this.$str.html2Escape(content.substring(lastIndex));
				return result;
			},
			onClickTipMessage(event) {
				// 检查点击的是否是用户名元素
				const usernameEl = event.target.closest('.tip-user-name');
				if (usernameEl) {
					const userId = usernameEl.getAttribute('data-user-id');
					if (userId) {
						this.onClickTipUsername(event, parseInt(userId));
					}
				}
			},
			onClickTipUsername(event, userId) {
				event.stopPropagation();
				this.openUserInfoCard(event, userId);
			},
			onClickTextMessage(event) {
				const usernameEl = event.target.closest('.at-user-name');
				if (usernameEl) {
					const userId = usernameEl.getAttribute('data-user-id');
					if (userId && userId > 0) {
						event.stopPropagation();
						this.openUserInfoCard(event, parseInt(userId));
					}
				}
			},
			openUserInfoCard(event, userId) {
				this.$http({
					url: `/user/find/${userId}`,
					method: 'get'
				}).then(user => {
					let pos = {
						x: event.clientX + 30,
						y: event.clientY
					};
					this.$eventBus.$emit("openUserInfo", user, pos);
				});
			},
			//图片下载
			downloadImage() {
				let imageUrl = this.contentData.originUrl;
				if (imageUrl) {
					this.$eventBus.$emit("downloadImage", imageUrl);
				}
			},
			//复制图片
			async copyImage() {
				const that = this;
				try {
					let imageUrl = this.contentData.originUrl;
					// 1. 获取图片的 Blob 数据（解决跨域问题）
					const response = await fetch(imageUrl);
					const originalBlob = await response.blob();

					// 2. 判断环境：是 Electron 桌面端 还是 普通网页
					const isElectron = window.electronAPI && typeof window.electronAPI.copyImageToClipboard ===
						'function';

					if (isElectron) {
						// --- Electron 桌面端逻辑 ---
						// 将 Blob 转为 Base64 传给主进程
						const reader = new FileReader();
						reader.onloadend = () => {
							const base64data = reader.result;
							window.electronAPI.copyImageToClipboard(base64data);
						};
						reader.readAsDataURL(originalBlob);
						that.$message.success(that.$t('chat.copyImageSuccess'));
					} else {
						// --- 网页端逻辑 (使用现代 Clipboard API) ---
						// 注意：网页端复制图片通常需要 HTTPS 环境或 localhost
						if (navigator.clipboard && navigator.clipboard.write) {
							// // eslint-disable-next-line no-undef
							// const item = new window.ClipboardItem({
							// 	[blob.type]: blob
							// });
							// await navigator.clipboard.write([item]);
							// that.$message.success(that.$t('chat.copyImageSuccess'));

							try {
								// 核心修改：无论原图是什么格式，统一通过 canvas 转为 image/png
								const img = new Image();
								img.src = URL.createObjectURL(originalBlob);

								await new Promise((resolve, reject) => {
									img.onload = async () => {
										const canvas = document.createElement('canvas');
										canvas.width = img.width;
										canvas.height = img.height;
										const ctx = canvas.getContext('2d');
										ctx.drawImage(img, 0, 0);

										// 强制转换为 image/png 格式的 blob
										canvas.toBlob(async (pngBlob) => {
											try {
												const item = new window.ClipboardItem({
													'image/png': pngBlob
												});
												await navigator.clipboard.write([item]);
												that.$message.success(that.$t('chat.copyImageSuccess'));
												resolve();
											} catch (err) {
												reject(err);
											}
										}, 'image/png');
									};
									img.onerror = reject;
								});

							} catch (err) {
								console.error('复制图片失败:', err);
								that.$message.warning(that.$t('chat.copyImageNotSupported'));
							}
						} else {
							that.$message.warning(that.$t('chat.copyImageNotSupported'));
						}
					}
				} catch (err) {
					console.error('复制图片失败:', err);
					that.$message.warning(that.$t('chat.copyImageCrossDomain'));
				}
			},
			showFullImage() {
				let imageUrl = this.contentData.originUrl;
				if (imageUrl) {
					this.$eventBus.$emit("openFullImage", imageUrl);
				}
			},
			showFullSticker() {
				let imageUrl = this.contentData.imageUrl;
				if (imageUrl) {
					this.$eventBus.$emit("openFullImage", imageUrl);
				}
			},
			onPlayVoice() {
				if (!this.audio) {
					this.audio = new Audio();
				}
				this.audio.src = this.contentData.url;
				this.audio.play();
				this.onPlayVoice = 'RUNNING';
			},
			showMessageMenu(e) {
				let menuItems = [];
				if (this.isTextMessage) {
					menuItems.push({
						key: 'COPY',
						name: this.$t('chat.copy')
					});
				}
				// 表情消息可以添加到自定义表情
				if (this.msgInfo.type == this.$enums.MESSAGE_TYPE.STICKER && this.contentData.albumId) {
					menuItems.push({
						key: 'ADD_STICKER',
						name: this.$t('chat.addToSticker')
					});
				}
				// 只有普通消息才显示多选选项
				// (this.isNormal || this.isAction) && this.msgInfo.type != this.$enums.MESSAGE_TYPE.AUDIO
				if (this.isNormal || this.isAction) {
					menuItems.push({
						key: 'MULTI_SELECT',
						name: this.$t('chat.multiSelect')
					});
				}
				menuItems.push({
					key: 'DELETE',
					name: this.$t('common.delete')
				});
				if (this.msgInfo.id && this.isNormal) {
					if (this.isOwner || this.isManager || this.msgInfo.selfSend) {
						menuItems.push({
							key: 'RECALL',
							name: this.$t('chat.recall')
						});
					}
					menuItems.push({
						key: 'QUOTE',
						name: this.$t('chat.quote')
					});
					if (!this.isCardMessages && this.msgInfo.type != this.$enums.MESSAGE_TYPE.AUDIO) {
						menuItems.push({
							key: 'FORWARD',
							name: this.$t('chat.forward')
						});
					}
					if (this.isOwner || this.isManagerx) {
						menuItems.push({
							key: 'TOP',
							name: this.$t('chat.top')
						});
					}
				}
				if (this.msgInfo.type == this.$enums.MESSAGE_TYPE.FILE) {
					menuItems.push({
						key: 'DOWNLOAD',
						name: this.$t('chat.download')
					});
				}
				console.log('@menuItems',menuItems)
				this.$refs.rightMenu.open(e, menuItems);
			},
			showQuoteMenu(e) {
				let menuItems = [];
				if (this.msgInfo.quoteMessage &&
					this.msgInfo.quoteMessage.status != this.$enums.MESSAGE_STATUS.RECALL) {
					menuItems.push({
						key: 'LOCATE_QUOTE',
						name: this.$t('chat.locateQuote')
					});
				}
				this.$refs.rightMenu.open(e, menuItems);
			},
			showAvatarMenu(e) {
				if (!this.msgInfo.groupId || this.msgInfo.selfSend) {
					return;
				}
				this.avatarMenuEvent = e;
				let menuItems = [];
				menuItems.push({
					key: 'AT_MEMBER',
					name: '@' + this.showName
				});
				menuItems.push({
					key: 'USER_INFO',
					name: this.$t('group.viewProfile')
				});
				this.$refs.rightMenu.open(e, menuItems);
			},
			onSelectMenu(item) {
				if (item.key === 'AT_MEMBER') {
					this.$emit('atMember', {
						userId: this.msgInfo.sendId,
						showNickName: this.showName
					});
					return;
				}
				if (item.key === 'USER_INFO') {
					this.openUserInfoCard(this.avatarMenuEvent, this.msgInfo.sendId);
					return;
				}
				// 菜单id转驼峰作为事件key
				let eventKey = item.key.toLowerCase().replace(/_([a-z])/g, (g) => g[1].toUpperCase());
				this.$emit(eventKey, this.msgInfo);
			},
			onShowReadedBox() {
				let rect = this.$refs.chatMsgBox.getBoundingClientRect();
				this.$refs.chatGroupReadedBox.open(rect);
			},
			isGroupOwner(userId) {
				return this.group.ownerId == userId;
			},
			isGroupManager(userId) {
				let m = this.groupMembers.find(m => m.userId == userId);
				return m && m.isManager
			},
			onClickMergeForward() {
				if (this.isMergeForward && this.contentData) {
					this.$refs.mergeForward.open(this.contentData, this.groupMembers);
				}
			},
			onPreviewFile() {
				this.$eventBus.$emit("openPreviewFile", this.contentData.url);
			}
		},
		computed: {
			parsedTipContent() {
				return this.parseTipMessage(this.displayContent);
			},
			displayContent() {
				return this.$msgUtil.displayContent(this.msgInfo.content);
			},
			sending() {
				return this.msgInfo.status == this.$enums.MESSAGE_STATUS.SENDING;
			},
			sendFail() {
				return this.msgInfo.status == this.$enums.MESSAGE_STATUS.FAILED;
			},
			contentData() {
				return JSON.parse(this.msgInfo.content)
			},
			fileSize() {
				let size = this.contentData.size;
				if (size > 1024 * 1024) {
					return Math.round(size / 1024 / 1024) + "M";
				}
				if (size > 1024) {
					return Math.round(size / 1024) + "KB";
				}
				return size + "B";
			},
			isTextMessage() {
				return this.msgInfo.type == this.$enums.MESSAGE_TYPE.TEXT
			},
			isMergeForward() {
				return this.msgInfo.type == this.$enums.MESSAGE_TYPE.MERGE_FORWARD
			},
			mergeForwardTitle() {
				return this.$msgUtil.displayContent(this.contentData.title);
			},
			isCardMessages() {
				return this.msgInfo.type == this.$enums.MESSAGE_TYPE.USER_CARD ||
					this.msgInfo.type == this.$enums.MESSAGE_TYPE.GROUP_CARD
			},
			mergeForwardPreview() {
				// 只显示前3条消息的预览
				return this.contentData.messages.slice(0, 3)
			},
			isAction() {
				return this.$msgType.isAction(this.msgInfo.type);
			},
			isNormal() {
				return this.$msgType.isNormal(this.msgInfo.type);
			},
			isOwner() {
				let userId = this.userStore.userInfo.id;
				return this.group && userId == this.group.ownerId
			},
			isManager() {
				let userId = this.userStore.userInfo.id;
				let m = this.groupMembers.find((m) => m.userId == userId);
				return m && m.isManager;
			},
			htmlText() {
				let color = this.msgInfo.selfSend ? 'white' : '';
				let text = this.$str.html2Escape(this.msgInfo.content);
				text = this.$url.replaceURLWithHTMLLinks(text, color);
				text = this.$emo.transform(text, 'emoji-normal');
				const atUserIds = this.msgInfo.atUserIds;
				if (atUserIds && atUserIds.length > 0) {
					let atIndex = 0;
					text = text.replace(/@([^\s@]+)/g, (match, nick) => {
						if (atIndex < atUserIds.length) {
							const userId = atUserIds[atIndex++];
							return `<span class="at-user-name" data-user-id="${userId}">@${nick}</span>`;
						}
						return match;
					});
				}
				return text;
			},
			isGroupMessage() {
				return !!this.msgInfo.groupId;
			},
			imageStyle() {
				// 计算图片的显示宽高，要求：任意边不能高于360px,不能低于60px,不能拉伸图片比例
				let maxSize = this.configStore.fullScreen ? 360 : 240;
				let minSize = 60;
				let width = this.contentData.width;
				let height = this.contentData.height;
				if (width && height) {
					let ratio = Math.min(width, height) / Math.max(width, height);
					let w = Math.max(Math.min(width > height ? maxSize : ratio * maxSize, width), minSize);
					let h = Math.max(Math.min(width > height ? ratio * maxSize : maxSize, height), minSize);
					return `width: ${w}px;height:${h}px;object-fit: cover;`
				} else {
					// 兼容历史版本，历史数据没有记录宽高
					return `max-width: ${maxSize}px;min-width:60px;max-height: ${maxSize}px;min-height:60px;`
				}
			},
			stickerStyle() {
				// 计算图片的显示宽高，要求：任意边不能高于180px,不能低于60px,不能拉伸图片比例
				let maxSize = 180;
				let minSize = 60;
				let width = this.contentData.width;
				let height = this.contentData.height;
				if (width && height) {
					let ratio = Math.min(width, height) / Math.max(width, height);
					let w = Math.max(Math.min(width > height ? maxSize : ratio * maxSize, width), minSize);
					let h = Math.max(Math.min(width > height ? ratio * maxSize : maxSize, height), minSize);
					return `width: ${w}px;height:${h}px;object-fit: cover;`
				} else {
					// 兼容历史版本，历史数据没有记录宽高
					return `max-width: ${maxSize}px;min-width:60px;max-height: ${maxSize}px;min-height:60px;`
				}
			}
		}
	}
</script>

<style lang="scss" scoped>
	.chat-message-item {
		padding: 3px 10px;
		border-radius: 10px;

		&.active {
			background: var(--im-background-active-dark);
		}

		.message-tip {
			line-height: 50px;
			font-size: var(--im-font-size-small);
			color: var(--im-text-color-light);
			word-break: break-word;

			:deep(.tip-user-name) {
				color: var(--im-color-primary);
				cursor: pointer;
				padding: 2px 5px;
			}
		}

		.message-normal {
			position: relative;
			font-size: 0;
			padding-left: 53px;
			min-height: 50px;
			margin: 5px 0;

			.avatar {
				position: absolute;
				width: 40px;
				height: 40px;
				top: 0;
				left: 0;
			}

			.content {
				text-align: left;

				.top {
					display: flex;
					flex-wrap: nowrap;
					align-items: center;

					.show-name {
						white-space: nowrap;
						max-width: 400px;
						overflow: hidden;
						line-height: 18px;
						font-size: var(--im-font-size-small);
						color: #888;
					}
				}

				.bottom {
					display: inline-block;
					padding-right: 30px;
					margin-top: 2px;

					&.fullscreen {
						padding-right: 240px;
					}

					.message-content-wrapper {
						position: relative;
						display: inline-flex;
						align-items: flex-end;

						.sending {
							width: 40px;
							height: 40px;

							:deep(.el-loading-mask) {
								background: inherit;
							}

							:deep(.circular) {
								width: 35px;
								height: 35px;
							}

							:deep(.el-loading-spinner) {
								margin-top: -15px;
							}
						}

						.send-fail {
							color: #e45050;
							font-size: 25px;
							cursor: pointer;
							margin: 0 5px;
						}
					}

					.message-text {
						flex: 1;
						display: inline-block;
						position: relative;
						line-height: 26px;
						padding: 6px 10px;
						background: var(--im-background);
						border-radius: 10px;
						font-size: var(--im-font-size);
						text-align: left;
						white-space: pre-wrap;
						word-break: break-word;

						:deep(.at-user-name) {
							color: var(--im-color-primary);
							font-size: var(--im-font-size-small);
							font-weight: 600;
							cursor: pointer;
							padding: 2px;
							opacity: 0.9;

							&:hover {
								opacity: 1;
							}
						}
					}

					.message-merge-forward {
						display: inline-block;
						background: var(--im-background);
						border-radius: 10px;
						padding: 12px;
						cursor: pointer;
						transition: all 0.3s ease;
						border: 1px solid #e0e0e0;
						min-width: 200px;
						max-width: 400px;

						&:hover {
							background: #f5f5f5;
							border-color: var(--im-color-primary);
						}

						.merge-forward-header {
							display: flex;
							align-items: center;
							gap: 8px;
							margin-bottom: 8px;
							padding-bottom: 8px;
							border-bottom: 1px solid #eee;
							text-align: left;

							.merge-forward-title {
								font-size: var(--im-font-size);
								font-weight: 600;
								color: var(--im-text-color);
								word-break: break-all
							}

							.merge-forward-count {
								font-size: var(--im-font-size-small);
								color: var(--im-text-color-light);
								margin-left: auto;
								white-space: nowrap;
							}
						}

						.merge-forward-preview {

							.preview-item {
								font-size: var(--im-font-size-small);
								margin-bottom: 4px;
								overflow: hidden;
								text-align: left;

								.preview-sender {
									color: var(--im-text-color);
								}

								.preview-content {
									margin-left: 4px;
									color: var(--im-text-color-light);
									word-break: break-all;
								}
							}
						}
					}

					.message-image {
						border-radius: 12px;
						overflow: hidden;
						cursor: pointer;
						background: var(--im-background);
						box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
						transition: all 0.3s ease;
						position: relative;

						&:hover {
							transform: translateY(-2px);
							box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
						}

						.image-container {
							position: relative;
							width: 100%;
							height: 100%;
							overflow: hidden;
							border-radius: 12px;

							.send-image {
								width: 100%;
								height: 100%;
								object-fit: cover;
								transition: transform 0.3s ease;
							}

							.image-overlay {
								position: absolute;
								top: 0;
								left: 0;
								right: 0;
								bottom: 0;
								background: rgba(0, 0, 0, 0.3);
								display: flex;
								align-items: center;
								justify-content: center;
								flex-wrap: wrap;
								column-gap: 25px;
								opacity: 0;
								transition: opacity 0.3s ease;

								i {
									color: white;
									font-size: 1.5rem;
									cursor: pointer;
									transition: all 0.3s ease;
								}

								i:hover {
									transform: scale(1.1);
								}
							}


							&:hover {
								.send-image {
									transform: scale(1.05);
								}

								.image-overlay {
									opacity: 1;
								}
							}
						}
					}

					.message-sticker {
						overflow: hidden;
						position: relative;
					}

					.message-video {
						border-radius: 12px;
						overflow: hidden;
						background: var(--im-background);
						box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
						transition: all 0.3s ease;

						&:hover {
							transform: translateY(-2px);
							box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
						}

						.send-video {
							width: 100%;
							height: 100%;
							// object-fit: cover;
							transition: transform 0.3s ease;
						}

						// &:hover .send-video {
						// 	transform: scale(1.02);
						// }
					}

					.message-file {
						display: flex;
						flex-wrap: nowrap;
						flex-direction: row;
						align-items: center;
						cursor: pointer;
						margin-bottom: 2px;
						background: var(--im-background);

						.file-box {
							display: flex;
							flex-wrap: nowrap;
							align-items: center;
							min-height: 60px;
							box-shadow: var(--im-box-shadow-light);
							border-radius: 8px;
							padding: 10px 15px;
							border: 2px solid #eee;

							transition: all 0.3s ease;
							background: white;

							&:hover {
								transform: translateY(-2px);
								box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
							}

							.file-info {
								flex: 1;
								height: 100%;
								text-align: left;
								font-size: 14px;
								margin-right: 10px;

								.file-name {
									display: inline-block;
									min-width: 160px;
									max-width: 200px;
									font-size: 14px;
									margin-bottom: 4px;
									white-space: pre-wrap;
									word-break: break-all;
									color: var(--im-color-primary);

									&:hover {
										text-decoration: underline;
									}
								}

								.file-size {
									font-size: var(--im-font-size-smaller);
									color: var(--im-text-color-light);
								}
							}

							.file-icon {
								font-size: 44px;
								color: #d42e07;
								transition: transform 0.3s ease;
							}

							&:hover .file-icon {
								transform: scale(1.1);
							}
						}
					}

					.message-voice {
						audio {
							height: 46px;
							cursor: pointer;
							border: 1px solid rgba(0, 0, 0, 0.08);
							border-radius: 23px;
							box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
							transition: all 0.3s ease;

							&:hover {
								transform: translateY(-1px);
								box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
							}
						}
					}

					.chat-action {
						display: flex;
						align-items: center;

						.iconfont {
							cursor: pointer;
							font-size: 22px;
							padding-right: 8px;
						}
					}

					.quote-message {
						display: block;
						margin-top: 3px;
						cursor: pointer;
					}

					.message-status {
						margin-top: 3px;
						display: block;
						font-size: 11px;

						.chat-readed {
							color: var(--im-text-color-light);
						}

						.chat-unread {
							color: var(--im-color-danger);
						}
					}

					.chat-receipt {
						font-size: var(--im-font-size-smaller);
						cursor: pointer;
						color: var(--im-text-color-light);

						.icon-ok {
							font-size: 20px;
							color: var(--im-color-success);
						}
					}

					.chat-at-user {
						padding: 2px 5px;
						border-radius: 3px;
						cursor: pointer;
					}
				}
			}

			&.message-mine {
				text-align: right;
				padding-left: 0;
				padding-right: 53px;

				.avatar {
					left: auto;
					right: 0;
				}

				.content {
					text-align: right;

					.top {
						flex-direction: row-reverse;
					}

					.bottom {
						padding-left: 30px;
						padding-right: 0;

						&.fullscreen {
							padding-left: 240px;
						}

						.message-content-wrapper {
							flex-direction: row-reverse;
						}

						.message-text {
							background: var(--im-color-primary-light-2);
							color: white;

							:deep(.at-user-name) {
								color: white;
							}
						}

						.chat-action {
							flex-direction: row-reverse;

							.iconfont {
								transform: rotateY(180deg);
							}
						}
					}
				}
			}
		}
	}
</style>