<template>
    <div>
        <div ref="item" @contextmenu.prevent="showRightMenu($event)">
            <group-member-bar v-if="type == 'bar'" :group="group" :member="member" :height="height" :active="active">
                <slot></slot>
            </group-member-bar>
            <group-member-card v-else :member="member"></group-member-card>
        </div>
        <right-menu ref="rightMenu" @select="onSelectMenu"></right-menu>
        <friend-apply ref="applyRef"></friend-apply>
    </div>
</template>

<script>

import RightMenu from '../common/RightMenu.vue';
import FriendApply from "../friend/FriendApply.vue";
import GroupMemberBar from './GroupMemberBar.vue';
import GroupMemberCard from './GroupMemberCard.vue';

export default {
    name: "groupMemberItem",
    components: { RightMenu, FriendApply, GroupMemberBar, GroupMemberCard },
    data() {
        return {};
    },
    props: {
        group: {
            type: Object,
            required: true
        },
        groupMembers: {
            type: Array
        },
        member: {
            type: Object,
            required: true
        },
        height: {
            type: Number,
            default: 50
        },
        menu: {
            type: Boolean,
            default: true
        },
        active: {
            type: Boolean,
            default: false
        },
        type: {
            type: String,
            default: 'bar'
        }
    },
    methods: {
        showRightMenu(e) {
            if (!this.menu || this.mine.id == this.member.userId) {
                return;
            }
            let menuItems = [];
            if (this.isFriend) {
                menuItems.push({
                    key: 'SEND_MESSAGE',
                    name: this.$t('group.sendMessage'),
                });
            }
            menuItems.push({
                key: 'USER_INFO',
                name: this.$t('group.viewProfile'),
            });
            if (!this.isFriend && !this.isWaitingApprove) {
                menuItems.push({
                    key: 'APPLY_FRIEND',
                    name: this.$t('friend.addAsFriend'),
                });
            }
            // 该成员是否群主
            const isMemberOwner = this.member.userId == this.group.ownerId;
            // 管理员有权踢人、禁言,但对方不能是群主或管理员
            if (this.isOwner || (this.isManager && !this.member.isManager && !isMemberOwner)) {
                if (!this.member.isMuted) {
                    menuItems.push({
                        key: 'MUTE',
                        name: this.$t('group.muteMember'),
                    });
                } else {
                    menuItems.push({
                        key: 'UN_MUTE',
                        name: this.$t('group.unmuteMember'),
                    });
                }
                menuItems.push({
                    key: 'KICK',
                    name: this.$t('group.kickMember'),
                });
            }
            // 群主有权设置管理员
            if (this.isOwner) {
                if (!this.member.isManager) {
                    menuItems.push({
                        key: 'ADD_MANAGER',
                        name: this.$t('group.addManager'),
                    });
                } else {
                    menuItems.push({
                        key: 'RM_MANAGER',
                        name: this.$t('group.removeManager')
                    });
                }
            }
            this.$refs.rightMenu.open(e, menuItems);
        },
        onSelectMenu(item) {
            switch (item.key) {
                case "USER_INFO":
                    this.showUserInfo();
                    break;
                case "SEND_MESSAGE":
                    this.sendMessage();
                    break;
                case "APPLY_FRIEND":
                    this.applyFriend();
                    break;
                case "UN_MUTE":
                    this.setMute(false);
                    break;
                case "MUTE":
                    this.setMute(true);
                    break;
                case "KICK":
                    this.kick();
                    break;
                case "ADD_MANAGER":
                    this.addManager();
                    break;
                case "RM_MANAGER":
                    this.removeManager();
                    break;
            }
        },
        sendMessage() {
            let friend = this.friendStore.findFriend(this.member.userId);
            let chat = {
                type: 'PRIVATE',
                targetId: friend.id,
                showName: friend.showNickName,
                headImage: friend.headImage,
            };
            this.chatStore.openChat(chat);
            this.chatStore.setActiveChat(chat);
        },
        applyFriend() {
            this.$http({
                url: `/user/find/${this.member.userId}`,
                method: 'GET'
            }).then((userInfo) => {
                this.$refs.applyRef.open(userInfo);
            })
        },
        setMute(isMuted) {
            let data = {
                groupId: this.group.id,
                userIds: [this.member.userId],
                isMuted: isMuted
            }
            this.$http({
                url: "/group/members/muted",
                method: "put",
                data: data
            }).then(() => {
                this.member.isMuted = isMuted;
                if (isMuted) {
                    this.$message.success(this.$t('group.muteSuccess', { name: this.member.showNickName }))
                } else {
                    this.$message.success(this.$t('group.unmuteSuccess', { name: this.member.showNickName }))
                }
            })
        },
        kick() {
            this.$confirm(this.$t('group.kickConfirm', { name: this.member.showNickName }), this.$t('group.kickConfirmTitle'), {
                confirmButtonText: this.$t('common.confirm'),
                cancelButtonText: this.$t('common.cancel'),
                type: 'warning'
            }).then(() => {
                let data = {
                    groupId: this.group.id,
                    userIds: [this.member.userId]
                }
                this.$http({
                    url: '/group/members/remove',
                    method: 'delete',
                    data: data
                }).then(() => {
                    this.$message.success(this.$t('group.kickSuccess', { name: this.member.showNickName }));
                    this.member.quit = true;
                });
            })
        },
        addManager() {
            let data = {
                groupId: this.group.id,
                userIds: [this.member.userId]
            }
            this.$http({
                url: "/group/manager/add",
                method: "post",
                data: data
            }).then(() => {
                this.member.isManager = true;
                this.$message.success(this.$t('group.addManagerSuccess', { name: this.member.showNickName }))
            })
        },
        removeManager() {
            let data = {
                groupId: this.group.id,
                userIds: [this.member.userId]
            }
            this.$http({
                url: "/group/manager/remove",
                method: "delete",
                data: data
            }).then(() => {
                this.member.isManager = false;
                this.$message.success(this.$t('group.removeManagerSuccess', { name: this.member.showNickName }))
            })
        },
        showUserInfo() {
            this.$http({
                url: `/user/find/${this.member.userId}`,
                method: 'get'
            }).then((user) => {
                let left = this.$elm.fixLeft(this.$refs.item);
                let top = this.$elm.fixTop(this.$refs.item);
                let pos = {
                    x: left + 50,
                    y: top
                };
                this.$eventBus.$emit("openUserInfo", user, pos);
            })
        }
    },
    computed: {
        mine() {
            return this.userStore.userInfo;
        },
        isOwner() {
            return this.mine.id == this.group.ownerId;
        },
        isManager() {
            let userId = this.mine.id;
            let m = this.groupMembers.find((m) => m.userId == userId);
            return m && m.isManager;
        },
        isFriend() {
            return this.friendStore.isFriend(this.member.userId);
        },
        isWaitingApprove() {
            return this.friendStore.isInRecvRequest(this.member.userId);
        }
    }
}
</script>

<style lang="scss"></style>
