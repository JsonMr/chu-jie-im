<template>
	<div>
		<div class="chat-item" :class="active ? 'active' : ''" @contextmenu.prevent="showRightMenu($event)">
			<div class="chat-left">
				<head-image :url="chat.headImage" :name="chat.showName" :size="45" :online="online"
					:id="chat.type == 'PRIVATE' ? chat.targetId : 0" :isShowUserInfo="false"></head-image>
				<!-- <div v-show="!chat.isDnd && chat.unreadCount > 0" class="unread-text">{{ chat.unreadCount }}</div> -->
				<div v-show="chat.unreadCount > 0" class="unread-text">{{ chat.unreadCount }}</div>
			</div>
			<div class="chat-right">
				<div class="chat-name">
					<div class="chat-name-text" :title="chat.showName">{{ chat.showName }}</div>
					<div v-if="chat.companyName" class="company-tag-mini" :title="chat.companyName">@{{ chat.companyName
					}}</div>
					<div class="chat-tag">
						<el-tag v-if="chat.type == 'GROUP'" type="primary">{{ $t('chat.groupShort') }}</el-tag>
						<el-tag v-if="chat.isTop" type="warning">{{ $t('chat.topShort') }}</el-tag>
						<el-tag v-if="chat.type == 'SYSTEM'" type="danger">{{ $t('chat.official') }}</el-tag>
					</div>
					<div class="chat-time-text">{{ showTime }}</div>
				</div>
				<div class="chat-content">
					<div class="chat-at-text">{{ atText }}</div>
					<div class="chat-send-name" v-show="isShowSendName">{{ chat.sendNickName + ':&nbsp;' }}</div>
					<div v-if="chat.draftText" class="chat-draft-text">{{ $t('chat.draft') }}</div>
					<div v-if="chat.draftText" class="chat-content-text"
						v-html="$emo.transform($str.html2Escape(chat.draftText), 'emoji-small')"></div>
					<div v-else class="chat-content-text"
						v-html="$emo.transform($str.html2Escape(chat.lastContent), 'emoji-small')"></div>
					<div class="icon iconfont icon-dnd" v-if="chat.isDnd"></div>
				</div>
			</div>
		</div>
		<right-menu ref="rightMenu" @select="onSelectMenu"></right-menu>
	</div>
</template>

<script>
import HeadImage from '../common/HeadImage.vue';
import RightMenu from '../common/RightMenu.vue';

export default {
	name: "chatItem",
	components: {
		HeadImage,
		RightMenu
	},
	data() {
		return {}
	},
	props: {
		chat: {
			type: Object
		},
		active: {
			type: Boolean
		}
	},
	methods: {
		showRightMenu(e) {
			this.$refs.rightMenu.open(e, this.menuItems);
		},
		onSelectMenu(item) {
			this.$emit(item.key.toLowerCase(), this.msgInfo);
		}
	},
	computed: {
		isShowSendName() {
			if (!this.chat.sendNickName || this.chat.draftText) {
				return false;
			}
			let size = this.chat.messages.length;
			if (size == 0) {
				return false;
			}
			// 只有群聊的普通消息需要显示名称
			let lastMsg = this.chat.messages[size - 1];
			return this.$msgType.isNormal(lastMsg.type)
		},
		showTime() {
			return this.$date.toTimeText(this.chat.lastSendTime, true)
		},
		atText() {
			if (this.chat.atMe) {
				return this.$t('chat.atMeTag');
			} else if (this.chat.atAll) {
				return this.$t('chat.atAll');
			}
			return "";
		},
		menuItems() {
			let items = [];

			if (this.chat.type == 'PRIVATE' || this.chat.type == 'GROUP') {
				if (!this.chat.isTop) {
					items.push({
						key: 'TOP',
						name: this.$t('chat.top')
					})
				} else {
					items.push({
						key: 'TOP',
						name: this.$t('chat.untop')
					})
				}
				items.push({
					key: 'INFO',
					name: this.$t('group.viewProfile')
				});
				if (this.chat.isDnd) {
					items.push({
						key: 'DND',
						name: this.$t('chat.notifyOn')
					})
				} else {
					items.push({
						key: 'DND',
						name: this.$t('chat.dndLabel')
					})
				}
			}
			items.push({
				key: 'DELETE',
				name: this.$t('chat.deleteChatItem'),
				danger: true
			})
			return items;
		},
		online() {
			if (this.chat.type == 'PRIVATE') {
				let friend = this.friendStore.findFriend(this.chat.targetId);
				return friend && friend.online;
			}
			return false;
		}
	}
}
</script>

<style lang="scss" scoped>
.chat-item {
	height: 54px;
	display: flex;
	position: relative;
	margin: 0 3px;
	padding: 5px 8px;
	align-items: center;
	white-space: nowrap;
	cursor: pointer;
	border-radius: 10px;

	&:hover {
		background-color: var(--im-background-active);
	}

	&.active {
		background-color: var(--im-background-active-dark);
	}

	.chat-left {
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;

		.unread-text {
			position: absolute;
			background-color: var(--im-color-danger);
			right: -4px;
			top: -8px;
			color: white;
			border-radius: 30px;
			padding: 1px 5px;
			font-size: 10px;
			text-align: center;
			white-space: nowrap;
			border: 1px solid #f1e5e5;
		}
	}

	.chat-right {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding-left: 10px;
		text-align: left;
		overflow: hidden;

		.chat-name {
			display: flex;
			align-items: center;
			line-height: 26px;
			height: 26px;

			.chat-name-text {
				font-size: var(--im-font-size);
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.chat-tag {
				flex: 1;
				display: flex;
				align-items: center;
			}

			.chat-time-text {
				font-size: var(--im-font-size-smaller);
				text-align: right;
				color: var(--im-text-color-light);
				white-space: nowrap;
				overflow: hidden;
				padding-left: 2px;
				min-width: 60px;
			}
		}

		.chat-content {
			display: flex;
			line-height: 24px;
			height: 24px;

			.chat-at-text {
				color: #c70b0b;
				font-size: var(--im-font-size-smaller);
			}

			.chat-send-name {
				font-size: var(--im-font-size-smaller);
				color: var(--im-text-color-light);
			}

			.chat-draft-text {
				color: var(--im-color-danger);
				font-size: var(--im-font-size-smaller);
				margin-right: 3px;
			}

			.chat-content-text {
				flex: 1;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				font-size: var(--im-font-size-smaller);
				color: var(--im-text-color-light);
			}

			.icon {
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: var(--im-font-size-large);
				color: var(--im-text-color-lighter);
				margin-left: 5px;
				background: var(--im-background-active);
				border-radius: 50%;
				width: 20px;
				height: 20px;
			}

		}
	}
}
</style>
