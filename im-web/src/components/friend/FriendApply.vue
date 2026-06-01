<template>
    <el-dialog class="friend-apply" :title="$t('friend.applyTitle')" width="400px" :visible.sync="isShow" :before-close="onClose"
        append-to-body>
        <div>
            <el-input type="textarea" v-model="remark" maxlength="255" :autosize="{ minRows: 5 }" show-word-limit>
            </el-input>
            <div class="tip">{{ $t('friend.applyTip') }}</div>
        </div>
        <span slot="footer" class="dialog-footer">
            <el-button @click="onClose()">{{ $t('common.cancel') }}</el-button>
            <el-button type="primary" @click="onOk()">{{ $t('common.confirm') }}</el-button>
        </span>
    </el-dialog>
</template>

<script>
export default {
    name: "friendApply",
    components: {},
    data() {
        return {
            isShow: false,
            remark: "",
            userInfo: {}
        }
    },
    methods: {
        open(userInfo) {
            this.isShow = true;
            this.userInfo = userInfo;
            this.remark = this.$t('friend.defaultRemark', { name: this.userStore.userInfo.nickName });
            if (!this.userInfo.isManualApprove) {
                // 对方未开启好友验证,直接发起
                this.remark = "";
                this.sendApplyRequest();
                this.isShow = false;
            }
        },
        onClose() {
            this.isShow = false;
             this.$emit('close');
        },
        onOk() {
            this.sendApplyRequest();
        },
        sendApplyRequest() {
            let formData = {
                friendId: this.userInfo.id,
                remark: this.remark
            }
            console.log('@@@',this.chatStore.activeChat)
            if(this.chatStore.activeChat && this.chatStore.activeChat.type == 'GROUP'){
                this.$set(formData,'groupId',this.chatStore.activeChat.targetId);
            }
            this.$http({
                url: "/friend/request/apply",
                method: "post",
                data: formData
            }).then((request) => {
                if (request.status == this.$enums.REQUEST_STATUS.APPROVED) {
                    this.$message.success(this.$t('friend.addSuccess', { name: this.userInfo.nickName }));
                    let friend = {
                        id: this.userInfo.id,
                        nickName: this.userInfo.nickName,
                        showNickName: this.userInfo.nickName,
                        headImage: this.userInfo.headImageThumb,
                        online: this.userInfo.online,
                        deleted: false
                    }
                    this.friendStore.addFriend(friend);
                } else if (request.status == this.$enums.REQUEST_STATUS.PENDING) {
                    this.$message.success(this.$t('friend.applySent', { name: this.userInfo.nickName }));
                    this.friendStore.addRequest(request);
                }
                this.onClose();
            })
        }
    }

}
</script>


<style lang="scss" scoped>
.friend-apply {
    .tip {
        color: var(--im-text-color-light);
        font-size: var(--im-font-size-small);
        line-height: 35px;
    }
}
</style>