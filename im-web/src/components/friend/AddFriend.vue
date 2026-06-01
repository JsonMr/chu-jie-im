<template>
	<el-dialog v-dialogDrag :title="$t('friend.addFriend')" :visible.sync="dialogVisible" width="560px" :before-close="onClose"
		:close-on-click-modal="false" custom-class="add-friend">
		<el-input :placeholder="$t('friend.searchPlaceholder')" class="input-with-select" v-model="searchText" size="small"
			@keyup.enter.native="onSearch()" @input="onSearchTextChange">
			<i class="el-icon-search el-input__icon" slot="suffix" @click="onSearch()"> </i>
		</el-input>
		<el-scrollbar v-if="!isNoData" class="scroll-box">
			<div v-for="(user) in users" :key="user.id" v-show="user.id != userStore.userInfo.id">
				<div class="item">
					<div class="avatar">
						<head-image :name="user.nickName" :url="user.headImageThumb" :online="user.online"></head-image>
					</div>
					<div class="friend-info">
						<div class="nick-name">
							<div class="nick-name-text">{{ user.nickName }}</div>
							<div v-if="user.companyName" class="company-tag-mini">@{{ user.companyName }}</div>
							<el-tag v-if="user.status == 1" type="danger">{{ $t('friend.cancelled') }}</el-tag>
							<el-tag v-if="user.isBanned" type="danger">{{ $t('group.banned') }}</el-tag>
						</div>
						<div v-if="user.phone && isPhoneSearch" class="text-info">
							<div>{{ $t('friend.phone') }}:{{ user.phone }}</div>
						</div>
						<div v-else-if="user.email && isEmailSearch" class="text-info">
							<div>{{ $t('friend.email') }}:{{ user.email }}</div>
						</div>
						<div v-else class="text-info">
							<div>{{ $t('common.userName') }}：{{ user.userName }}</div>
							&nbsp;&nbsp;<div>ID：{{ user.code }}</div>
						</div>
					</div>
					<el-button v-if="isFriend(user.id)" type="primary" size="mini" icon="el-icon-position"
						@click="onSendMessage(user)">{{ $t('friend.sendMessage') }}</el-button>
					<span class="status-tip" v-else-if="isWaitingApprove(user.id)">{{ $t('friend.waitingApprove') }}</span>
					<el-button type="primary" size="mini" v-else @click="onAddFriend(user)" plain>{{ $t('friend.addAsFriend') }}</el-button>
				</div>
			</div>
		</el-scrollbar>
		<no-data-tip v-else class="no-data-tip" :tip="$t('friend.noSearchResult', { text: searchText })"></no-data-tip>
		<friend-apply ref="applyRef" @close="forceUpdate"></friend-apply>
	</el-dialog>
</template>

<script>
import HeadImage from '../common/HeadImage.vue'
import NoDataTip from '../common/NoDataTip.vue'
import FriendApply from './FriendApply.vue'

export default {
	name: "addFriend",
	components: { HeadImage, NoDataTip, FriendApply },
	data() {
		return {
			users: [],
			isNoData: false,
			searchText: "",
			querySearchText: "" // 点击查询时的搜索内容，用于判断显示手机/邮箱
		}
	},
	props: {
		dialogVisible: {
			type: Boolean
		}
	},
	computed: {
		isPhoneSearch() {
			const regex = /^1[3-9]\d{9}$/;
			return regex.test((this.querySearchText));
		},
		isEmailSearch() {
			const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
			return regex.test((this.querySearchText));
		}
	},
	methods: {
		onClose() {
			this.$emit("close");
		},
		onSearch() {
			if (!this.searchText) {
				this.users = [];
				this.querySearchText = "";
				return;
			}
			this.$http({
				url: "/user/search",
				method: "get",
				params: {
					name: this.searchText
				}
			}).then((data) => {
				this.users = data;
				this.users.forEach((u => u.waitApprove = false));
				this.isNoData = this.users.length == 0;
				this.querySearchText = this.searchText;
			})
		},
		onSearchTextChange() {
			this.isNoData = false;
		},
		onSendMessage(user) {
			const friend = this.friendStore.findFriend(user.id)
			let chat = {
				type: 'PRIVATE',
				targetId: friend.id,
				showName: friend.showNickName,
				headImage: friend.headImage,
				companyName: friend.companyName,
				isDnd: friend.isDnd,
				isTop: friend.isTop
			};
			this.chatStore.openChat(chat);
			this.chatStore.setActiveChat(chat);
			this.$router.push("/home/chat");
		},
		onAddFriend(user) {
			this.$refs.applyRef.open(user);
		},
		isFriend(userId) {
			return this.friendStore.isFriend(userId);
		},
		isWaitingApprove(userId) {
			return this.friendStore.isInRecvRequest(userId);
		},
		forceUpdate() {
			// 当好友添加成功或申请发送后，强制更新视图以刷新按钮状态
			this.$nextTick(() => this.$forceUpdate());
		}
	}
}
</script>

<style lang="scss" scoped>
.add-friend {

	.no-data-tip {
		height: 400px;
	}

	.scroll-box {
		height: 400px;

		.item {
			height: 65px;
			display: flex;
			position: relative;
			padding-left: 15px;
			align-items: center;
			padding-right: 25px;

			.friend-info {
				margin: 0 15px;
				flex: 3;
				display: flex;
				flex-direction: column;
				flex-shrink: 0;
				overflow: hidden;

				.nick-name {
					display: flex;
					align-items: center;
					flex-direction: row;
					white-space: nowrap;

					.nick-name-text {
						font-size: 16px;
						line-height: 25px;
						font-weight: 600;
					}
				}

				.text-info {
					display: flex;
					flex-direction: row;
					font-size: 12px;
					line-height: 20px;
					white-space: nowrap;
				}
			}

			.status-tip {
				color: var(--im-text-color-light);
			}
		}
	}

}
</style>