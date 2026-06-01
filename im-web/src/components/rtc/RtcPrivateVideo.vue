<template>
	<div>
		<!-- 使用自定义对话框组件 -->
		<non-modal-dialog :visible="showRoom" :title="title" :width="windowSize.width" :height="windowSize.height"
			:taskbar-status="taskbarStatusText" @close="onQuit" @fullscreen-change="onFullScreenChange">

			<!-- 任务栏头像插槽 -->
			<template #taskbar-avatar>
				<head-image :size="40" :name="friend.showNickName" :url="friend.headImage" radius="50%"></head-image>
			</template>

			<!-- 对话框内容 -->
			<div class="rtc-private-video" :class="{ 'is-fullscreen': isFullScreen }">
				<div v-show="isVideo" class="rtc-video-box">
					<div class="rtc-video-friend" v-loading="!isChating" :element-loading-text="$t('rtc.waitingAnswer')"
						element-loading-background="rgba(0, 0, 0, 0.1)">
						<video v-show="showRemoteVideo" ref="remoteVideo" autoplay=""
							:class="{ 'rtc-video-remote-share': isRemoteShareScreen }"></video>
						<div v-show="!showRemoteVideo" class="rtc-avatar-panel">
							<div class="rtc-avatar-bg" :style="avatarBlurBg(friend.headImage, '#3a3a3a')"></div>
							<div class="rtc-avatar-dim"></div>
							<head-image class="rtc-avatar-front" :size="200" :name="friend.showNickName"
								:url="friend.headImage" :isShowUserInfo="false"></head-image>
						</div>
					</div>
					<div class="rtc-video-mine">
						<video v-show="isCamera || isShareScreen" ref="localVideo" autoplay=""
							:class="{ 'rtc-video-local-share': isShareScreen }"></video>
						<div v-show="!isCamera && !isShareScreen" class="rtc-avatar-panel rtc-avatar-panel-mine">
							<div class="rtc-avatar-bg" :style="avatarBlurBg(userInfo.headImageThumb, '#555')"></div>
							<div class="rtc-avatar-dim rtc-avatar-dim-mine"></div>
							<head-image class="rtc-avatar-front" :size="80" :name="userInfo.nickName"
								:url="userInfo.headImageThumb" :isShowUserInfo="false"></head-image>
						</div>
					</div>
				</div>
				<div v-show="!isVideo" class="rtc-voice-box" v-loading="!isChating"
					:element-loading-text="$t('rtc.waitingAnswer')" element-loading-background="rgba(0, 0, 0, 0.1)">
					<head-image class="friend-head-image" :size="200" :name="friend.showNickName"
						:url="friend.headImage" :isShowUserInfo="false">
						<div class="rtc-voice-name">{{ friend.showNickName }}</div>
					</head-image>
				</div>
				<div class="rtc-control-bar">
					<div v-show="isMicroPhone" class="icon iconfont icon-microphone-on icon-front"
						@click="onSwitchMicroPhone" :title="$t('rtc.micOn')"></div>
					<div v-show="!isMicroPhone" class="icon iconfont icon-microphone-off icon-back"
						@click="onSwitchMicroPhone" :title="$t('rtc.micOff')"></div>
					<div v-show="isSpeaker" class="icon iconfont icon-speaker-on icon-front" @click="onSwitchSpeaker"
						:title="$t('rtc.speakerOn')"></div>
					<div v-show="!isSpeaker" class="icon iconfont icon-speaker-off icon-back" @click="onSwitchSpeaker"
						:title="$t('rtc.speakerOff')"></div>
					<div v-show="isVideo && isCamera" class="icon iconfont icon-camera-on icon-front"
						@click="onSwitchCamera" :title="$t('rtc.cameraOn')"></div>
					<div v-show="isVideo && !isCamera" class="icon iconfont icon-camera-off icon-back"
						@click="onSwitchCamera" :title="$t('rtc.cameraOff')"></div>
					<div v-show="isVideo && !isShareScreen" class="icon iconfont icon-share-screen icon-front"
						@click="onSwitchShareScreen" :title="$t('rtc.shareScreen')"></div>
					<div v-show="isVideo && isShareScreen" class="icon iconfont icon-share-screen-cancel icon-back"
						@click="onSwitchShareScreen" :title="$t('rtc.cancelShare')"></div>
					<div :title="$t('rtc.hangup')" class="icon iconfont icon-quit" @click="onQuit()"></div>
				</div>
			</div>
		</non-modal-dialog>
		<rtc-private-acceptor v-if="!isHost && isWaiting" ref="acceptor" :friend="friend" :mode="mode"
			@accept="onAccept" @reject="onReject"></rtc-private-acceptor>
	</div>
</template>

<script>
import HeadImage from '../common/HeadImage.vue';
import RtcPrivateAcceptor from './RtcPrivateAcceptor.vue';
import NonModalDialog from '../common/NonModalDialog.vue';
import ImWebRtc from '@/api/webrtc';
import ImCamera from '@/api/camera';
import RtcPrivateApi from '@/api/rtcPrivateApi'

export default {
	name: 'rtcPrivateVideo',
	components: {
		HeadImage,
		RtcPrivateAcceptor,
		NonModalDialog
	},
	data() {
		return {
			camera: new ImCamera(), // 摄像头和麦克风
			webrtc: new ImWebRtc(), // webrtc相关
			API: new RtcPrivateApi(), // API
			audio: new Audio(), // 呼叫音频
			showRoom: false,
			friend: {},
			isHost: false, // 是否发起人
			state: "CLOSE", // CLOSE:关闭  WAITING:等待呼叫或接听 CHATING:聊天中  ERROR:出现异常
			mode: 'video', // 模式 video:视频聊 voice:语音聊天
			userInfo: {},	// 当前用户信息
			isCamera: false, // 本地摄像头是否开启（仅视频模式）
			isMicroPhone: true, // 是否开启麦克风
			isSpeaker: true, // 是否开启扬声器
			isShareScreen: false, // 是否开启投屏
			isRemoteCamera: true,	// 对方是否开启摄像头
			isRemoteShareScreen: false, // 对方是否开启投屏
			localStream: null, // 本地视频流
			remoteStream: null, // 对方视频流
			videoTime: 0,
			videoTimer: null,
			heartbeatTimer: null,
			candidates: [],
			isFullScreen: false
		}
	},
	methods: {
		onFullScreenChange(isFull) {
			this.isFullScreen = isFull;
		},
		open(rtcInfo) {
			this.showRoom = true;
			this.userStore.setInRtc(true);
			this.mode = rtcInfo.mode;
			this.isHost = rtcInfo.isHost;
			this.friend = rtcInfo.friend;
			this.userInfo = this.userStore.userInfo;
			this.isCamera = this.isVideo;
			this.isRemoteCamera = this.isVideo;
			this.isShareScreen = false;
			this.isRemoteShareScreen = false;
			this.isMicroPhone = true;
			this.isSpeaker = true;
			if (this.isHost) {
				this.onCall();
			}
		},
		initAudio() {
			let url = require(`@/assets/audio/call.wav`);
			this.audio.src = url;
			this.audio.loop = true;
		},
		avatarBlurBg(url, fallback) {
			if (!url) return { background: fallback };
			return { backgroundImage: 'url(' + JSON.stringify(String(url)) + ')' };
		},
		initRtc() {
			this.webrtc.init(this.configuration)
			this.webrtc.setupPeerConnection((stream) => {
				this.$refs.remoteVideo.srcObject = stream;
				this.$refs.remoteVideo.muted = !this.isSpeaker;
				this.remoteStream = stream;
			})
			// 监听候选信息
			this.webrtc.onIcecandidate((candidate) => {
				if (this.state == "CHATING") {
					// 连接已就绪,直接发送
					this.API.sendCandidate(this.friend.id, candidate);
				} else {
					// 连接未就绪,缓存起来，连接后再发送
					this.candidates.push(candidate)
				}
			})
			// 监听连接成功状态
			this.webrtc.onStateChange((state) => {
				if (state == "connected") {
					console.log("webrtc连接成功")
				} else if (state == "disconnected") {
					console.log("webrtc连接断开")
				}
			})
		},
		onCall() {
			if (!this.checkDevEnable()) {
				this.close();
			}
			// 初始化webrtc
			this.initRtc();
			// 启动心跳
			this.startHeartBeat();
			// 打开摄像头
			this.openStream().then(() => {
				this.webrtc.setStream(this.localStream);
				// 发起呼叫
				this.API.setup(this.friend.id, this.mode).then(() => {
					// 进入等待状态
					this.state = "WAITING";
					// 播放呼叫铃声
					this.audio.play();
				}).catch(() => {
					this.close();
				})
			}).catch(() => {
				// 呼叫方必须能打开摄像头，否则无法正常建立连接
				this.close();
			})
		},
		onAccept() {
			if (!this.checkDevEnable()) {
				this.API.failed(this.friend.id, 'devNotSupport')
				this.close();
				return;
			}
			// 进入房间
			this.showRoom = true;
			this.userStore.setInRtc(true);
			// 停止呼叫铃声
			this.audio.pause();
			// 初始化webrtc
			this.initRtc();
			// 打开摄像头
			this.openStream().finally(() => {
				this.webrtc.setStream(this.localStream);
				this.API.accept(this.friend.id);
			})
		},
		onReject() {
			// 退出通话
			this.API.reject(this.friend.id);
			// 退出
			this.close();
		},
		onHandup() {
			this.API.handup(this.friend.id)
			this.$message.success(this.$t('rtc.hungUpCallEnd'))
			this.close();
		},
		onCancel() {
			this.API.cancel(this.friend.id)
			this.$message.success(this.$t('rtc.cancelCallEnd'))
			this.close();
		},
		onSwitchMicroPhone() {
			this.isMicroPhone = !this.isMicroPhone;
			if (this.localStream) {
				this.localStream.getTracks().forEach((track) => {
					if (track.kind === 'audio') {
						track.enabled = this.isMicroPhone;
					}
				})
			}
		},
		onSwitchSpeaker() {
			this.isSpeaker = !this.isSpeaker;
			this.$refs.remoteVideo.muted = !this.isSpeaker;
		},
		bindLocalVideo(stream) {
			this.localStream = stream;
			stream.getTracks().forEach((track) => {
				if (track.kind === 'audio') {
					track.enabled = this.isMicroPhone;
				}
			});
			this.webrtc.switchStream(stream);
			this.$nextTick(() => {
				this.$refs.localVideo.srcObject = stream;
				this.$refs.localVideo.muted = true;
				this.$refs.localVideo.play().catch(() => { });
			});
		},
		onSwitchCamera() {
			this.isCamera = !this.isCamera
			this.localStream.getTracks().forEach((track => {
				if (track.kind === 'video') {
					track.enabled = this.isCamera;
				}
			}))
			this.sendDeviceInfo();
		},
		onSwitchShareScreen() {
			if (this.isShareScreen) {
				this.endShareScreen();
			} else {
				this.startShareScreen();
			}
		},
		startShareScreen() {
			this.camera.openScreen(this.isMicroPhone).then((stream) => {
				this.bindLocalVideo(stream);
				this.isShareScreen = true;
				this.sendDeviceInfo();
			}).catch(() => { });
		},
		endShareScreen() {
			this.isShareScreen = false;
			const open = this.isCamera ? this.camera.openVideo() : this.camera.openAudio();
			open.then((stream) => {
				this.bindLocalVideo(stream);
				this.sendDeviceInfo();
			}).catch(() => { });
		},
		sendDeviceInfo() {
			this.API.device({
				uid: this.friend.id,
				isCamera: this.isCamera,
				isShareScreen: this.isShareScreen,
				isMicroPhone: this.isMicroPhone
			});
		},
		onRTCMessage(msg) {
			// 除了发起通话，如果在关闭状态就无需处理
			if (msg.type != this.$enums.MESSAGE_TYPE.RTC_SETUP_VOICE &&
				msg.type != this.$enums.MESSAGE_TYPE.RTC_SETUP_VIDEO &&
				this.isClose) {
				return;
			}
			// RTC信令处理
			switch (msg.type) {
				case this.$enums.MESSAGE_TYPE.RTC_SETUP_VOICE:
					this.onRTCSetup(msg, 'voice')
					break;
				case this.$enums.MESSAGE_TYPE.RTC_SETUP_VIDEO:
					this.onRTCSetup(msg, 'video')
					break;
				case this.$enums.MESSAGE_TYPE.RTC_ACCEPT:
					this.onRTCAccept(msg)
					break;
				case this.$enums.MESSAGE_TYPE.RTC_REJECT:
					this.onRTCReject(msg)
					break;
				case this.$enums.MESSAGE_TYPE.RTC_CANCEL:
					this.onRTCCancel(msg)
					break;
				case this.$enums.MESSAGE_TYPE.RTC_FAILED:
					this.onRTCFailed(msg)
					break;
				case this.$enums.MESSAGE_TYPE.RTC_HANDUP:
					this.onRTCHandup(msg)
					break;
				case this.$enums.MESSAGE_TYPE.RTC_OFFER:
					this.onRTCOffer(msg)
					break;
				case this.$enums.MESSAGE_TYPE.RTC_ANSWER:
					this.onRTCAnswer(msg)
					break;
				case this.$enums.MESSAGE_TYPE.RTC_CANDIDATE:
					this.onRTCCandidate(msg)
					break;
				case this.$enums.MESSAGE_TYPE.RTC_PRIVATE_DEVICE:
					this.onRTCPrivateDevice(msg)
					break;
			}
		},
		onRTCSetup(msg, mode) {
			this.isHost = false;
			this.mode = mode;
			this.isCamera = this.isVideo;
			this.isRemoteCamera = this.isVideo;
			this.isRemoteShareScreen = false;
			this.$http({
				url: `/friend/find/${msg.sendId}`,
				method: 'get'
			}).then((friend) => {
				this.friend = friend;
				this.state = "WAITING";
				this.audio.play();
				this.startHeartBeat();
			})
		},
		onRTCAccept(msg) {
			if (msg.selfSend) {
				this.$message.success(this.$t('rtc.acceptedOnOtherDevice'));
				this.close();
			} else {
				// 对方接受了的通话
				this.webrtc.createOffer().then((offer) => {
					// 停止播放语音
					this.audio.pause();
					// 推送offer给对方
					this.API.offer(this.friend.id, offer);
				})
			}
		},
		onRTCReject(msg) {
			if (msg.selfSend) {
				this.$message.success(this.$t('rtc.rejectedOnOtherDevice'));
				this.close();
			} else {
				this.$message.error(this.$t('rtc.rejectedByPeer'));
				this.close();
			}
		},
		onRTCFailed(msg) {
			if (msg.selfSend) {
				this.$message.error(this.$t('rtc.notAnswered'))
				this.close();
			} else {
				this.$message.error(this.$t('rtc.private.' + msg.content))
				this.close();
			}

		},
		onRTCCancel() {
			this.$message.success(this.$t('rtc.callCancelledByPeer'));
			this.close();
		},
		onRTCHandup() {
			this.$message.success(this.$t('rtc.peerHangup'));
			this.close();
		},
		onRTCOffer(msg) {
			const offer = JSON.parse(msg.content);
			console.log(offer)
			this.webrtc.createAnswer(offer).then((answer) => {
				// 推送answer给对方
				this.API.answer(this.friend.id, answer);
			})
			// 状态为聊天中
			this.state = 'CHATING';
			// 记录时长
			this.startChatTime();
		},
		onRTCAnswer(msg) {
			const answer = JSON.parse(msg.content);
			this.webrtc.setRemoteDescription(answer);
			// 发送candidate
			this.candidates.forEach((candidate) => {
				this.API.sendCandidate(this.friend.id, candidate);
			})
			// 状态为聊天中
			this.state = 'CHATING';
			// 记录时长
			this.startChatTime();
		},
		onRTCCandidate(msg) {
			let candidate = JSON.parse(msg.content);
			this.webrtc.addIceCandidate(candidate);
		},

		onRTCPrivateDevice(msg) {
			const dev = JSON.parse(msg.content);
			this.isRemoteCamera = dev.isCamera;
			this.isRemoteShareScreen = dev.isShareScreen;
		},
		openStream() {
			return new Promise((resolve, reject) => {
				if (this.isVideo) {
					// 打开摄像头+麦克风
					this.camera.openVideo().then((stream) => {
						this.localStream = stream;
						this.isCamera = true;
						this.$nextTick(() => {
							this.$refs.localVideo.srcObject = stream;
							this.$refs.localVideo.muted = true;
						})
						resolve(stream);
					}).catch((e) => {
						this.$message.error(this.$t('rtc.openCameraFailed'))
						console.log("本摄像头打开失败:" + e.message)
						reject(e);
					})
				} else {
					// 打开麦克风
					this.camera.openAudio().then((stream) => {
						this.localStream = stream;
						this.isCamera = false;
						this.$nextTick(() => {
							this.$refs.localVideo.srcObject = stream;
							this.$refs.localVideo.muted = true;
						})
						resolve(stream);
					}).catch((e) => {
						this.$message.error(this.$t('rtc.openMicFailed'))
						console.log("打开麦克风失败:" + e.message)
						reject(e);
					})
				}
			})
		},
		startChatTime() {
			this.videoTime = 0;
			this.videoTimer && clearInterval(this.videoTimer);
			this.videoTimer = setInterval(() => {
				this.videoTime++;
			}, 1000)
		},
		checkDevEnable() {
			if (!this.camera.isEnable()) {
				this.$message.error(this.$t('rtc.cameraAccessFailed'));
				return false;
			}
			if (!this.webrtc.isEnable()) {
				this.$message.error(this.$t('rtc.rtcInitFailed'));
				return false;
			}
			return true;
		},
		startHeartBeat() {
			// 每15s推送一次心跳
			this.heartbeatTimer && clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = setInterval(() => {
				this.API.heartbeat(this.friend.id);
			}, 15000)
		},
		close() {
			this.isFullScreen = false;
			this.showRoom = false;
			this.userStore.setInRtc(false)
			this.camera.close();
			this.webrtc.close();
			this.audio.pause();
			this.videoTime = 0;
			this.videoTimer && clearInterval(this.videoTimer);
			this.heartbeatTimer && clearInterval(this.heartbeatTimer);
			this.videoTimer = null;
			this.heartbeatTimer = null;
			this.state = 'CLOSE';
			this.candidates = [];
		},
		onQuit() {
			if (this.isChating) {
				this.onHandup()
			} else if (this.isWaiting) {
				this.onCancel();
			} else {
				this.close();
			}
		}
	},
	computed: {
		title() {
			let strTitle = `${this.modeText}-${this.friend.showNickName}`;
			if (this.isChating) {
				strTitle += `(${this.currentTime})`;
			} else if (this.isWaiting) {
				strTitle += `(${this.$t('rtc.calling')})`;
			}
			return strTitle;
		},
		currentTime() {
			let min = Math.floor(this.videoTime / 60);
			let sec = this.videoTime % 60;
			let strTime = min < 10 ? "0" : "";
			strTime += min;
			strTime += ":"
			strTime += sec < 10 ? "0" : "";
			strTime += sec;
			return strTime;
		},
		configuration() {
			const iceServers = this.configStore.webrtc.iceServers;
			return {
				iceServers: iceServers
			}
		},
		isVideo() {
			return this.mode == "video"
		},
		modeText() {
			return this.isVideo ? this.$t('rtc.videoCall') : this.$t('rtc.voiceCall');
		},
		isChating() {
			return this.state == "CHATING";
		},
		isWaiting() {
			return this.state == "WAITING";
		},
		isClose() {
			return this.state == "CLOSE";
		},
		showRemoteVideo() {
			return this.isRemoteShareScreen || this.isRemoteCamera;
		},
		taskbarStatusText() {
			if (this.isChating) {
				return this.$t('rtc.inCall');
			} else if (this.isWaiting) {
				return this.$t('rtc.calling');
			} else {
				return '';
			}
		},
		windowSize() {
			return {
				width: this.isVideo ? 660 : 460,
				height: this.isVideo ? 700 : 500
			}
		}

	},
	mounted() {
		// 初始化音频文件
		this.initAudio();
	},
	created() {
		// 监听页面刷新事件
		window.addEventListener('beforeunload', () => {
			this.onQuit();
		});
	},
	beforeUnmount() {
		this.onQuit();
	}
}
</script>

<style lang="scss">
.rtc-private-video {
	position: relative;
	height: 100%;
	box-sizing: border-box;

	&.is-fullscreen {
		display: flex;
		flex-direction: column;
		min-height: 0;

		.rtc-video-box {
			flex: 1;
			min-height: 0;
			display: flex;
			flex-direction: column;

			.rtc-video-friend {
				flex: 1;
				min-height: 0;
				height: auto;

				video {
					object-fit: contain;
				}
			}
		}

		.rtc-voice-box {
			flex: 1;
			min-height: 0;
			height: auto;
		}

		.rtc-control-bar {
			flex-shrink: 0;
		}
	}

	.el-loading-text {
		color: white !important;
		font-size: 16px !important;
	}

	.path {
		stroke: white !important;
	}

	.rtc-video-box {
		position: relative;
		background: #333;

		.rtc-video-friend {
			height: 590px;
			z-index: 99999;

			.rtc-avatar-panel {
				position: absolute;
				inset: 0;
				display: flex;
				align-items: center;
				justify-content: center;
				overflow: hidden;
			}

			.rtc-avatar-bg {
				position: absolute;
				inset: 0;
				background-size: cover;
				background-position: center;
				filter: blur(24px);
				transform: scale(1.1);
			}

			.rtc-avatar-dim {
				position: absolute;
				inset: 0;
				background: rgba(0, 0, 0, 0.4);
			}

			.rtc-avatar-front {
				position: relative;
				z-index: 1;
			}

			video {
				width: 100%;
				height: 100%;
				object-fit: cover;
				background: #000;

				&.rtc-video-remote-share {
					object-fit: contain;
				}
			}
		}

		.rtc-video-mine {
			position: absolute;
			z-index: 99999;
			right: 1px;
			bottom: 1px;
			width: 200px;
			height: 150px;
			border-radius: 4px;
			overflow: hidden;
			border: var(--im-border);
			box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);

			video {
				position: absolute;
				inset: 0;
				width: 100%;
				height: 100%;
				object-fit: cover;
				transform: rotateY(180deg);

				&.rtc-video-local-share {
					transform: none;
					object-fit: contain;
					background: #000;
				}
			}

			.rtc-avatar-panel-mine {
				position: absolute;
				inset: 0;
				display: flex;
				align-items: center;
				justify-content: center;
				overflow: hidden;
			}

			.rtc-avatar-panel-mine .rtc-avatar-bg,
			.rtc-avatar-panel-mine .rtc-avatar-dim {
				position: absolute;
				inset: 0;
			}

			.rtc-avatar-panel-mine .rtc-avatar-bg {
				background-size: cover;
				background-position: center;
				filter: blur(24px);
				transform: scale(1.1);
			}

			.rtc-avatar-panel-mine .rtc-avatar-dim-mine {
				background: rgba(0, 0, 0, 0.35);
			}

			.rtc-avatar-panel-mine .rtc-avatar-front {
				flex-shrink: 0;
			}
		}
	}

	.rtc-voice-box {
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 390px;
		background-color: var(--im-color-primary-light-9);

		.rtc-voice-name {
			text-align: center;
			font-size: 20px;
			font-weight: 600;
		}
	}

	.rtc-control-bar {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 68px;
		background-color: var(--im-background-active);
		border-top: 1px solid #d9d9d9;
		gap: 22px;

		.icon {
			border-radius: 50%;
			padding: 10px;
			font-size: 22px;
			cursor: pointer;
			transition: all 0.3s ease;

			&:hover {
				transform: scale(1.1) translateY(-2px);
			}
		}

		.icon-front {
			color: #4E5461;
			background-color: white;
		}

		.icon-back {
			color: white;
			background-color: #4E5461;
		}

		.icon-quit {
			color: white;
			background-color: #E14949;
		}
	}
}
</style>
