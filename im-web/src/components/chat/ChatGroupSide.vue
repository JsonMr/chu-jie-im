<template>
	<div class="chat-group-side">
		<chat-group-member v-if="showAllMembers" @back="showAllMembers = false" :group="group"
			:groupMembers="showMembers"></chat-group-member>
		<div v-else>
			<div class="member-area">
				<div class="member-header">
					<div class="member-title">{{ $t('group.members') }}</div>
					<div class="more-member-btn" @click="onShowMoreMember"
						v-if="group.isOrdinaryMemberViewMember || isOwner || isManager">{{ $t('group.viewAllMembersCount', {
						n: showMembers.length
					}) }}</div>
				</div>
				<div class="member-items">
					<div v-for="member in showGridMembers" :key="member.id">
						<group-member-item class="member-item" :group="group" :groupMembers="groupMembers"
							:member="member" type="card"></group-member-item>
					</div>
					<div class="member-tools" v-if="isAllowInvite">
						<div class="tool-btn" :title="$t('group.inviteFriend')" @click="onInvite()">
							<i class="el-icon-plus"></i>
						</div>
						<div class="tool-text">{{ $t('group.invite') }}</div>
						<add-group-member ref="addGroupMember" :groupId="group.id" :members="groupMembers"
							@reload="$emit('reload')"></add-group-member>
					</div>
					<div class="member-tools" v-if="isOwner || isManager">
						<div class="tool-btn" :title="$t('group.removeMemberTitle')" @click="onRemove()">
							<i class="el-icon-minus"></i>
						</div>
						<div class="tool-text">{{ $t('group.remove') }}</div>
						<group-member-selector ref="removeSelector" :title="$t('group.selectToRemove')" :group="group"
							@complete="onRemoveComplete"></group-member-selector>
					</div>
					<div class="member-tools" v-if="isOwner || isManager">
						<div class="tool-btn" :title="$t('group.mute')" @click="onMuted()">
							<span class="icon iconfont icon-chat-muted"></span>
						</div>
						<div class="tool-text">{{ $t('group.mute') }}</div>
						<group-member-selector ref="mutedSelector" :title="$t('group.selectToMute')" :group="group"
							@complete="onMutedComplete"></group-member-selector>
					</div>
					<div class="member-tools" v-if="isOwner || isManager">
						<div class="tool-btn" :title="$t('group.unmute')" @click="onUnmuted()">
							<span class="icon iconfont icon-chat-unmuted"></span>
						</div>
						<div class="tool-text">{{ $t('group.unmute') }}</div>
						<group-member-selector ref="unmutedSelector" :title="$t('group.selectToUnmute')" :group="group"
							@complete="onUnmutedComplete"></group-member-selector>
					</div>
				</div>
			</div>

			<!-- 个人设置区域 -->
			<div class="switch-setting">
				<div class="switch-item">
					<div class="label">
						<span>{{ $t('chat.dndLabel') }}</span>
					</div>
					<el-switch v-model="group.isDnd" @change="onDndChange"></el-switch>
				</div>
				<div class="switch-item">
					<div class="label">
						<span>{{ $t('chat.topLabel') }}</span>
					</div>
					<el-switch v-model="group.isTop" @change="onTopChange"></el-switch>
				</div>
			</div>


			<!-- <el-popover placement="left-start" title="" width="280" trigger="click">
				<div class="image-container">
					<vue-qr class="qrcode" :text="qrText" :size="280" :margin="20" :callback="getQrBase64" />
					<div class="image-overlay">
						<i class="el-icon-zoom-in" @click="showFullImage()" v-if="false"></i>
						<i class="el-icon-download" @click="downloadImage()"></i>
					</div>
				</div>
				<div class="switch-setting" slot="reference">
					<div class="switch-item">
						<div class="label">
							<span>{{ $t('chat.groupQrCode') }}</span>
						</div>
					</div>
				</div>
			</el-popover> -->


			<div class="switch-setting" v-if="isOwner || isManager">
				<div class="switch-item" v-if="isOwner">
					<div class="label">
						<span>{{ $t('group.allMuted') }}</span>
					</div>
					<el-switch v-model="group.isAllMuted" @change="onAllMutedChange"></el-switch>
				</div>
				<div class="switch-item" v-if="isOwner">
					<div class="label">
						<span>{{ $t('group.prohibit') }}</span>
					</div>
					<el-switch v-model="group.isProhibit" @change="onProhibitChange"></el-switch>
				</div>
				<div class="switch-item" v-if="isOwner">
					<div class="label">
						<span>{{ $t('group.silencePeriod') }}</span>
					</div>
					<my-time-picker :startTime="group.prohibitStartTime" :endTime="group.prohibitEndTime"
						@timeChange="onSilencePeriodChange" />
				</div>
				<div class="switch-item">
					<div class="label">
						<span>{{ $t('group.allowMemberInvite') }}</span>
					</div>
					<el-switch v-model="group.isAllowInvite" @change="onAllowInviteChange"></el-switch>
				</div>
				<div class="switch-item">
					<div class="label">
						<span>{{ $t('group.allowMemberShareCard') }}</span>
					</div>
					<el-switch v-model="group.isAllowShareCard" @change="onAllowShareCardChange"></el-switch>
				</div>

				<div class="switch-item">
					<div class="label">
						<span>{{ $t('group.allowMemberAddFriend') }}</span>
					</div>
					<el-switch v-model="group.isAllowAddFriend" @change="onAllowAddFriendChange"></el-switch>
				</div>

				<div class="switch-item">
					<div class="label">
						<span>{{ $t('group.newMemberViewHistory') }}</span>
					</div>
					<el-switch v-model="group.isNewMemberViewHistory" @change="onNewMemberViewHistory"></el-switch>
				</div>

				<div class="switch-item">
					<div class="label">
						<span>{{ $t('group.ordinaryMemberViewMember') }}</span>
					</div>
					<el-switch v-model="group.isOrdinaryMemberViewMember"
						@change="onOrdinaryMemberViewMember"></el-switch>
				</div>
			</div>

			<div class="group-info-section">
				<!-- 群聊名称 -->
				<div class="info-item">
					<div class="info-label">
						<span>{{ $t('group.groupNameLabel') }}</span>
					</div>
					<div class="info-content">
						<el-input v-if="isEditingGroupName" v-model="groupNameValue" size="small"
							:placeholder="$t('group.inputGroupName')" maxlength="20" show-word-limit
							@blur="saveGroupName" @keyup.enter="saveGroupName" ref="groupNameInput">
						</el-input>
						<div v-else class="info-display" @click="startEditGroupName">
							<span v-if="group.name">{{ group.name }}</span>
							<span v-else class="info-placeholder">{{ $t('group.clickSetGroupName') }}</span>
						</div>
					</div>
				</div>

				<!-- 备注 -->
				<div class="info-item">
					<div class="info-label">
						<span>{{ $t('group.remark') }}</span>
					</div>
					<div class="info-content">
						<el-input v-if="isEditingRemark" v-model="remarkValue" size="small" maxlength="32"
							show-word-limit @blur="saveRemark" @keyup.enter="saveRemark" ref="remarkInput">
						</el-input>
						<div v-else class="info-display" @click="startEditRemark">
							<span v-if="group.remarkGroupName">{{ group.remarkGroupName }}</span>
							<span v-else class="info-placeholder">{{ $t('group.clickSetGroupRemark') }}</span>
						</div>
					</div>
				</div>

				<!-- 我在本群的昵称 -->
				<div class="info-item">
					<div class="info-label">
						<span>{{ $t('group.myNickname') }}</span>
					</div>
					<div class="info-content">
						<el-input v-if="isEditingNickName" v-model="nickNameValue" size="small"
							:placeholder="$t('personalInfo.inputNickname')" maxlength="20" show-word-limit
							@blur="saveNickName" @keyup.enter="saveNickName" ref="nickNameInput">
						</el-input>
						<div v-else class="info-display" @click="startEditNickName">
							<span v-if="group.remarkNickName">{{ group.remarkNickName }}</span>
							<span v-else class="info-placeholder">{{ $t('group.clickSetNickname') }}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- 群公告 -->
			<div class="notice-section" v-if="group.notice || isOwner || isManager">
				<div class="notice-header">
					<span>{{ $t('group.notice') }}</span>
				</div>
				<div class="notice-content">
					<div class="notice-display" @click="openNoticeDialog">
						<div v-if="group.notice" class="notice-text">{{ group.notice }}</div>
						<div v-else class="notice-placeholder">{{ $t('group.clickSetNotice') }}</div>
					</div>
				</div>
			</div>

			<!-- 群公告编辑弹窗 -->
			<el-dialog :title="$t('group.editNotice')" :visible.sync="noticeDialogVisible" width="500px"
				:close-on-click-modal="false" :close-on-press-escape="false">
				<div class="notice-dialog-content">
					<el-input v-model="noticeValue" type="textarea" :placeholder="$t('group.inputNotice')"
						maxlength="512" show-word-limit :rows="6" ref="noticeDialogInput">
					</el-input>
				</div>
				<div slot="footer" class="dialog-footer">
					<el-button @click="cancelNoticeEdit">{{ $t('common.cancel') }}</el-button>
					<el-button type="primary" @click="saveNotice">{{ $t('common.save') }}</el-button>
				</div>
			</el-dialog>

			<div v-show="!group.quit" class="btn-group" style="margin-bottom: 10px;">
				<div class="text-btn" @click="onCleanMessage">
					{{ $t('chat.clearChatTitle') }}
				</div>
				<div class="text-btn" v-show="!isOwner" @click="onQuit()">
					{{ $t('group.quit') }}
				</div>
			</div>

			<el-button style="width:100%" type="danger" v-show="isOwner"
				@click="onDissolve">{{ $t('group.dissolve')}}</el-button>

			<div class="complaint-tip" @click="onComplaint">
				<span>{{ $t('group.complaintGroup') }}</span>
			</div>
		</div>

		<complaint ref="complaint"></complaint>
	</div>
</template>

<script>
	import AddGroupMember from '../group/AddGroupMember.vue';
	import GroupMemberItem from '../group/GroupMemberItem.vue';
	import GroupMemberSelector from '../group/GroupMemberSelector.vue';
	import ChatGroupMember from './ChatGroupMember.vue';
	import Complaint from '../common/Complaint.vue';
	import MyTimePicker from '../common/MyTimePicker.vue';

	import VueQr from 'vue-qr';
	import axios from 'axios';

	export default {
		name: "chatGroupSide",
		components: {
			AddGroupMember,
			GroupMemberItem,
			GroupMemberSelector,
			ChatGroupMember,
			Complaint,
			MyTimePicker,
			VueQr
		},
		data() {
			return {
				editing: false,
				showAllMembers: false,
				group: {},
				// 编辑状态
				isEditingGroupName: false,
				isEditingRemark: false,
				isEditingNickName: false,
				// 弹窗状态
				noticeDialogVisible: false,
				// 编辑值
				groupNameValue: '',
				noticeValue: '',
				remarkValue: '',
				nickNameValue: '',
				qrText: '',
				qrBase64: '',
			}
		},
		props: {
			groupId: {
				type: Number
			},
			groupMembers: {
				type: Array
			},
			chat: {
				type: Object
			}
		},
		methods: {
			isBlank(data) {
				return data == null || "" == data.toString().replace(/^\s*|\s*$/g, "") || typeof data == undefined;
			},
			onClose() {
				this.$emit('close');
			},
			// 免打扰开关变化
			onDndChange(value) {
				const data = {
					groupId: this.groupId,
					isDnd: value
				};
				this.$http({
					url: '/group/dnd',
					method: 'PUT',
					data: data
				}).then(() => {
					this.groupStore.setDnd(this.groupId, value);
					this.chatStore.setDnd(this.chat, value);
					this.$message.success(value ? this.$t('chat.dndOn') : this.$t('chat.dndOff'));
				}).catch(() => {
					this.$message.error(this.$t('chat.opFailed'));
					this.group.isDnd = !value;
				});
			},

			// 置顶开关变化
			onTopChange(value) {
				const data = {
					groupId: this.groupId,
					isTop: value
				};
				this.$http({
					url: '/group/top',
					method: 'PUT',
					data: data
				}).then(() => {
					this.groupStore.setTop(this.groupId, value);
					this.chatStore.setTop(this.chat, value);
					this.$message.success(value ? this.$t('chat.topOn') : this.$t('chat.topOff'));
				}).catch(() => {
					this.$message.error(this.$t('chat.opFailed'));
					this.group.isTop = !value;
				});
			},
			onInvite() {
				this.$refs.addGroupMember.open();
			},
			onRemove() {
				// 群主和自己不显示
				let hideIds = [this.group.ownerId, this.mine.id];
				// 只有群主可以移除管理员
				if (!this.isOwner) {
					hideIds = hideIds.concat(this.managerIds);
				}
				this.$refs.removeSelector.open(50, [], [], hideIds);
			},
			onRemoveComplete(members) {
				let userIds = members.map(m => m.userId);
				let data = {
					groupId: this.group.id,
					userIds: userIds
				}
				this.$http({
					url: "/group/members/remove",
					method: 'delete',
					data: data
				}).then(() => {
					this.$emit('reload');
					this.$message.success(this.$t('group.removedMembers', {
						n: userIds.length
					}));
				})
			},
			onMuted() {
				// 群主和自己不显示
				let hideIds = [this.group.ownerId, this.mine.id];
				// 只有群主可以禁言管理员
				if (!this.isOwner) {
					hideIds = hideIds.concat(this.managerIds);
				}
				// 已禁言的用户不可选中
				let lockedIds = this.groupMembers.filter(m => m.isMuted).map(m => m.userId);
				this.$refs.mutedSelector.open(50, [], lockedIds, hideIds);
			},
			onMutedComplete(members) {
				let userIds = members.map(m => m.userId);
				let data = {
					groupId: this.group.id,
					userIds: userIds,
					isMuted: true
				}
				let tip = this.$t('group.mutedMembers', {
					n: userIds.length
				});
				this.sendMemberMuted(data, tip);
			},
			onUnmuted() {
				// 过滤掉未禁言的用户
				let hideIds = this.groupMembers.filter(m => !m.isMuted).map(m => m.userId)
				// 只有群主可以解除管理员的禁言
				if (!this.isOwner) {
					hideIds = hideIds.concat(this.managerIds);
				}
				this.$refs.unmutedSelector.open(50, [], [], hideIds);
			},
			onUnmutedComplete(members) {
				let userIds = members.map(m => m.userId);
				let data = {
					groupId: this.group.id,
					userIds: userIds,
					isMuted: false
				}
				let tip = this.$t('group.unmutedMembers', {
					n: userIds.length
				});
				this.sendMemberMuted(data, tip);
			},
			onAllMutedChange() {
				let data = {
					id: this.group.id,
					isMuted: this.group.isAllMuted
				}
				this.$http({
					url: '/group/muted',
					method: 'PUT',
					data: data
				})
			},
			onProhibitChange() {
				if (this.group.isProhibit && (this.isBlank(this.group.prohibitStartTime) || this.isBlank(this.group
						.prohibitEndTime))) {
					this.$message.warning(this.$t('group.selectSilencePeriod'));
					this.$set(this.group, 'isProhibit', false);
					return;
				}
				let data = {
					id: this.group.id,
					isProhibit: this.group.isProhibit,
					prohibitStartTime: this.group.prohibitStartTime,
					prohibitEndTime: this.group.prohibitEndTime
				}
				this.$http({
					url: '/group/modifyProhibit',
					method: 'PUT',
					data: data
				})
			},
			onSilencePeriodChange(e) {
				if (e.label == 'startTime') {
					this.$set(this.group, 'prohibitStartTime', e.value);
				}
				if (e.label == 'endTime') {
					this.$set(this.group, 'prohibitEndTime', e.value);
				}
				if (!this.isBlank(this.group.prohibitStartTime) && !this.isBlank(this.group.prohibitEndTime)) {
					this.onProhibitChange();
				}
			},
			onAllowInviteChange() {
				let data = {
					groupId: this.group.id,
					isAllowInvite: this.group.isAllowInvite
				}
				this.$http({
					url: '/group/allowInvite',
					method: 'PUT',
					data: data
				})
			},
			onAllowShareCardChange() {
				let data = {
					groupId: this.group.id,
					isAllowShareCard: this.group.isAllowShareCard
				}
				this.$http({
					url: '/group/allowShareCard',
					method: 'PUT',
					data: data
				})
			},
			//开启/关闭群内添加好友
			onAllowAddFriendChange() {
				let data = {
					groupId: this.group.id,
					isAllowAddFriend: this.group.isAllowAddFriend
				}
				this.$http({
					url: '/group/allowAddFriend',
					method: 'PUT',
					data: data
				})
			},
			onNewMemberViewHistory() {
				let data = {
					groupId: this.group.id,
					isNewMemberViewHistory: this.group.isNewMemberViewHistory
				}
				this.$http({
					url: '/group/newMemberViewHistory',
					method: 'PUT',
					data: data
				})
			},
			onOrdinaryMemberViewMember() {
				let data = {
					groupId: this.group.id,
					isOrdinaryMemberViewMember: this.group.isOrdinaryMemberViewMember
				}
				this.$http({
					url: '/group/ordinaryMemberViewMember',
					method: 'PUT',
					data: data
				})
			},
			onShowMoreMember() {
				this.showAllMembers = true;
			},
			onDissolve() {
				this.$confirm(this.$t('group.dissolveConfirm', {
					name: this.group.name
				}), this.$t('group.dissolveConfirmTitle'), {
					confirmButtonText: this.$t('common.ok'),
					cancelButtonText: this.$t('common.cancel'),
					type: 'warning'
				}).then(() => {
					this.$http({
						url: `/group/delete/${this.group.id}`,
						method: 'delete'
					}).then(() => {
						this.$message.success(this.$t('group.dissolved', {
							name: this.group.name
						}));
						this.groupStore.removeGroup(this.group.id);
						this.group = {};
					});
				})
			},
			onQuit() {
				this.$confirm(this.$t('group.quitConfirmMsg'), this.$t('group.quitConfirmTitle'), {
					confirmButtonText: this.$t('common.confirm'),
					cancelButtonText: this.$t('common.cancel'),
					type: 'warning'
				}).then(() => {
					this.$http({
						url: `/group/quit/${this.group.id}`,
						method: 'delete'
					}).then(() => {
						this.groupStore.removeGroup(this.group.id);
						this.chatStore.removeGroupChat(this.group.id);
					});
				})
			},
			sendMemberMuted(data, tip) {
				this.$http({
					url: "/group/members/muted",
					method: "put",
					data: data
				}).then(() => {
					this.$emit('reload');
					this.$message.success(tip)
				})
			},

			// 开始编辑群聊名称
			startEditGroupName() {
				if (!this.isOwner && !this.isManager) return;
				this.isEditingGroupName = true;
				this.groupNameValue = this.group.name || '';
				this.$nextTick(() => {
					this.$refs.groupNameInput.focus();
				});
			},

			// 保存群聊名称
			saveGroupName() {
				const newName = this.groupNameValue.trim();
				if (newName === (this.group.name || '')) {
					this.isEditingGroupName = false;
					return;
				}
				this.group.name = newName;
				this.saveGroupInfo();
			},

			// 打开群公告编辑弹窗
			openNoticeDialog() {
				if (!this.isOwner && !this.isManager) return;
				this.noticeValue = this.group.notice || '';
				this.noticeDialogVisible = true;
				this.$nextTick(() => {
					this.$refs.noticeDialogInput.focus();
				});
			},

			// 保存群公告
			saveNotice() {
				const newNotice = this.noticeValue.trim();
				if (newNotice === (this.group.notice || '')) {
					this.noticeDialogVisible = false;
					return;
				}
				this.group.notice = newNotice;
				this.saveGroupInfo();
			},

			// 取消群公告编辑
			cancelNoticeEdit() {
				this.noticeDialogVisible = false;
				this.noticeValue = this.group.notice || '';
			},

			// 开始编辑备注
			startEditRemark() {
				this.isEditingRemark = true;
				this.remarkValue = this.group.remarkGroupName || '';
				this.$nextTick(() => {
					this.$refs.remarkInput.focus();
				});
			},

			// 保存备注
			saveRemark() {
				const newRemark = this.remarkValue.trim();
				if (newRemark === (this.group.remarkGroupName || '')) {
					this.isEditingRemark = false;
					return;
				}
				this.group.remarkGroupName = newRemark;
				this.saveGroupInfo();
			},

			// 开始编辑昵称
			startEditNickName() {
				this.isEditingNickName = true;
				this.nickNameValue = this.group.remarkNickName || '';
				this.$nextTick(() => {
					this.$refs.nickNameInput.focus();
				});
			},

			// 保存昵称
			saveNickName() {
				const newNickName = this.nickNameValue.trim();
				if (newNickName === (this.group.remarkNickName || '')) {
					this.isEditingNickName = false;
					return;
				}
				this.group.remarkNickName = newNickName;
				this.saveGroupInfo();
			},

			// 保存群信息
			saveGroupInfo() {
				let vo = this.group;
				this.$http({
					url: "/group/modify",
					method: "put",
					data: vo
				}).then(group => {
					this.chatStore.updateChatFromGroup(group)
					this.groupStore.updateGroup(group);
					this.$message.success(this.$t('group.modifySuccess'));
					// 关闭群公告弹窗
					if (this.noticeDialogVisible) {
						this.noticeDialogVisible = false;
					}
				}).finally(() => {
					// 退出所有编辑模式
					this.isEditingGroupName = false;
					this.isEditingRemark = false;
					this.isEditingNickName = false;
				});
			},
			// 清空聊天记录
			onCleanMessage() {
				this.$confirm(this.$t('group.clearGroupChatConfirm', {
					name: this.group.name
				}), this.$t('chat.clearChatTitle'), {
					confirmButtonText: this.$t('common.confirm'),
					cancelButtonText: this.$t('common.cancel'),
					type: 'warning'
				}).then(() => {
					this.chatStore.cleanMessage(this.chat);
					this.$message.success(this.$t('group.clearedGroupChat', {
						name: this.group.name
					}));
				}).catch(() => {
					// 用户取消操作
				});
			},
			// 投诉群组
			onComplaint() {
				this.$refs.complaint.open(2, this.group.id, this.group.name);
			},
			getQrBase64(dataUrl) {
				this.qrBase64 = dataUrl;
			},
			// 制作群二维码
			onShowQrcode() {
				this.$http({
					url: `/group/qrcode/token/${this.group.id}`,
					method: "GET"
				}).then(token => {
					const encodeToken = encodeURIComponent(JSON.stringify(token));
					this.qrText = `&scan=1&groupId=${this.group.id}&token=${encodeToken}`
				})
			},
			downloadImage() { //图片下载
				if (!this.qrBase64) return;

				axios({
						url: this.qrBase64,
						method: 'GET',
						responseType: 'blob', // ⚠️ 关键：必须指定响应类型为 blob
					})
					.then((response) => {
						// 1. 将返回的 blob 数据转换为临时的 URL
						const blobUrl = window.URL.createObjectURL(response.data);

						// 2. 动态创建 a 标签并触发下载
						const link = document.createElement('a');
						link.href = blobUrl;
						link.download = new Date().getTime() + '.png'; // 设置下载的文件名
						document.body.appendChild(link);
						link.click();

						// 3. 下载完成后进行清理，释放内存
						document.body.removeChild(link);
						window.URL.revokeObjectURL(blobUrl);
					})
					.catch((error) => {
						console.error('下载失败:', error);
					});
			},
			// showFullImage() {
			// 	let imageUrl = this.contentData.originUrl;
			// 	if (imageUrl) {
			// 		this.$eventBus.$emit("openFullImage", imageUrl);
			// 	}
			// },
		},
		computed: {
			mine() {
				return this.userStore.userInfo;
			},
			ownerName() {
				let member = this.groupMembers.find((m) => m.userId == this.group.ownerId);
				return member && member.showNickName;
			},
			isOwner() {
				return this.group.ownerId == this.mine.id;
			},
			isManager() {
				let userId = this.mine.id;
				let m = this.groupMembers.find((m) => m.userId == userId);
				return m && m.isManager;
			},
			isAllowInvite() {
				return this.isOwner || this.isManager || this.group.isAllowInvite;
			},
			managerIds() {
				return this.groupMembers.filter(m => m.isManager).map(m => m.userId)
			},
			showMembers() {
				return this.groupMembers.filter((m) => !m.quit)
			},
			showGridMembers() {
				let list = this.showMembers.slice(0, this.showMaxIdx);
				if (!this.group.isOrdinaryMemberViewMember && !this.isOwner && !this.isManager) {
					list = list.filter((m, index) => m.isManager || this.group.ownerId == m.userId);
				}
				return list;
			},
			showMaxIdx() {
				let idx = this.configStore.fullScreen ? 12 : 9;
				if (this.isAllowInvite) {
					// 邀请按钮
					idx--;
				}
				if (this.isOwner || this.isManager) {
					// 开启禁言、解除禁言、移除成员
					idx -= 3;
				}
				return idx;
			}
		},
		mounted() {
			// vuex的数据不允许编辑，这里拷贝一份数据
			let group = this.groupStore.findGroup(this.groupId);
			this.group = JSON.parse(JSON.stringify(group));


			// this.onShowQrcode();
		}
	}
</script>

<style lang="scss">
	.chat-group-side {
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

		.member-area {
			margin-bottom: 12px;
			padding: 12px;
			@extend %card-style;

			.member-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				margin-bottom: 12px;
				padding-bottom: 8px;
				border-bottom: 1px solid rgba(0, 0, 0, 0.08);

				.member-title {
					font-size: var(--im-font-size);
					font-weight: 500;
					color: var(--im-text-color-primary);
				}

				.more-member-btn {
					font-size: var(--im-font-size-smaller);
					color: var(--im-color-primary-light-2);
					cursor: pointer;
					padding: 4px 8px;
					border-radius: 4px;
					transition: all 0.2s ease;

					&:hover {
						color: var(--im-color-primary);
					}
				}
			}

			.member-items {
				display: flex;
				align-items: center;
				flex-wrap: wrap;
				text-align: center;
				gap: 20px;

				.member-tools {
					display: flex;
					flex-direction: column;
					align-items: center;
					width: 54px;

					.tool-btn {
						width: 40px;
						height: 40px;
						display: flex;
						align-items: center;
						justify-content: center;
						border: var(--im-border);
						border-radius: 50%;
						font-size: 18px;
						cursor: pointer;
						color: var(--im-text-color-light);
						box-sizing: border-box;
						font-weight: 800;
						background: var(--im-background-active);
						transition: all 0.3s ease;
						box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

						&:hover {
							border-color: var(--im-color-primary-light-2);
							color: var(--im-color-primary-light-2);
							background: var(--im-background-active);
							transform: translateY(-2px);
							box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
						}
					}

					.tool-text {
						font-size: 11px;
						color: var(--im-text-color);
						margin-top: 6px;
						text-align: center;
						font-weight: 500;
						width: 100%;
						height: 20px;
						line-height: 20px;
						white-space: nowrap;
						text-overflow: ellipsis;
						overflow: hidden;
					}
				}
			}
		}

		.switch-setting {
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
					border-radius: 6px;
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
				}
			}
		}

		.group-info-section {
			margin-bottom: 12px;
			@extend %card-style;

			.info-item {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 3px 0;
				border-bottom: 1px solid rgba(0, 0, 0, 0.08);
				transition: all 0.2s ease;

				&:last-child {
					border-bottom: none;
				}

				&:hover {
					background: var(--im-background-active);
					border-radius: 6px;
					padding: 3px 8px;
					margin: 0 -8px;
				}

				.info-label {
					display: flex;
					align-items: center;
					gap: 6px;
					font-weight: 500;
					color: var(--im-text-color-primary);
					font-size: var(--im-font-size);
					flex-shrink: 0;
					width: 125px;
				}

				.info-content {
					flex: 1;
					margin-left: 12px;

					.info-display {
						display: flex;
						align-items: center;
						justify-content: flex-start;
						padding: 3px;
						cursor: pointer;
						transition: all 0.2s ease;
						min-height: 32px;
						border-radius: 8px;

						&:hover {
							background: var(--im-background-active);
						}

						span {
							font-size: var(--im-font-size);
							color: var(--im-text-color-light);
							text-align: left;
							word-break: break-all;

							&.info-placeholder {
								color: var(--im-text-color-light);
								font-style: italic;
							}
						}
					}
				}
			}
		}

		.notice-section {
			margin-bottom: 12px;
			@extend %card-style;

			.notice-header {
				display: flex;
				align-items: center;
				gap: 6px;
				margin-bottom: 8px;
				font-weight: 500;
				color: var(--im-text-color-primary);
				font-size: var(--im-font-size);
			}

			.notice-content {

				.notice-display {
					min-height: 40px;
					padding: 10px;
					border-radius: 10px;
					cursor: pointer;
					transition: all 0.2s ease;
					position: relative;
					font-style: italic;
					background: var(--im-background-active);

					&:hover {
						transform: translateY(-2px);
					}

					.notice-text {
						font-size: var(--im-font-size-small);
						color: var(--im-text-color-light);
						line-height: 1.4;
						word-break: break-word;
						text-align: left;
					}

					.notice-placeholder {
						font-size: var(--im-font-size-small);
						color: var(--im-text-color-light);
						line-height: 1.4;
						text-align: left;
					}
				}
			}
		}

		// 群公告弹窗样式
		.notice-dialog-content {
			padding: 10px 0;

			.el-textarea {
				.el-textarea__inner {
					font-size: 14px;
					padding: 12px;
					border-radius: 6px;
					border: 1px solid rgba(0, 0, 0, 0.1);
					transition: all 0.3s ease;
					min-height: 120px;
					resize: vertical;
					line-height: 1.5;

					&:focus {
						border-color: var(--im-color-primary);
						box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
					}
				}
			}
		}

		.dialog-footer {
			text-align: right;

			.el-button {
				margin-left: 10px;
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


	.image-container {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		border-radius: 12px;

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
			column-gap: 30px;
			opacity: 0;
			transition: opacity 0.3s ease;

			i {
				color: white;
				font-size: 28px;
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
</style>