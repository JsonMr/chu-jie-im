<template>
	<div class="seamless-box">
		<div class="seamless-container">
			<div class="icon">
				<i class="el-icon-warning-outline"></i>
			</div>
			<vue-seamless-scroll :data="data" :class-option="classOption" class="seamless-warp">
				<div class="list-box">
					<span class="item-box" v-for="(item, index) in data" :key="index">{{ item }}</span>
				</div>
			</vue-seamless-scroll>
			<div class="icon">
				<i class="el-icon-close" style="cursor: pointer;" @click="hClose"></i>
			</div>
		</div>
	</div>

</template>

<script>
	import VueSeamlessScroll from 'vue-seamless-scroll'
	export default {
		name: 'SeamlessScroll',
		components: {
			VueSeamlessScroll
		},
		props: {
			data: {
				type: Array,
				default: () => []
			}, // 传入的原始数据
		},
		data() {
			return {
				classOption: {
					step: 0.5,
					limitMoveNum: 2,
					hoverStop: false,
					direction: 2,
					openWatch: true,
					singleHeight: 0,
					waitTime: 1000
				}
			}
		},
		mounted() {},
		methods: {
			hClose() {
				this.$emit('handleClose',false)
			}
		}
	}
</script>

<style scoped lang="scss">
	.seamless-box {
		width: 20%;
		position: fixed;
		top: 10px;
		left: 50%;
		z-index: 999;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.seamless-container {
		width: 100%;
		display: flex;
		align-items: center;
		background: var(--im-color-warning-light-9);
		border-radius: 4px;
		padding: 8px 0;
		box-sizing: border-box;

		.icon {
			padding: 0 10px;
			color: var(--im-color-warning);
		}

		.seamless-warp {
			width: calc(100% - 32px);
			// box-sizing: border-box;
			overflow: hidden;

			.list-box {
				display: flex;
				white-space: nowrap;

				.item-box {
					color: var(--im-color-warning);
					font-size: var(--im-font-size-small);
					margin-right: 20px;
				}

				.item-box+.item-box {
					// margin-left: 20px;
				}
			}
		}
	}
</style>