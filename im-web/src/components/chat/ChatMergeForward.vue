<template>
	<el-dialog v-dialogDrag :title="title" :visible.sync="show" width="720px" :close-on-click-modal="false">
		<div class="merge-forward-dialog">
			<el-scrollbar class="message-list">
				<div class="message-item" v-for="(msg, index) in mergeData.messages" :key="index">
					<chat-history-item :headImage="msg.sendHeadImage" :showName="msg.sendNickName" :msgInfo="msg">
					</chat-history-item>
				</div>
			</el-scrollbar>
		</div>
		<span slot="footer" class="dialog-footer">
			<el-button @click="close()">{{ $t('common.cancel') }}</el-button>
			<el-button type="primary" @click="close()">{{ $t('common.confirm') }}</el-button>
		</span>
	</el-dialog>
</template>

<script>
import HeadImage from '../common/HeadImage.vue';
import ChatHistoryItem from './ChatHistoryItem.vue';

export default {
	name: "ChatMergeForward",
	components: {
		HeadImage,
		ChatHistoryItem
	},
	data() {
		return {
			show: false,
			mergeData: {}
		}
	},
	computed: {
		title() {
			return this.$msgUtil.displayContent(this.mergeData.title);
		}
	},
	methods: {
		open(mergeData) {
			this.mergeData = mergeData;
			this.show = true;
		},
		close() {
			this.show = false;
		},
		formatTime(timestamp) {
			return this.$date.toTimeText(timestamp);
		},
		contentData(msgInfo) {
			return JSON.parse(msgInfo.content)
		},
		htmlText(msgInfo) {
			let text = this.$str.html2Escape(msgInfo.content)
			text = this.$url.replaceURLWithHTMLLinks(text, '')
			return this.$emo.transform(text, 'emoji-normal')
		}
	}

}
</script>

<style lang="scss" scoped>
.merge-forward-dialog {
	.message-list {
		padding: 0 15px;
		height: 500px;

		.message-item {
			padding-bottom: 15px;
			border-bottom: 1px solid #f5f5f5;
		}
	}
}
</style>
