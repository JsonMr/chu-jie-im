<template>
  <el-dialog v-dialogDrag :title="$t('group.inviteTitle')" :visible.sync="show" width="620px" :before-close="close">
    <div class="add-group-member">
      <div class="left-box">
        <el-input :placeholder="$t('group.searchFriends')" v-model="searchText" size="small">
          <i class="el-icon-search el-input__icon" slot="suffix"> </i>
        </el-input>
        <el-scrollbar style="height:400px;">
          <div v-for="friend in friends" :key="friend.id">
            <friend-item v-show="friend.showNickName.includes(searchText)" @click.native="onSwitchCheck(friend)"
              :menu="false" :friend="friend" size="small">
              <el-checkbox :disabled="friend.disabled" @click.native.stop="" class="checkbox"
                v-model="friend.isCheck"></el-checkbox>
            </friend-item>
          </div>
        </el-scrollbar>
      </div>
      <div class="arrow el-icon-d-arrow-right"></div>
      <div class="right-box">
        <div class="tip"> {{ $t('group.checkedFriendsCount', { n: checkCount }) }}</div>
        <el-scrollbar style="height:400px;">
          <div v-for="friend in friends" :key="friend.id">
            <friend-item v-if="friend.isCheck && !friend.disabled" :friend="friend" size="small"
              @del="onRemoveFriend(friend)" :menu="false">
            </friend-item>
          </div>
        </el-scrollbar>
      </div>
    </div>
    <span slot="footer" class="dialog-footer">
      <el-button @click="close()">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" @click="onOk()">{{ $t('common.ok') }}</el-button>
    </span>
  </el-dialog>
</template>

<script>
import FriendItem from '../friend/FriendItem.vue';

export default {
  name: "addGroupMember",
  components: {
    FriendItem
  },
  data() {
    return {
      show: false,
      searchText: "",
      friends: []
    }
  },
  methods: {
    open() {
      this.show = true;
      this.friends = [];
      this.friendStore.friends.forEach((f) => {
        if (f.deleted) {
          return;
        }
        let friend = JSON.parse(JSON.stringify(f))
        let m = this.members.filter((m) => !m.quit).find((m) => m.userId == f.id);
        if (m) {
          // 好友已经在群里
          friend.disabled = true;
          friend.isCheck = true
        } else {
          friend.disabled = false;
          friend.isCheck = false;
        }
        this.friends.push(friend);
      })
    },
    close() {
      this.show = false;
    },
    onOk() {
      let inviteVO = {
        groupId: this.groupId,
        friendIds: []
      }
      this.friends.forEach((f) => {
        if (f.isCheck && !f.disabled) {
          inviteVO.friendIds.push(f.id);
        }
      })
      if (inviteVO.friendIds.length > 0) {
        this.$http({
          url: "/group/invite",
          method: 'post',
          data: inviteVO
        }).then(() => {
          this.$message.success(this.$t('group.inviteSuccess'));
          this.$emit("reload");
          this.close()
        })
      }
    },
    onRemoveFriend(friend) {
      friend.isCheck = false;
    },
    onSwitchCheck(friend) {
      if (!friend.disabled) {
        friend.isCheck = !friend.isCheck
      }
    }
  },
  props: {
    groupId: {
      type: Number
    },
    members: {
      type: Array
    }
  },
  computed: {
    checkCount() {
      return this.friends.filter((f) => f.isCheck && !f.disabled).length;
    }
  }
}
</script>

<style lang="scss" scoped>
.add-group-member {
  display: flex;

  .left-box {
    flex: 1;
    overflow: hidden;
    border: var(--im-border);

    .checkbox {
      margin-right: 10px;
    }
  }

  .arrow {
    display: flex;
    align-items: center;
    font-size: 18px;
    padding: 10px;
    color: var(--im-color-primary);
  }

  .right-box {
    flex: 1;
    border: var(--im-border);

    .tip {
      text-align: left;
      height: 32px;
      line-height: 32px;
      text-indent: 10px;
      color: var(--im-text-color-light)
    }
  }
}
</style>
