<template>
	<div class="no-data-tip">
		<img class="image" :src="require('@/assets/image/no_data.png')" />
		<div class="text">{{ displayTip }}</div>
	</div>
</template>

<script>
export default {
	name: "noDataTip",
	props: {
		tip: {
			type: String,
			default: ''
		}
	},
	computed: {
		displayTip() {
			return this.tip || this.$t('common.noData');
		}
	}
}
</script>

<style lang="scss">
.no-data-tip {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;

	.image {
		height: 120px;
	}

	.text {
		text-align: center;
		font-size: var(--im-font-size);
		color: var(--im-text-color-light);
		margin-top: 5px;
	}
}
</style>