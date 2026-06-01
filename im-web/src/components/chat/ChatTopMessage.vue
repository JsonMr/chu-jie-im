<template>
    <div class="chat-top-message">
        <div class="title">{{ $t('chat.topMessageLabel') }}</div>
        <div class="content" v-html="content" @click.stop="onClickMessage"> </div>
        <div class="close" :title="$t('common.remove')" @click.stop="onClose"><i class="el-icon-close"></i></div>
    </div>
</template>
<script>
import HeadImage from '../common/HeadImage.vue';


export default {
    name: "chatTopMessage",
    components: { HeadImage },
    props: {
        group: {
            type: Object
        },
        groupMembers: {
            type: Array
        },
        msgInfo: {
            type: Object,
            required: true
        },
        headImage: {
            type: String,
            default: ''
        },
        showName: {
            type: String,
            required: true
        }
    },
    data() {
        return {

        }
    },
    methods: {
        onClose() {
            if (this.isOwner || this.isManager) {
                this.removeTopMessage();
            } else {
                this.hideTopMessage();
            }
        },
        onClickMessage() {
            // 定位消息
            this.$emit("locate", this.msgInfo);
        },
        removeTopMessage() {
            this.$confirm(this.$t('chat.removeTopConfirm'), this.$t('chat.removeTopTitle'), {
                confirmButtonText: this.$t('common.remove'),
                cancelButtonText: this.$t('common.cancel'),
                type: 'warning'
            }).then(() => {
                this.$http({
                    url: "/group/removeTopMessage/" + this.group.id,
                    method: 'delete'
                })
            });
        },
        hideTopMessage() {
            this.$http({
                url: "/group/hideTopMessage/" + this.group.id,
                method: 'delete'
            })
        }
    },
    computed: {
        content() {
            if (this.msgInfo.type == this.$enums.MESSAGE_TYPE.TEXT) {
                return this.$emo.transform(this.$str.html2Escape(this.msgInfo.content), 'emoji-normal');
            } else {
                return this.$msgUtil.previewContent(this.msgInfo)
            }
        },
        isOwner() {
            return this.group.ownerId == this.userStore.userInfo.id;
        },
        isManager() {
            let userId = this.userStore.userInfo.id;
            let m = this.groupMembers.find((m) => m.userId == userId);
            return m && m.isManager;
        }
    }

}
</script>

<style scoped lang="scss">
.chat-top-message {
    margin: 0 2px;
    display: flex;
    background: #DCEBFD;
    padding: 10px 15px;
    align-items: center;
    border-radius: 8px;

    .title {
        font-size: var(--im-font-size-large);
        color: #666;
    }

    .content {
        flex: 1;
        font-size: var(--im-font-size-large);
        color: #666;
        height: 25px;
        word-break: break-all;
        overflow: hidden;
        cursor: pointer;
        line-height: 25px;
        text-align: left;
        margin-left: 10px;
    }

    .close {
        margin-left: 10px;
        width: 30px;
        cursor: pointer;
    }
}
</style>