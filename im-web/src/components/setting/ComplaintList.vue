<template>
    <div class="black-list">
        <!-- <div class="header" :class="configStore.electronMode ? 'header-menu-wrap' : ''">
            <el-input class="search-text" size="small" :placeholder="$t('common.search')" v-model="searchText">
                <i class="el-icon-search el-input__icon" slot="prefix"> </i>
            </el-input>
        </div> -->

        <el-scrollbar ref="scrollbar" class="scroll-container" @scroll="handleScroll">
            <div class="list-box">
                <div class="item-box" v-for="(item, index) in items" :key="index">
                    <div class="field-box">{{ $t('complaint.target') }}：{{ item.targetName }}</div>
                    <div class="field-box">{{ $t('complaint.reason') }}：{{ complaintTypeText(item) }}</div>
                    <div class="field-box">{{ $t('complaint.content') }}：{{ item.content }}</div>
                    <div class="field-box">{{ $t('complaint.images') }}：</div>
                    <div class="imgs-box">
                        <img :src="image" v-for="(image, imgIndex) in item.images" :key="imgIndex" />
                    </div>
                </div>
            </div>
            <!-- 加载状态提示 -->
            <div v-if="loading" class="loading-text">加载中...</div>
            <div v-else-if="noMore" class="no-more-text">没有更多数据了</div>
        </el-scrollbar>
    </div>
</template>
<script>
import HeadImage from "../../components/common/HeadImage.vue";
import VirtualScroller from '../common/VirtualScroller.vue';
export default {
    name: "complaintList",
    components: {
        HeadImage,
        VirtualScroller
    },
    data() {
        return {
            searchText: '',
            loading: false,
            noMore: false,
            items: []
        }
    },
    mounted() {
        this.loadBlackList();
    },
    computed: {
        nextPageMaxId() {
            if (this.items.length > 0) {
                const idx = this.items.length - 1;
                return this.items[idx].id;
            }
            return -1
        },
    },
    methods: {
        complaintTypeText(item) {
            const dict = this.$dict.COMPLAINT_TYPE;
            return this.$dict.covertToName(dict, item.type, '')
        },
        loadBlackList(init) {
            // 如果正在加载或没有更多数据，则直接返回
            if (this.loading || this.noMore) {
                return;
            }
            this.loading = true;
            // 获取黑名单信息
            this.$http({
                url: '/complaint/page?maxPageId=' + this.nextPageMaxId,
                method: 'GET'
            }).then((res) => {
                if (init) this.items = [];
                let newList = res;
                if (newList && newList.length > 0) {
                    newList = newList.map(item => {
                        item['images'] = item.images && item.images.length > 0 ? item.images.split(',') : [];
                        return item;
                    })
                    // 将新数据追加到现有列表
                    this.items = this.items.concat(newList);
                } else {
                    // 如果返回数据为空，说明没有更多数据了
                    this.noMore = true;
                }
            })

            this.loading = false;
        },
        /**
         * 处理滚动事件
         * @param {Object} scrollInfo - 滚动信息对象，包含 scrollTop, clientHeight, scrollHeight
         */
        handleScroll(scrollInfo) {
            const { scrollTop, clientHeight, scrollHeight } = scrollInfo;

            // 判断是否滚动到接近底部
            // 这里设置距离底部100px时触发，可以根据体验调整
            if (scrollTop + clientHeight >= scrollHeight - 100) {
                this.loadBlackList();
            }
        },
        init() {
            this.page = 1;
            this.initEvent();
        },
        initEvent() {
            if (!this.isInitEvent) {
                let scrollWrap = this.$refs.scrollbar.$el.querySelector('.el-scrollbar__wrap');
                scrollWrap.addEventListener('scroll', this.onScroll);
                this.isInitEvent = true;
            }
        },
        onScroll(e) {
            const scrollbar = e.target;
            // 滚到底部
            if (scrollbar.scrollTop + scrollbar.clientHeight >= scrollbar.scrollHeight - 30) {
                if (this.showMaxIdx >= this.items.length) {
                    this.showTip();
                } else {
                    this.page++;
                }
            }
        },
        showTip() {
            if (!this.lockTip) {
                this.$message.success(this.$t('common.reachedBottom'))
                this.lockTip = true;
                setTimeout(() => {
                    this.lockTip = false;
                }, 3000)
            }
        }
    }
}
</script>
<style scoped lang="scss">
.black-list {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    background: #fafbfc;

    .scroll-container {
        width: 100%;
        height: 100%;
    }


    .list-box {
        padding: 15px 15px 1px 15px;
        // display: grid;
        // grid-template-columns: 1fr 1fr;
        // column-gap: 15px;
        // row-gap: 15px;

        .item-box {
            padding: 15px;
            border-radius: 8px;
            text-align: left;
            background: #FFF;

            .field-box {
                font-size: 14px;
            }

            .field-box+.field-box {
                margin-top: 10px;
            }

            .imgs-box {
                margin-top: 10px;
                display: flex;
                flex-wrap: wrap;

                img {
                    width: 80px;
                    height: 80px;
                    border-radius: 10px;
                    margin-right: 10px;
                    margin-bottom: 10px;
                }
            }
        }
    }

}
</style>
