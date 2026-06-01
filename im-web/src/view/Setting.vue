<template>
  <el-container class="setting-page">
    <!-- 左侧导航 -->
    <el-aside width="230px" class="setting-aside" :class="{ fullscreen: configStore.fullScreen }">
      <div class="nav-menu">
        <div v-for="(item, index) in displayMenuItems" :key="index" class="nav-item"
          :class="{ active: currentTab === index }" @click="switchTab(index)">
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </div>
      </div>
    </el-aside>

    <!-- 右侧内容区域 -->
    <el-container class="setting-main">
      <div class="content-wrapper" :class="configStore.electronMode ? 'header-menu-wrap' : ''">
        <!-- 个人资料 -->
        <div v-show="currentComponent === 'personalInfo'" class="tab-content">
          <personal-info ref="personalInfo" @switch-tab="onSwitchTab"></personal-info>
        </div>

        <!-- 用户设置 -->
        <div v-show="currentComponent === 'userConfig'" class="tab-content">
          <user-config ref="userConfig"></user-config>
        </div>

        <!-- 绑定手机 -->
        <div v-show="currentComponent === 'bindPhone'" class="tab-content">
          <bind-phone ref="bindPhone"></bind-phone>
        </div>

        <!-- 绑定邮箱 -->
        <div v-show="currentComponent === 'bindEmail'" class="tab-content">
          <bind-email ref="bindEmail"></bind-email>
        </div>

        <!-- 修改密码 -->
        <div v-show="currentComponent === 'modifyPassword'" class="tab-content">
          <modify-password ref="modifyPassword"></modify-password>
        </div>

        <!-- 实名认证 -->
        <div v-show="currentComponent === 'realnameAuth'" class="tab-content">
          <realname-auth ref="realnameAuth"></realname-auth>
        </div>

        <!-- 关于我们 -->
        <div v-show="currentComponent === 'aboutUs'" class="tab-content" v-if="configStore.electronMode">
          <about-us ref="aboutUs"></about-us>
        </div>

        <!-- 我的黑名单 -->
        <div v-show="currentComponent === 'blackList'" class="tab-content">
          <black-list ref="blackList"></black-list>
        </div>

        <!-- 我的投诉 -->
        <div v-show="currentComponent === 'complaintList'" class="tab-content">
          <complaint-list ref="complaintList"></complaint-list>
        </div>
      </div>
    </el-container>
  </el-container>
</template>

<script>
import ModifyPassword from '../components/setting/ModifyPassword.vue';
import PersonalInfo from '../components/setting/PersonalInfo.vue';
import UserConfig from '../components/setting/UserConfig.vue';
import BindPhone from '../components/setting/BindPhone.vue';
import BindEmail from '../components/setting/BindEmail.vue';
import RealnameAuth from '../components/setting/RealnameAuth.vue';
import AboutUs from '../components/setting/AboutUs.vue';
import BlackList from '../components/setting/BlackList.vue';
import ComplaintList from '../components/setting/ComplaintList.vue';

export default {
  name: "SettingPage",
  components: {
    PersonalInfo,
    UserConfig,
    BindPhone,
    BindEmail,
    ModifyPassword,
    RealnameAuth,
    AboutUs,
    BlackList,
    ComplaintList
  },
  data() {
    return {
      currentTab: 0
    }
  },
  computed: {
    menuItems() {
      const items = [
        {
          label: this.$t('setting.personalInfo'),
          icon: 'el-icon-user',
          component: 'personalInfo'
        },
        {
          label: this.$t('setting.userConfig'),
          icon: 'el-icon-setting',
          component: 'userConfig'
        },
        {
          label: this.$t('setting.bindPhone'),
          icon: 'el-icon-mobile-phone',
          component: 'bindPhone',
          show: () => this.configStore.registration.mode.includes('phone')
        },
        // {
        //   label: this.$t('setting.bindEmail'),
        //   icon: 'el-icon-message',
        //   component: 'bindEmail',
        //   show: () => this.configStore.registration.mode.includes('email')
        // },
        {
          label: this.$t('setting.modifyPassword'),
          icon: 'el-icon-lock',
          component: 'modifyPassword'
        },
        // {
        //   label: this.$t('setting.realnameAuth'),
        //   icon: 'el-icon-postcard',
        //   component: 'realnameAuth'
        // },
        {
          label: this.$t('setting.myBlacklist'),
          icon: 'el-icon-notebook-2',
          component: 'blackList'
        },
        // {
        //   label: this.$t('setting.myComplaint'),
        //   icon: 'el-icon-tickets',
        //   component: 'complaintList'
        // }
      ];

      if (this.configStore.electronMode) {
        items.push({
          label: this.$t('setting.aboutUs'),
          icon: 'el-icon-info',
          component: 'aboutUs'
        });
      }

      return items;
    },
    displayMenuItems() {
      return this.menuItems.filter(item => !item.show || item.show());
    },
    currentComponent() {
      const item = this.displayMenuItems[this.currentTab];
      return item.component;
    }
  },
  mounted() {
    this.init();
    // 监听来自UserProfileCard的切换事件
    this.$eventBus.$on('switchToPersonalInfo', () => {
      this.switchTab(0); // 切换到个人资料tab (index 0)
    });
  },
  methods: {
    init() {
      // 根据路由参数设置当前tab
      const tab = this.$route.query.tab;
      if (tab) {
        this.currentTab = parseInt(tab);
      }
      this.$nextTick(() => this.onClickTab());
    },
    switchTab(index) {
      this.currentTab = index;
      this.$nextTick(() => this.onClickTab());
    },
    onClickTab() {
      const componentName = this.currentComponent;
      if (componentName && this.$refs[componentName] && this.$refs[componentName].init) {
        this.$refs[componentName].init();
      }
    },
    onSwitchTab(tabIndex) {
      this.currentTab = parseInt(tabIndex);
      this.$nextTick(() => this.onClickTab());
    }
  },
  beforeDestroy() {
    // 移除事件监听，避免内存泄漏
    this.$eventBus.$off('switchToPersonalInfo');
  }
}
</script>

<style lang="scss" scoped>
.setting-page {
  height: 100vh;
  background: #f5f6fa;

  .setting-aside {
    display: flex;
    flex-direction: column;
    border-right: 1px solid rgba(0, 0, 0, 0.08);
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
    background: white;

    &.fullscreen {
      width: 260px !important;

      @media (min-width: 1200px) {
        width: 290px !important;
      }
    }

    .nav-menu {

      .nav-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        color: #666;
        font-weight: 500;
        border-left: 3px solid transparent;
        margin: 2px 0;

        &:hover {
          background: var(--im-background-active);
          color: var(--im-color-primary);
        }

        &.active {
          background: var(--im-background-active-dark);
          color: var(--im-color-primary);
          border-left-color: var(--im-color-primary);
          font-weight: 600;
        }

        i {
          font-size: 18px;
          width: 20px;
          text-align: center;
        }

        span {
          font-size: 14px;
        }
      }
    }
  }

  .setting-main {
    background: #fcfdff;
    overflow: hidden;

    .content-wrapper {
      height: 100%;
      overflow-y: auto;
      width: 100%;

      .tab-content {
        height: 100%;
        overflow-y: auto;
        padding: 0;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
    }
  }
}
</style>
