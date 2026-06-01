<template>
	<div class="video-box" :style="imageStyle" @click.prevent.stop>
		<!-- :style="imageStyle"   @error="handleError"-->
		<video ref="videoPlayer" class="send-video" preload="none" :poster="coverUrl" :src="videoUrl"
			@timeupdate="updateProgress" @loadedmetadata="getDuration" />
		<!-- 自定义控制栏 -->
		<div class="controls">
			<div class="h-box" :class="{'bottom':currentTimeText=='00:00'}">
				<div class="flex align-center">
					<div class="hb" @click="togglePlay($event)">
						<img class="video_icon" src="@/assets/image/video_stop.png" alt="" v-if="isPlaying" />
						<img class="video_icon" src="@/assets/image/video_play.png" alt="" v-else />
					</div>
				</div>
				<div class="flex align-center">
					<div class="hb hvs">
						<div class="volume">
							<el-slider v-model="volume" @change="changeVolume" :min="0" :max="100" :step="1"
								:show-tooltip="false" input-size="mini"></el-slider>
						</div>
						<img class="video_icon" src="@/assets/image/video_muted.png" alt="" @click="toggleMute"
							v-if="isMuted" />
						<img class="video_icon" src="@/assets/image/video_volume.png" alt="" @click="toggleMute"
							v-else />
					</div>
					<div class="hb" @click="toggleFullScreen">
						<img class="video_icon" src="@/assets/image/video_screenfull.png" alt="" />
					</div>
					<div class="hb pip">
						<div class="child-menu">
							<div class="item" @click="moreMenuClick('download')">
								<i class="el-icon-download"></i>
								下载
							</div>
							<div class="item" @click="moreMenuClick('pip')" v-if="isPlaying">
								<i class="el-icon-news"></i>
								画中画
							</div>
						</div>
						<img class="video_icon" src="@/assets/image/video_more.png" alt="" />
					</div>
				</div>
			</div>
			<div class="time-box" v-if="isPlaying || currentTimeText!='00:00'">
				<el-slider class="slider" v-model="progressValue" @change="onSliderChange" :show-tooltip="false"
					input-size="mini"></el-slider>
				<div class="time">{{currentTimeText}}<span>/</span>{{durationText}}</div>
			</div>
		</div>
	</div>
</template>

<script>
	// import screenfull from 'screenfull'
	export default {
		name: "myVideo",
		data() {
			return {
				isPlaying: false,
				volume: 100,
				isMuted: false,
				currentTime: '00:00',
				duration: '00:00',
				playbackRate: 1.0,
				isPiPActive: false,
				isFullScreen: false,
				progressValue: 0, // 进度条绑定的百分比数值 (0-100)
				currentTimeText: '00:00', // 格式化后的当前时间
				durationText: '00:00', // 格式化后的总时长
				isDragging: false, // 标记用户是否正在拖拽进度条
			}
		},
		props: {
			imageStyle: {
				type: String,
				default: ''
			},
			coverUrl: {
				type: String,
				default: ''
			},
			videoUrl: {
				type: String,
				default: ''
			},
		},
		mounted() {
			const video = this.$refs.videoPlayer
			// // 监听全屏状态变化（如果使用了 screenfull）
			// if (screenfull.isEnabled) {
			// 	screenfull.on('change', () => {
			// 		this.isFullScreen = screenfull.isFullscreen
			// 	})
			// }
			// 监听画中画状态变化
			video.addEventListener('enterpictureinpicture', () => {
				this.isPiPActive = true
			})
			video.addEventListener('leavepictureinpicture', () => {
				this.isPiPActive = false
			})

		},
		methods: {
			handleError(e) {
				console.log('视频出现错误', e)
			},
			// 1. 播放/暂停
			togglePlay(e) {
				const video = this.$refs.videoPlayer
				if (video.paused) {
					video.play()
					this.isPlaying = true
				} else {
					video.pause()
					this.isPlaying = false
				}
			},
			// 格式化时间 (分:秒)
			formatTime(seconds) {
				if (!seconds) return '00:00'
				const min = Math.floor(seconds / 60)
				const sec = Math.floor(seconds % 60)
				return `${min}:${sec < 10 ? '0' : ''}${sec}`
			},

			// 获取视频总时长
			getDuration() {
				const video = this.$refs.videoPlayer
				this.durationText = this.formatTime(video.duration)
			},

			// 视频播放时实时更新进度条
			updateProgress() {
				// 如果用户正在拖拽进度条，暂停实时更新，防止进度条抽搐
				if (this.isDragging) return

				const video = this.$refs.videoPlayer
				if (video.duration) {
					// 计算百分比并赋值给 el-slider
					this.progressValue = (video.currentTime / video.duration) * 100
					this.currentTimeText = this.formatTime(video.currentTime)
				}
			},

			// 用户拖拽或点击进度条松开后触发
			onSliderChange(val) {
				const video = this.$refs.videoPlayer
				// 根据百分比计算新的播放时间点
				const newTime = (val / 100) * video.duration
				video.currentTime = newTime
				this.isDragging = false // 拖拽结束，恢复实时更新
			},

			// 2. 音量设置
			changeVolume(e) {
				console.log(e)
				const newVolume = e / 100;
				const video = this.$refs.videoPlayer
				video.volume = newVolume
				video.muted = newVolume === 0;
				this.isMuted = video.muted
			},
			toggleMute() {
				const video = this.$refs.videoPlayer
				video.muted = !video.muted
				this.isMuted = video.muted
			},

			moreMenuClick(e) {
				if (e == 'download') {
					this.downloadVideo();
				} else if (e == 'pip') {
					this.togglePiP();
				}
			},

			// 3. 播放速度
			changeSpeed() {
				const video = this.$refs.videoPlayer
				video.playbackRate = this.playbackRate
			},

			// 4. 画中画 (Picture-in-Picture)
			async togglePiP() {
				const video = this.$refs.videoPlayer
				try {
					if (document.pictureInPictureElement) {
						await document.exitPictureInPicture()
					} else {
						await video.requestPictureInPicture()
					}
				} catch (error) {
					console.error('画中画切换失败:', error)
				}
			},

			// 5. 全屏 (使用 screenfull 库处理浏览器兼容性)
			toggleFullScreen() {
				// if (screenfull.isEnabled) {
				// 	// 可以指定让整个 video-container 全屏，也可以只让 video 元素全屏
				// 	screenfull.toggle(this.$refs.videoPlayer)
				// }

				// 1. 获取 video 的 DOM 元素
				const videoElement = this.$refs.videoPlayer

				// 2. 兼容不同浏览器的原生全屏 API
				if (videoElement.requestFullscreen) {
					videoElement.requestFullscreen()
				} else if (videoElement.mozRequestFullScreen) { // Firefox
					videoElement.mozRequestFullScreen()
				} else if (videoElement.webkitRequestFullscreen) { // Chrome, Safari, Opera
					videoElement.webkitRequestFullscreen()
				} else if (videoElement.msRequestFullscreen) { // IE/Edge
					videoElement.msRequestFullscreen()
				}
			},

			// 6. 下载视频 (通过创建 Blob 和临时 a 标签强制下载)
			downloadVideo() {
				// fetch(this.videoUrl)
				// 	.then(res => res.blob())
				// 	.then(blob => {
				// 		const url = window.URL.createObjectURL(blob)
				// 		const a = document.createElement('a')
				// 		a.style.display = 'none'
				// 		a.href = url
				// 		a.download = new Date().getTime()+'.mp4' // 自定义下载文件名
				// 		document.body.appendChild(a)
				// 		a.click()
				// 		// 释放内存
				// 		window.URL.revokeObjectURL(url)
				// 		document.body.removeChild(a)
				// 	})
				// 	.catch(() => {
				// 		alert('下载失败，请检查视频地址是否跨域')
				// 	})

				let videoUrl = this.videoUrl;
				if (videoUrl) {
					const link = document.createElement('a')
					link.href = videoUrl;
					link.target = '_blank'
					link.download = new Date().getTime() + '.mp4' // 设置下载后的文件名
					document.body.appendChild(link)
					link.click()
					document.body.removeChild(link)
				}
			},
		}
	}
</script>

<style scoped lang="scss">
	.video-box {
		position: relative;
	}

	.send-video {
		width: 100%;
		height: 100%;
		object-fit: contain;
		// transition: transform 0.3s ease;
	}

	.flex {
		display: flex;
	}

	.align-center {
		align-items: center;
	}

	.justify-center {
		justify-content: center;
	}

	.justify-space-between {
		justify-content: space-between;
	}

	:deep(.el-slider__bar) {
		background-color: #FFF;
	}

	:deep(.el-slider__button) {
		border: none;
		width: 12px;
		height: 12px;

		&:hover {
			transform: none;
		}
	}

	.controls {
		box-sizing: border-box;
		padding: 0 10px;
		width: 100%;
		/* height: 32px; */
		/* overflow: hidden; */
		position: absolute;
		bottom: 0;
		left: 0;
		z-index: 99;
		background: linear-gradient(180deg, #00000000 0%, #00000066 80%);

		.h-box.bottom {
			margin-bottom: 10px;
		}

		.h-box {
			display: flex;
			align-items: center;
			justify-content: space-between;

			.hb {
				min-width: 30px;
				height: 30px;
				border-radius: 50%;
				cursor: pointer;
				display: flex;
				align-items: center;
				justify-content: center;
				position: relative;

				.video_icon {
					width: 18px;
					height: 18px;
				}

				.volume {
					width: 80px;
					margin-right: 12px;
					display: none;
					transform: all 0.3s;

				}
			}

			.hb:hover {
				background: var(--im-color-primary-light-1);
			}

			.hb.hvs:hover {
				padding: 0 10px;
				border-radius: 20px;

				.volume {
					display: block;
				}
			}

			.hb.pip:hover {
				.child-menu {
					display: block;
				}
			}

			.child-menu {
				width: 80px;
				position: absolute;
				right: 0px;
				bottom: 30px;
				background: #FFF;
				border-radius: 8px;
				font-size: 12px;
				color: #000;
				overflow: hidden;
				display: none;
				transition: all 0.3s ease;

				.item {
					padding: 10px;

					i {
						margin-right: 8px;
					}
				}

				.item:hover {
					background: #F5F5F5;
				}
			}


		}

		.time-box {
			padding: 0 0 0 10px;
			display: flex;
			align-items: center;

			.slider {
				width: 100%;
			}

			.time {
				font-size: 12px;
				color: #FFF;
				margin-left: 10px;

				span {
					margin: 0 1px;
				}
			}
		}

	}
</style>