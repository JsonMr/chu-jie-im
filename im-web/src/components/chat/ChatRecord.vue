<template>
	<el-dialog v-dialogDrag class="chat-record" :title="$t('chatRecord.title')" :visible.sync="visible" width="600px"
		:before-close="onClose">
		<div v-show="mode == 'RECORD'">
			<div class="tip">{{ stateTip }}</div>
			<div>{{ $t('chatRecord.duration') }}: {{ state == 'STOP' ? 0 : parseInt(rc.duration) }}s</div>
		</div>
		<audio v-show="mode == 'PLAY'" :src="url" controls ref="audio" @ended="onStopAudio()"></audio>
		<el-divider content-position="center"></el-divider>
		<el-row class="btn-group">
			<el-button round type="primary" v-show="state == 'STOP'" @click="onStartRecord()">{{
				$t('chatRecord.startRecord') }}</el-button>
			<el-button round type="warning" v-show="state == 'RUNNING'" @click="onPauseRecord()">{{
				$t('chatRecord.pauseRecord') }}</el-button>
			<el-button round type="primary" v-show="state == 'PAUSE'" @click="onResumeRecord()">{{
				$t('chatRecord.resumeRecord') }}</el-button>
			<el-button round type="danger" v-show="state == 'RUNNING' || state == 'PAUSE'" @click="onCompleteRecord()">
				{{ $t('chatRecord.endRecord') }}</el-button>
			<el-button round type="success" v-show="state == 'COMPLETE' && mode != 'PLAY'" @click="onPlayAudio()">{{
				$t('chatRecord.playRecord') }}
			</el-button>
			<el-button round type="warning" v-show="state == 'COMPLETE' && mode == 'PLAY'" @click="onStopAudio()">{{
				$t('chatRecord.stopPlay') }}
			</el-button>
			<el-button round type="primary" v-show="state == 'COMPLETE'" @click="onRestartRecord()">{{
				$t('chatRecord.restartRecord') }}</el-button>
			<el-button round type="primary" v-show="state == 'COMPLETE'" @click="onSendRecord()">{{
				$t('chatRecord.sendNow') }}</el-button>
		</el-row>
	</el-dialog>
</template>

<script>
import Recorder from 'js-audio-recorder';

export default {
	name: 'chatRecord',
	props: {
		visible: {
			type: Boolean
		}
	},
	data() {
		return {
			rc: new Recorder(),
			audio: new Audio(),
			state: 'STOP', // STOP、RUNNING、PAUSE、COMPLETE
			stateTip: "",
			mode: 'RECORD', // RECORD 、PLAY
			duration: 0,
			url: ""
		}
	},
	created() {
		this.stateTip = this.$t('chatRecord.notStarted');
	},
	methods: {
		onClose() {
			// 关闭前清除数据
			this.rc.destroy();
			this.rc = new Recorder();
			this.audio.pause();
			this.mode = 'RECORD';
			this.state = 'STOP';
			this.stateTip = this.$t('chatRecord.notStarted');
			this.$emit("close");
		},
		onStartRecord() {
			this.rc.start().then((stream) => {
				this.state = 'RUNNING';
				this.stateTip = this.$t('chatRecord.recording');
			}).catch(error => {
				this.$message.error(error);
			});


		},
		onPauseRecord() {
			this.rc.pause();
			this.state = 'PAUSE';
			this.stateTip = this.$t('chatRecord.paused');
		},
		onResumeRecord() {
			this.rc.resume();
			this.state = 'RUNNING';
			this.stateTip = this.$t('chatRecord.recording');
		},
		onCompleteRecord() {
			this.rc.pause();
			this.state = 'COMPLETE';
			this.stateTip = this.$t('chatRecord.ended');
		},
		onPlayAudio() {
			let wav = this.rc.getWAVBlob();
			let url = URL.createObjectURL(wav);
			this.$refs.audio.src = url;
			this.$refs.audio.play();
			this.mode = 'PLAY';
		},
		onStopAudio() {
			this.$refs.audio.pause();
			this.mode = 'RECORD';
		},
		onRestartRecord() {
			this.rc.destroy();
			this.rc = new Recorder()
			this.rc.start();
			this.state = 'RUNNING';
			this.mode = 'RECORD';
			this.stateTip = this.$t('chatRecord.recording');
		},
		onSendRecord() {
			let wav = this.rc.getWAVBlob();
			let name = new Date().getDate() + '.wav';
			var formData = new window.FormData()
			formData.append('file', wav, name);
			this.$http({
				url: '/file/upload',
				data: formData,
				method: 'post',
				headers: {
					'Content-Type': 'multipart/form-data'
				}
			}).then((url) => {
				let data = {
					duration: parseInt(this.rc.duration),
					url: url
				}
				this.$emit("send", data);
				this.onClose();
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.chat-record {

	.tip {
		font-size: 18px;
	}

	.btn-group {
		margin-bottom: 20px;
	}
}
</style>
