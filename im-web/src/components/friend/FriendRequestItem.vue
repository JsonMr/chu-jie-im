<template>
	<div class="friend-request-item">
		<div class="friend-avatar">
			<head-image :size="56" :id="friend.id" :name="friend.nickName" :url="friend.headImage"></head-image>
		</div>
		<div class="request-info">
			<div class="nick-name">
				<div>{{ friend.nickName }}</div>
			</div>
			<div class="info-text">
				<div v-if="request.remark">{{ request.remark }}</div>
				<div v-else-if="isSender">{{ $t('friend.requestAddOther') }}</div>
				<div v-else>{{ $t('friend.requestAddYou') }}</div>
			</div>
		</div>
		<div class="btn-group">
			<el-button v-if="!isSender" type="danger" size="mini" @click="onReject">{{ $t('friend.reject') }}</el-button>
			<el-button v-if="!isSender" type="primary" size="mini" @click="onApprove">{{ $t('friend.approve') }}</el-button>
			<el-button v-if="isSender" type="danger" size="mini" @click="onRecall">{{ $t('friend.recall') }}</el-button>
		</div>
	</div>
</template>

<script>
import HeadImage from '../common/HeadImage.vue';

export default {
	name: "frinedRequestItem",
	components: {
		HeadImage
	},
	data() {
		return {}
	},
	methods: {
		onApprove() {
			this.$http({
				url: "/friend/request/approve?id=" + this.request.id,
				method: 'post'
			}).then(() => {
				this.friendStore.removeRequest(this.request.id);
				this.$message.success(this.$t('friend.approveSuccess', { name: this.request.sendNickName }));
			})
		},
		onReject() {
			this.$http({
				url: "/friend/request/reject?id=" + this.request.id,
				method: 'post'
			}).then(() => {
				this.friendStore.removeRequest(this.request.id);
				this.$message.success(this.$t('friend.rejectSuccess', { name: this.request.sendNickName }));
			})
		},
		onRecall() {
			this.$http({
				url: "/friend/request/recall?id=" + this.request.id,
				method: 'post'
			}).then(() => {
				this.friendStore.removeRequest(this.request.id);
				this.$message.success(this.$t('friend.recallSuccess', { name: this.request.recvNickName }));
			})
		}
	},
	props: {
		request: {
			type: Object
		}
	},
	computed: {
		mine() {
			return this.userStore.userInfo;
		},
		isSender() {
			// 我是否发起方
			return this.request.sendId == this.mine.id;
		},
		friend() {
			if (this.isSender) {
				return {
					id: this.request.recvId,
					nickName: this.request.recvNickName,
					HeadImage: this.request.recvHeadImage,
				}
			} else {
				return {
					id: this.request.sendId,
					nickName: this.request.sendNickName,
					HeadImage: this.request.sendHeadImage,
				}
			}
		}
	}

}
</script>

<style scope lang="scss">
.friend-request-item {
	display: flex;
	position: relative;
	align-items: center;
	cursor: pointer;
	margin: 0 30px;
	padding: 10px;
	border-bottom: 1px solid #ccc;

	.request-info {
		margin: 0 15px;
		flex: 3;
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		overflow: hidden;

		.nick-name {
			display: flex;
			align-items: center;
			font-weight: 600;
			font-size: 16px;
			line-height: 30px;
		}

		.info-text {
			display: flex;
			word-break: break-all;
			font-size: 14px;
			line-height: 20px;
			text-align: left;
		}

	}

}
</style>
