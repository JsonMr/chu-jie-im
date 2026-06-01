<template>
  <el-container class="group-page">
    <resizable-aside :default-width="260" :min-width="200" :max-width="500" storage-key="group-aside-width">
      <div class="header" :class="configStore.electronMode ? 'header-menu-wrap' : ''">
        <el-input class="search-text" size="small" :placeholder="$t('common.search')" v-model="searchText">
          <i class="el-icon-search el-input__icon" slot="prefix"> </i>
        </el-input>
        <el-button plain class="add-btn" icon="el-icon-plus" :title="$t('group.create')"
          @click="onCreateGroup()"></el-button>
      </div>
      <el-scrollbar class="group-items">
        <div v-for="(groups, i) in groupValues" :key="i">
          <div class="letter">{{ groupKeys[i] }}</div>
          <div v-for="group in groups" :key="group.id">
            <group-item :id="group.id" :group="group" :active="group.id == activeGroup.id" @chat="onSendMessage(group)"
              @quit="onQuit(group)" @dissolve="onDissolve(group)" @card="onSendCard(group)"
              @click.native="onActiveItem(group)">
            </group-item>
          </div>
          <div v-if="i < groupValues.length - 1" class="divider"></div>
        </div>
      </el-scrollbar>
    </resizable-aside>
    <el-container class="container" v-show="activeGroup.id">
      <div class="header" :class="configStore.electronMode ? 'header-menu-wrap' : ''">{{ activeGroup.showGroupName }}
      </div>
      <div class="container-box">
        <div class="unified-card">
          <!-- 头部区域 -->
          <div class="card-header">
            <div class="avatar-section">
              <file-upload v-if="isOwner || isManager" class="avatar-uploader" :action="imageAction" :isPermanent="true"
                :showLoading="true" :maxSize="maxSize" @success="onUploadSuccess"
                :fileTypes="['image/jpeg', 'image/png', 'image/jpg', 'image/webp']">
                <head-image class="avatar" :size="80" :url="activeGroup.headImageThumb" radius="50%"
                  :name="activeGroup.showGroupName">
                </head-image>
                <div class="upload-overlay">
                  <i class="el-icon-camera"></i>
                  <span>{{ $t('group.changeAvatar') }}</span>
                </div>
              </file-upload>
              <head-image v-else class="avatar" :size="80" :url="activeGroup.headImageThumb" radius="50%"
                :name="activeGroup.showGroupName">
              </head-image>
              <div class="group-info">
                <div class="group-header">
                  <div class="group-name"> {{ activeGroup.name }}
                    <el-tag v-if="activeGroup.isBanned" type="danger" size="small">{{ $t('group.banned') }}</el-tag>
                  </div>
                  <div :title="$t('common.more')" class="more-btn el-icon-more" @click="onClickMore"></div>
                </div>
                <!-- 成员头像区域 -->
                <div class="members-preview">
                  <div class="members-avatars">
                    <div v-for="member in previewMembers" :key="member.id" class="member-avatar">
                      <head-image :size="36" :url="member.headImage" radius="50%" :name="member.showNickName"
                        :id="member.userId"></head-image>
                    </div>
                    <div v-if="showMembers.length > 6" class="more-members-btn" @click="openMemberDialog">
                      <span>+{{ showMembers.length - 6 }}</span>
                    </div>
                    <div class="view-all-btn" @click="openMemberDialog">
                      <span>{{ $t('group.viewAllMembers') }}</span>
                      <i class="el-icon-arrow-right"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 内容区域 -->
          <div class="card-content">
            <!-- 群信息 -->
            <div class="info-content">
              <el-form class="form" label-width="130px" :model="activeGroup" size="small" ref="groupForm">
                <el-form-item :label="$t('group.owner')">
                  <div class="value">{{ ownerName }}</div>
                </el-form-item>
                <el-form-item :label="$t('group.groupName')">
                  <el-input v-model="activeGroup.name" :disabled="!isOwner && !isManager"
                    :placeholder="activeGroup.name" maxlength="32" show-word-limit></el-input>
                </el-form-item>
                <el-form-item :label="$t('group.remark')">
                  <el-input v-model="activeGroup.remarkGroupName" :placeholder="activeGroup.name" maxlength="32"
                    show-word-limit></el-input>
                </el-form-item>
                <el-form-item :label="$t('group.myNickname')">
                  <el-input v-model="activeGroup.remarkNickName" maxlength="20" :placeholder="mine.nickName"
                    show-word-limit></el-input>
                </el-form-item>
                <el-form-item :label="$t('group.notice')">
                  <el-input v-model="activeGroup.notice" :disabled="!isOwner && !isManager" type="textarea"
                    :autosize="{ minRows: 3 }" maxlength="512" :placeholder="$t('group.noNotice')"
                    show-word-limit></el-input>
                </el-form-item>
                <div class="btn-actions">
                  <el-button type="primary" icon="el-icon-position" @click="onSendMessage(activeGroup)">{{
                    $t('friend.sendMessage') }}</el-button>
                  <el-button type="success" @click="onSaveGroup()">{{ $t('common.save') }}</el-button>
                  <el-button type="danger" v-show="!isOwner" @click="onQuit(activeGroup)">{{ $t('group.quit')
                    }}</el-button>
                  <el-button type="danger" v-show="isOwner" @click="onDissolve(activeGroup)">{{ $t('group.dissolve')
                    }}</el-button>
                </div>
              </el-form>
            </div>
          </div>
        </div>
      </div>
    </el-container>
    <right-menu ref="rightMenu" @select="onSelectMenu"></right-menu>
    <complaint ref="complaint"></complaint>
    <chat-selector ref="chatSel" :title="$t('group.sendCard')"></chat-selector>
    <add-group-member ref="addGroupMember" :groupId="activeGroup.id" :members="groupMembers"
      @reload="reloadMembers()"></add-group-member>
    <group-member-selector ref="removeSelector" :title="$t('group.selectToRemove')" :group="activeGroup"
      @complete="onRemoveComplete"></group-member-selector>
    <group-member-selector ref="mutedSelector" :title="$t('group.selectToMute')" :group="activeGroup"
      @complete="onMutedComplete"></group-member-selector>
    <group-member-selector ref="unmutedSelector" :title="$t('group.selectToUnmute')" :group="activeGroup"
      @complete="onUnmutedComplete"></group-member-selector>

    <!-- 成员列表弹窗 -->
    <group-member-dialog ref="groupMemberDialog" :group="activeGroup" :groupMembers="groupMembers"
      @invite-member="onInviteMember" @remove-member="onRemoveMember" @muted="onMuted"
      @unmuted="onUnmuted"></group-member-dialog>
  </el-container>
</template>

<script>
import GroupItem from '../components/group/GroupItem';
import FileUpload from '../components/common/FileUpload';
import GroupMemberItem from '../components/group/GroupMemberItem.vue';
import AddGroupMember from '../components/group/AddGroupMember.vue';
import GroupMemberSelector from '../components/group/GroupMemberSelector.vue';
import GroupMemberDialog from '../components/group/GroupMemberDialog.vue';
import HeadImage from '../components/common/HeadImage.vue';
import ChatSelector from '../components/chat/ChatSelector.vue';
import ResizableAside from '../components/common/ResizableAside.vue';
import { pinyin } from 'pinyin-pro';
import Complaint from '../components/common/Complaint.vue';
import RightMenu from "../components/common/RightMenu.vue";

export default {
  name: "group",
  components: {
    GroupItem,
    GroupMemberItem,
    FileUpload,
    AddGroupMember,
    GroupMemberSelector,
    GroupMemberDialog,
    HeadImage,
    ChatSelector,
    ResizableAside,
    Complaint,
    RightMenu
  },
  data() {
    return {
      searchText: "",
      maxSize: 5 * 1024 * 1024,
      activeGroup: {}
    };
  },
  methods: {
    onClickMore(e) {
      this.$refs.rightMenu.open(e, this.menuItems)
    },
    onSelectMenu(item) {
      switch (item.key) {
        case 'CHAT':
          this.onSendMessage(this.activeGroup);
          break;
        case 'CARD':
          this.onSendCard(this.activeGroup);
          break;
        case 'COMPLAINT':
          this.onComplaint(this.activeGroup);
          break;
        case 'DISSOLVE':
          this.onDissolve(this.activeGroup);
          break;
        case 'QUIT':
          this.onQuit(this.activeGroup);
          break;
      }
    },
    onCreateGroup() {
      this.$prompt(this.$t('group.inputGroupName'), this.$t('group.createTitle'), {
        confirmButtonText: this.$t('common.ok'),
        cancelButtonText: this.$t('common.cancel'),
        inputPattern: /\S/,
        inputErrorMessage: this.$t('group.inputGroupName'),
        inputValidator: (value) => {
          if (value && value.length > 20) {
            return this.$t('group.groupNameMax20');
          }
        }
      }).then(o => {
        let data = { name: o.value }
        this.$http({
          url: `/group/create?groupName=${o.value}`,
          method: 'post',
          data: data
        }).then((group) => {
          this.groupStore.addGroup(group);
          this.onActiveItem(group)
          this.$message.success(this.$t('group.createSuccess'));
        })
      })
    },
    onActiveItem(group) {
      this.showMaxIdx = 50;
      // store数据不能直接修改，所以深拷贝一份内存
      this.activeGroup = JSON.parse(JSON.stringify(group));
      // 加载群成员
      this.reloadMembers();
    },
    async onSendCard(group) {
      // 先获取token
      const token = await this.$http({
        url: '/group/card/token/' + group.id,
        method: 'get',
      })
      this.$refs.chatSel.open(chats => {
        let idx = 0;
        chats.forEach(chat => {
          let cardData = {
            groupId: group.id,
            groupName: group.name,
            headImage: group.headImageThumb,
            token: token
          }
          let msgInfo = {};
          msgInfo.type = this.$enums.MESSAGE_TYPE.GROUP_CARD;
          msgInfo.content = JSON.stringify(cardData);
          if (chat.type == 'PRIVATE') {
            msgInfo.recvId = chat.targetId;
          } else {
            msgInfo.groupId = chat.targetId;
          }
          let action = `/message/${chat.type.toLowerCase()}/send`;
          this.$http({
            url: action,
            method: 'post',
            data: msgInfo
          }).then(m => {
            m.selfSend = true;
            this.chatStore.openChat(chat);
            this.chatStore.insertMessage(m, chat);
            if (++idx == chats.length) {
              this.$message.success(this.$t('group.sendSuccess'))
            }
          })
        })
      })
    },
    onComplaint(group) {
      this.$refs.complaint.open(2, group.id, group.name)
    },
    onInviteMember() {
      this.$refs.addGroupMember.open();
    },
    onRemoveMember() {
      // 群主和自己不显示
      let hideIds = [this.activeGroup.ownerId, this.mine.id];
      // 只有群主可以移除管理员
      if (!this.isOwner) {
        hideIds = hideIds.concat(this.managerIds);
      }
      this.$refs.removeSelector.open(50, [], [], hideIds);
    },
    onRemoveComplete(members) {
      let userIds = members.map(m => m.userId);
      let data = {
        groupId: this.activeGroup.id,
        userIds: userIds
      }
      this.$http({
        url: "/group/members/remove",
        method: 'delete',
        data: data
      }).then(() => {
        this.reloadMembers();
        this.$message.success(this.$t('group.removedMembers', { n: userIds.length }));
      })
    },
    onMuted() {
      // 群主和自己不显示
      let hideIds = [this.activeGroup.ownerId, this.mine.id];
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
        groupId: this.activeGroup.id,
        userIds: userIds,
        isMuted: true
      }
      let tip = this.$t('group.mutedMembers', { n: userIds.length });
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
        groupId: this.activeGroup.id,
        userIds: userIds,
        isMuted: false
      }
      let tip = this.$t('group.unmutedMembers', { n: userIds.length });
      this.sendMemberMuted(data, tip);
    },
    onUploadSuccess(data) {
      this.activeGroup.headImage = data.originUrl;
      this.activeGroup.headImageThumb = data.thumbUrl;
    },
    onSaveGroup() {
      this.$refs['groupForm'].validate((valid) => {
        if (valid) {
          let vo = this.activeGroup;
          this.$http({
            url: "/group/modify",
            method: "put",
            data: vo
          }).then((group) => {
            this.groupStore.updateGroup(group);
            this.$message.success(this.$t('group.modifySuccess'));
          })
        }
      });
    },
    onDissolve(group) {
      this.$confirm(this.$t('group.dissolveConfirm', { name: group.name }), this.$t('group.dissolveConfirmTitle'), {
        confirmButtonText: this.$t('common.ok'),
        cancelButtonText: this.$t('common.cancel'),
        type: 'warning'
      }).then(() => {
        this.$http({
          url: `/group/delete/${group.id}`,
          method: 'delete'
        }).then(() => {
          this.$message.success(this.$t('group.dissolved', { name: group.name }));
          this.groupStore.removeGroup(group.id);
          this.reset();
        });
      })
    },
    onQuit(group) {
      this.$confirm(this.$t('group.quitConfirm', { name: group.showGroupName }), this.$t('group.quitConfirmTitle'), {
        confirmButtonText: this.$t('common.ok'),
        cancelButtonText: this.$t('common.cancel'),
        type: 'warning'
      }).then(() => {
        this.$http({
          url: `/group/quit/${group.id}`,
          method: 'delete'
        }).then(() => {
          this.$message.success(this.$t('group.quitSuccess', { name: group.name }));
          this.groupStore.removeGroup(group.id);
          this.chatStore.removeGroupChat(group.id);
          this.reset();
        });
      })
    },
    onSendMessage(group) {
      let chat = {
        type: 'GROUP',
        targetId: group.id,
        showName: group.showGroupName,
        headImage: group.headImageThumb,
        isDnd: group.isDnd,
        isTop: group.isTop
      };
      this.chatStore.openChat(chat);
      this.chatStore.setActiveChat(chat);
      this.$router.push("/home/chat");
    },

    locateItem(id) {
      document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
    },
    sendMemberMuted(data, tip) {
      this.$http({
        url: "/group/members/muted",
        method: "put",
        data: data
      }).then(() => {
        this.reloadMembers();
        this.$message.success(tip);
      })
    },
    reloadMembers() {
      this.groupStore.refreshMember(this.activeGroup.id);
    },
    reset() {
      this.activeGroup = {};
    },
    firstLetter(strText) {
      // 使用pinyin-pro库将中文转换为拼音
      let pinyinOptions = {
        toneType: 'none', // 无声调
        type: 'normal' // 普通拼音
      };
      let pyText = pinyin(strText, pinyinOptions);
      return pyText[0];
    },
    isEnglish(character) {
      return /^[A-Za-z]+$/.test(character);
    },
    openMemberDialog() {
      this.$refs.groupMemberDialog.open();
    }
  },
  computed: {
    mine() {
      return this.userStore.userInfo;
    },
    ownerName() {
      let member = this.groupMembers.find((m) => m.userId == this.activeGroup.ownerId);
      return member && member.showNickName;
    },
    isOwner() {
      return this.activeGroup.ownerId == this.mine.id;
    },
    isManager() {
      let userId = this.mine.id;
      let m = this.groupMembers.find((m) => m.userId == userId);
      return m && m.isManager;
    },
    isAllowShareCard() {
      return this.isOwner || this.isManager || this.activeGroup.isAllowShareCard;
    },
    managerIds() {
      return this.groupMembers.filter(m => m.isManager).map(m => m.userId)
    },
    imageAction() {
      return `/image/upload?thumbSize=20`;
    },
    groupMap() {
      // 按首字母分组
      let map = new Map();
      this.groupStore.groups.forEach((g) => {
        if (g.quit || (this.searchText && !g.showGroupName.includes(this.searchText))) {
          return;
        }
        let letter = this.firstLetter(g.showGroupName).toUpperCase();
        // 非英文一律为#组
        if (!this.isEnglish(letter)) {
          letter = "#"
        }
        if (map.has(letter)) {
          map.get(letter).push(g);
        } else {
          map.set(letter, [g]);
        }
      })
      // 排序
      let arrayObj = Array.from(map);
      arrayObj.sort((a, b) => {
        // #组在最后面
        if (a[0] == '#' || b[0] == '#') {
          return b[0].localeCompare(a[0])
        }
        return a[0].localeCompare(b[0])
      })
      map = new Map(arrayObj.map(i => [i[0], i[1]]));
      return map;
    },
    groupKeys() {
      return Array.from(this.groupMap.keys());
    },
    groupValues() {
      return Array.from(this.groupMap.values());
    },
    showMembers() {
      return this.groupMembers.filter((m) => !m.quit)
    },
    previewMembers() {
      return this.showMembers.slice(0, 6);
    },
    menuItems() {
      let items = [];
      items.push({
        key: 'CHAT',
        name: this.$t('group.sendMessage'),
      });
      if (this.isAllowShareCard) {
        items.push({
          key: 'CARD',
          name: this.$t('group.sendCard'),
        });
      }
      items.push({
        key: 'COMPLAINT',
        name: this.$t('complaint.report'),
      });
      if (this.isOwner) {
        items.push({
          key: 'DISSOLVE',
          name: this.$t('group.dissolve'),
          danger: true
        });
      } else {
        items.push({
          key: 'QUIT',
          name: this.$t('group.quit'),
          danger: true
        });
      }
      return items;
    },
    groupMembers() {
      let group = this.groupStore.findGroup(this.activeGroup.id);
      return group ? group.members : [];
    }
  },
  mounted() {
    // 选中群聊
    let groupId = this.$route.query.id;
    if (groupId) {
      let group = this.groupStore.findGroup(parseInt(groupId));
      this.onActiveItem(group);
      this.locateItem(group.id);
    }
  }
}
</script>

<style lang="scss" scoped>
.group-page {

  .divider {
    border-bottom: 1px #ddd solid;
    margin: 10px;
  }

  .header {
    height: 60px;
    display: flex;
    align-items: center;
    padding: 0 12px;

    .add-btn {
      padding: 8px;
      margin: 5px;
      font-size: 16px;
      border-radius: 50%;
      background: var(--im-background-active);
      color: var(--im-color-primary);
      transition: all 0.3s ease;
      font-weight: 600;
      border: var(--im-border);

      &:hover {
        background: var(--im-background-active-dark);
        transform: scale(1.1);
      }
    }
  }

  .group-items {
    flex: 1;

    .letter {
      text-align: left;
      font-size: var(--im-larger-size-larger);
      margin: 5px 15px;
      color: var(--im-text-color-light);
    }
  }

  .container {
    display: flex;
    flex-direction: column;
    background: #fcfdff;

    .header {
      display: flex;
      justify-content: space-between;
      padding: 0 12px;
      line-height: 60px;
      font-size: var(--im-font-size-larger);
      border-bottom: var(--im-border);
    }

    .el-divider--horizontal {
      margin: 16px 0;
    }

    .container-box {
      overflow: auto;
      padding: 20px;
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;


      .unified-card {
        display: flex;
        flex-direction: column;
        width: 100%;
        border-radius: 20px;
        overflow: hidden;

        .card-header {
          padding: 20px 30px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);

          .avatar-section {
            display: flex;
            align-items: center;
            padding: 0 20px;

            .avatar {
              position: relative;
            }

            .avatar-uploader {
              position: relative;
              display: inline-block;

              .el-upload {
                border: none !important;
                border-radius: 50%;
                cursor: pointer;
                position: relative;
                overflow: hidden;
              }

              .upload-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 12px;
                border-radius: 50%;
                opacity: 0;
                transition: all 0.3s ease;

                i {
                  font-size: 18px;
                  margin-bottom: 4px;
                }

                span {
                  font-size: 10px;
                  font-weight: 500;
                }
              }

              &:hover .upload-overlay {
                opacity: 1;
              }
            }

            .group-info {
              flex: 1;
              display: flex;
              flex-direction: column;
              margin: 0 20px;

              .group-header {
                padding: 10px;
                display: flex;
                align-items: center;
                justify-content: space-between;


                .group-name {
                  font-size: 24px;
                  font-weight: 700;
                  color: var(--im-text-color-primary);
                  letter-spacing: -0.5px;
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  margin: 0;
                }

                .more-btn {
                  font-size: 20px;
                  cursor: pointer;
                  padding: 8px;
                  border-radius: 50%;
                  transition: all 0.3s ease;
                  background: var(--im-background-active);
                  color: var(--im-color-primary);
                  margin: 0;

                  &:hover {
                    background: var(--im-background-active-dark);
                    transform: scale(1.1);
                  }
                }
              }

              .members-preview {
                background: rgba(255, 255, 255, 0.6);
                border-radius: 12px;
                padding: 12px 16px;
                border: 1px solid rgba(0, 0, 0, 0.06);
                box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);

                .members-avatars {
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  flex-wrap: wrap;

                  .member-avatar {
                    position: relative;
                    transition: all 0.3s ease;

                    &:hover {
                      transform: scale(1.1);
                    }
                  }

                  .more-members-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: var(--im-color-primary-light-2);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);

                    &:hover {
                      transform: scale(1.1);
                      box-shadow: 0 4px 16px rgba(64, 158, 255, 0.4);
                    }
                  }

                  .view-all-btn {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 6px 12px;
                    background: var(--im-color-primary-light-2);
                    color: white;
                    border-radius: 16px;
                    font-size: var(--im-font-size-smaller);
                    font-weight: 500;
                    cursor: pointer;
                    margin-left: 8px;

                    i {
                      font-size: 10px;
                    }
                  }
                }
              }
            }

          }
        }

        .card-content {
          padding: 12px;
          border-radius: 12px;

          .info-content {
            .form {
              padding: 10px;

              .el-form-item {
                text-align: left;

                .value {
                  color: var(--im-text-color-light);
                }
              }

              .btn-actions {
                margin-top: 40px;
                text-align: center;

                .el-button {
                  margin: 0 8px;
                }
              }
            }
          }
        }
      }
    }
  }

}
</style>