<template>
    <div class="my-time-picker">
        <el-time-select class="time-select" size="mini" v-model="timeObj.startTime" :picker-options="{
            start: '00:00',
            step: '00:01',
            end: '23:59'
        }" placeholder="开始" :prefix-icon="' '" :clearable="false" @change="onStartTimeChange">
        </el-time-select>
        <span>-</span>
        <el-time-select class="time-select" size="mini" v-model="timeObj.endTime" :picker-options="{
            start: '00:00',
            step: '00:01',
            end: '23:59'
        }" placeholder="结束" :prefix-icon="' '" :clearable="false" @change="onEndTimeChange">
        </el-time-select>
    </div>
</template>

<script>
export default {
    name: "myTimePicker",
    data() {
        return {
            timeObj: {}
        }
    },
    props: {
        startTime: {
            type: String,
            default: ''
        },
        endTime: {
            type: String,
            default: ''
        }
    },
    mounted() {
        this.$set(this.timeObj, 'startTime', this.startTime);
        this.$set(this.timeObj, 'endTime', this.endTime);
    },
    methods: {
        onStartTimeChange(e) {
            console.log(e)
            this.$emit("timeChange", { label: 'startTime', value: e });
        },
        onEndTimeChange(e) {
            this.$emit("timeChange", { label: 'endTime', value: e });
        },
    }
}
</script>

<style scoped lang="scss">
.my-time-picker {
    display: flex;
    align-items: center;

    .time-select {
        width: 60px;
        margin: 0;
        

        :deep(.el-input__inner) {
            padding: 0;
            border:none;
            text-align: center;
            background: transparent;
        }
    }
}
</style>