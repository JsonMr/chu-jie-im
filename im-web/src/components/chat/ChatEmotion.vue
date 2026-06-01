<template>
	<div v-show="show" @click="close()">
		<div class="chat-emotion" :style="{ 'left': x + 'px', 'top': y + 'px' }" @click.stop>
			<el-scrollbar class="emotion-scroll">
				<div class="emotion-section">
					<template v-if="isSearchTab">
						<div class="search-box">
							<el-input ref="searchInput" size="small" v-model.trim="searchText"
								:placeholder="$t('emotion.searchPlaceholder')" clearable @input="onSearchInput"
								@clear="onSearchClear">
								<template #suffix>
									<i class="el-icon-search"></i>
								</template>
							</el-input>
						</div>
						<div class="sticker-items" v-if="searchName && searchResults.length">
							<div class="sticker-item" v-for="sticker in searchResults" :key="`search-${sticker.id}`"
								@click="onClickSticker(sticker)" @mouseenter="onPreviewSticker(sticker, $event)"
								@mouseleave="hidePreview">
								<img :src="sticker.thumbUrl || sticker.imageUrl" :alt="sticker.name">
								<div class="sticker-name" :title="sticker.name">{{ sticker.name }}</div>
							</div>
						</div>
						<div class="sticker-empty" v-else-if="searchLoading">{{ $t('emotion.searching') }}</div>
						<div class="sticker-empty" v-else-if="searchName">{{ $t('emotion.noSearchResult') }}</div>
						<div class="sticker-empty" v-else>{{ $t('emotion.searchHint') }}</div>
					</template>
					<template v-else-if="isDefaultTab">
						<div class="emotion-items">
							<div class="emotion-item" v-for="(emoText, i) in defaultEmotions" :key="`default-${i}`"
								@click="onClickEmo(emoText)">
								<img :src="emojiUrl(emoText)" :alt="emoText" class="emoji-large">
							</div>
						</div>
					</template>
					<template v-else-if="isCustomTab">
						<div class="sticker-items">
							<div class="sticker-item upload-item" @click.stop>
								<file-upload :action="'/image/upload?thumbSize=20'" :maxSize="5 * 1024 * 1024"
									:fileTypes="['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif']"
									:isPermanent="true" :showLoading="true" @success="onUploadSuccess">
									<div class="upload-btn">
										<i class="el-icon-plus"></i>
									</div>
								</file-upload>
							</div>
							<div class="sticker-item" v-for="sticker in stickerList" :key="sticker.id"
								@click="onClickCustomSticker(sticker)"
								@contextmenu.prevent="onCustomStickerContextMenu(sticker, $event)"
								@mouseenter="onPreviewSticker(sticker, $event)" @mouseleave="hidePreview">
								<img :src="sticker.thumbUrl || sticker.imageUrl" :alt="sticker.name">
							</div>
						</div>
						<div class="sticker-empty" v-if="!stickerList.length && !loadingCustomStickers">{{
							$t('emotion.noCustomSticker') }}
						</div>
						<div class="sticker-empty" v-if="loadingCustomStickers">{{ $t('emotion.loading') }}</div>
					</template>
					<template v-else>
						<div class="sticker-items" v-if="stickerList.length">
							<div class="sticker-item" v-for="sticker in stickerList" :key="sticker.id"
								@click="onClickSticker(sticker)" @mouseenter="onPreviewSticker(sticker, $event)"
								@mouseleave="hidePreview">
								<img :src="sticker.thumbUrl || sticker.imageUrl" :alt="sticker.name">
								<div class="sticker-name" :title="sticker.name">{{ sticker.name }}</div>
							</div>
						</div>
						<div class="sticker-empty" v-else-if="!loadingStickers">{{ $t('emotion.noSticker') }}</div>
						<div class="sticker-empty" v-else>{{ $t('emotion.loading') }}</div>
					</template>
				</div>
			</el-scrollbar>
			<div class="album-bar-wrapper" v-if="albumBarItems.length">
				<button v-if="isNeedPage" class="album-arrow prev" type="button" @click.stop="prevAlbumPage"
					:disabled="!canPrev">
					<i class="el-icon-arrow-left"></i>
				</button>
				<div class="album-bar">
					<div class="album-item" v-for="item in displayAlbumItems" :key="item.id"
						:class="{ active: item.id === selectedAlbumId }" @click.stop="onSelectAlbum(item)"
						:title="item.name">
						<span v-if="item.isSearch" class="album-item-icon">
							<i class="icon iconfont icon-search"></i>
						</span>
						<span v-else-if="item.isDefault" class="album-item-icon">
							<i class="icon iconfont icon-emoji"></i>
						</span>
						<img v-else :src="item.logoUrl" :alt="item.name">
					</div>
				</div>
				<button v-if="isNeedPage" class="album-arrow next" type="button" @click.stop="nextAlbumPage"
					:disabled="!canNext">
					<i class="el-icon-arrow-right"></i>
				</button>
			</div>
			<div class="preview-box" v-if="preview.visible" :style="preview.style">
				<img :src="preview.url" alt="preview">
			</div>
		</div>
		<right-menu ref="rightMenu" @select="onSelectCustomMenu"></right-menu>
	</div>
</template>

<script>
import RightMenu from '../common/RightMenu.vue';
import FileUpload from '../common/FileUpload.vue';

export default {
	components: {
		RightMenu,
		FileUpload
	},
	name: "emotion",
	data() {
		return {
			show: false,
			pos: {
				x: 0,
				y: 0
			},
			albumList: [],
			selectedAlbumId: 'default',
			albumPage: 0,
			albumsPerPage: 7,
			stickerList: [],
			stickerCache: {},
			loadingAlbums: false,
			loadingStickers: false,
			preview: {
				visible: false,
				url: '',
				style: {
					left: '0px',
					top: '0px'
				}
			},
			searchText: '',
			searchResults: [],
			searchLoading: false,
			searchTimer: null,
			latestSearchName: '',
			searchCache: {},
			customStickerList: [],
			customStickerCache: null,
			loadingCustomStickers: false,
			selectedCustomSticker: null
		}
	},
	created() {
		this.loadAlbums();
	},
	beforeDestroy() {
		this.clearSearchTimer();
	},
	methods: {
		onClickEmo(emoText) {
			let emotion = `#${emoText};`
			this.$emit('emotion', emotion)
			this.close();
		},
		onClickCustomSticker(custom) {
			const sticker = {
				id: custom.stickerId,
				albumId: custom.albumId,
				name: custom.name,
				imageUrl: custom.imageUrl,
				thumbUrl: custom.thumbUrl,
				width: custom.width,
				height: custom.height
			}
			this.onClickSticker(sticker);
		},
		onClickSticker(sticker) {
			this.$emit('emotion', { type: 'sticker', data: sticker });
			this.close();
		},
		open(pos) {
			this.pos = pos;
			this.show = true;
		},
		close() {
			this.show = false;
		},
		loadAlbums() {
			this.loadingAlbums = true;
			this.fetchStickerAlbums().then((albums = []) => {
				this.albumList = albums;
			}).finally(() => {
				this.loadingAlbums = false;
			});
		},
		onSelectAlbum(album) {
			if (album.isSearch) {
				this.selectedAlbumId = 'search';
				this.$nextTick(() => {
					if (this.$refs.searchInput && this.$refs.searchInput.focus) {
						this.$refs.searchInput.focus();
					}
					if (this.searchName) {
						this.debounceSearch(this.searchName);
					}
				});
			}
			else if (album.isDefault) {
				this.selectDefault();
			} else if (album.isCustom) {
				this.selectedAlbumId = 'custom';
				this.loadCustomStickers();
			} else {
				this.selectedAlbumId = album.id;
				this.loadStickers(album.id);
			}

		},
		selectDefault() {
			this.selectedAlbumId = 'default';
			this.stickerList = [];
		},
		prevAlbumPage() {
			if (this.canPrev) {
				this.albumPage -= 1;
			}
		},
		nextAlbumPage() {
			if (this.canNext) {
				this.albumPage += 1;
			}
		},
		loadStickers(albumId) {
			if (this.stickerCache[albumId]) {
				this.stickerList = this.stickerCache[albumId];
				return;
			}
			this.loadingStickers = true;
			this.fetchStickersByAlbum(albumId).then((stickers = []) => {
				this.stickerCache[albumId] = stickers;
				if (this.selectedAlbumId === albumId) {
					this.stickerList = stickers;
				}
			}).finally(() => {
				this.loadingStickers = false;
			});
		},
		onSearchInput() {
			const name = this.searchName;
			if (!name) {
				this.clearSearchResults();
				return;
			}
			this.debounceSearch(name);
		},
		onSearchClear() {
			this.searchText = '';
			this.clearSearchResults();
			this.$nextTick(() => {
				if (this.$refs.searchInput && this.$refs.searchInput.focus) {
					this.$refs.searchInput.focus();
				}
			});
		},
		debounceSearch(name) {
			this.clearSearchTimer();
			this.searchTimer = setTimeout(() => {
				this.performSearch(name);
			}, 300);
		},
		clearSearchTimer() {
			if (this.searchTimer) {
				clearTimeout(this.searchTimer);
				this.searchTimer = null;
			}
		},
		performSearch(name) {
			if (this.searchCache[name]) {
				this.searchResults = this.searchCache[name];
				this.searchLoading = false;
				return;
			}
			this.searchLoading = true;
			this.searchResults = [];
			this.latestSearchName = name;
			this.searchStickers(name).then(stickers => {
				if (this.latestSearchName !== name) {
					return;
				}
				this.searchCache[name] = stickers;
				this.searchResults = stickers;
			}).catch(() => {
				if (this.latestSearchName !== name) {
					return;
				}
				this.searchResults = [];
			}).finally(() => {
				if (this.latestSearchName === name) {
					this.searchLoading = false;
				}
			});
		},
		clearSearchResults() {
			this.clearSearchTimer();
			this.searchResults = [];
			this.searchLoading = false;
			this.latestSearchName = '';
		},
		onPreviewSticker(sticker, event) {
			const url = sticker.imageUrl || sticker.thumbUrl;
			this.showPreview(url, event);
		},
		showPreview(url, event) {
			const container = event.currentTarget.closest('.chat-emotion');
			const containerRect = container.getBoundingClientRect();
			const targetRect = event.currentTarget.getBoundingClientRect();
			let left = targetRect.right - containerRect.left + 10;
			let top = targetRect.top - containerRect.top - 10;
			if (left + 120 > containerRect.width) {
				left = targetRect.left - containerRect.left - 120 - 10;
			}
			if (top + 120 > containerRect.height) {
				top = containerRect.height - 130;
			}
			if (top < 0) {
				top = 0;
			}
			this.preview = {
				visible: true,
				url,
				style: {
					left: `${left}px`,
					top: `${top}px`
				}
			};
		},
		hidePreview() {
			this.preview.visible = false;
		},
		emojiUrl(emoText) {
			return this.$emo.textToUrl(`#${emoText};`);
		},
		fetchStickerAlbums() {
			return this.$http({
				url: '/sticker/albums',
				method: 'get'
			});
		},
		fetchStickersByAlbum(albumId) {
			return this.$http({
				url: `/sticker/stickers/${albumId}`,
				method: 'get'
			});
		},
		searchStickers(name) {
			return this.$http({
				url: '/sticker/stickers/search',
				method: 'get',
				params: {
					name
				}
			});
		},
		loadCustomStickers() {
			if (this.customStickerCache) {
				this.stickerList = this.customStickerCache;
				return;
			}
			this.loadingCustomStickers = true;
			this.fetchCustomStickers().then((stickers = []) => {
				this.customStickerCache = stickers;
				if (this.selectedAlbumId === 'custom') {
					this.stickerList = stickers;
				}
			}).finally(() => {
				this.loadingCustomStickers = false;
			});
		},
		refreshCustomStickers() {
			// 清除缓存并重新加载自定义表情
			this.customStickerCache = null;
			if (this.selectedAlbumId === 'custom') {
				this.loadCustomStickers();
			}
		},
		fetchCustomStickers() {
			return this.$http({
				url: '/sticker/custom/list',
				method: 'get'
			});
		},
		onCustomStickerContextMenu(sticker, event) {
			if (this.selectedAlbumId !== 'custom') {
				return;
			}
			this.selectedCustomSticker = sticker;
			const menuItems = [
				{
					key: 'TOP',
					name: this.$t('chat.top')
				},
				{
					key: 'DELETE',
					name: this.$t('common.delete'),
					danger: true
				}
			];
			this.$refs.rightMenu.open({
				x: event.clientX,
				y: event.clientY
			}, menuItems);
		},
		onSelectCustomMenu(item) {
			if (!this.selectedCustomSticker) {
				return;
			}
			const sticker = this.selectedCustomSticker;
			switch (item.key) {
				case 'TOP':
					this.setCustomStickerTop(sticker.id);
					break;
				case 'DELETE':
					this.deleteCustomSticker(sticker.id);
					break;
			}
		},
		setCustomStickerTop(id) {
			this.$http({
				url: `/sticker/custom/top/${id}`,
				method: 'put'
			}).then(() => {
				this.$message.success(this.$t('emotion.topSuccess'));
				this.customStickerCache = null;
				this.loadCustomStickers();
			}).catch(() => {
				this.$message.error(this.$t('emotion.topFail'));
			});
		},
		deleteCustomSticker(id) {
			this.$confirm(this.$t('emotion.deleteStickerConfirm'), this.$t('emotion.deleteStickerTitle'), {
				confirmButtonText: this.$t('common.ok'),
				cancelButtonText: this.$t('common.cancel'),
				type: 'warning'
			}).then(() => {
				return this.$http({
					url: `/sticker/custom/delete/${id}`,
					method: 'delete'
				});
			}).then(() => {
				this.$message.success(this.$t('emotion.deleteSuccess'));
				this.customStickerCache = null;
				this.loadCustomStickers();
			})
		},
		addCustomSticker(sticker) {
			return this.$http({
				url: '/sticker/custom/add',
				method: 'post',
				data: sticker
			});
		},
		onUploadSuccess(imageData) {
			const sticker = {
				name: '',
				imageUrl: imageData.originUrl,
				thumbUrl: imageData.thumbUrl,
				width: imageData.width || 0,
				height: imageData.height || 0
			};
			this.addCustomSticker(sticker).then(() => {
				this.$message.success(this.$t('emotion.addSuccess'));
				this.customStickerCache = null;
				this.loadCustomStickers();
			})
		}
	},
	computed: {
		x() {
			return this.pos.x - 22;
		},
		y() {
			return this.pos.y - 294;
		},
		isSearchTab() {
			return this.selectedAlbumId === 'search';
		},
		searchName() {
			return (this.searchText || '').trim();
		},
		defaultEmotions() {
			return this.$emo.emoTextList || [];
		},
		isDefaultTab() {
			return this.selectedAlbumId === 'default';
		},
		isCustomTab() {
			return this.selectedAlbumId === 'custom';
		},
		albumBarItems() {
			const searchItem = [{ id: 'search', name: this.$t('emotion.searchEmoji'), isSearch: true }];
			const defaultItem = [{ id: 'default', name: this.$t('emotion.defaultEmoji'), isDefault: true }];
			const customItem = [{
				id: 'custom',
				name: this.$t('emotion.myEmoji'),
				isCustom: true,
				logoUrl: require('@/assets/image/fav.png')
			}];
			return searchItem.concat(defaultItem, customItem, this.albumList || []);
		},
		displayAlbumItems() {
			if (!this.isNeedPage) {
				return this.albumBarItems;
			}
			const start = this.albumPage * this.albumsPerPage;
			return this.albumBarItems.slice(start, start + this.albumsPerPage);
		},
		totalAlbumPages() {
			const total = this.albumBarItems.length;
			return total > 0 ? Math.ceil(total / this.albumsPerPage) : 1;
		},
		canPrev() {
			return this.albumPage > 0;
		},
		canNext() {
			return this.albumPage < this.totalAlbumPages - 1;
		},
		isNeedPage() {
			return this.albumBarItems.length > this.albumsPerPage + 1;
		}
	}
}
</script>
<style scoped lang="scss">
.chat-emotion {
	position: fixed;
	width: 425px;
	box-sizing: border-box;
	padding: 5px;
	background-color: #fff;
	box-shadow: var(--im-box-shadow-lighter);
	border-radius: 6px;
	display: flex;
	flex-direction: column;

	.emotion-scroll {
		height: 220px;
	}

	.emotion-section {
		padding-bottom: 8px;
	}

	.emotion-items {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;

		.emotion-item {
			text-align: center;
			cursor: pointer;
			padding: 2px;
		}
	}

	.sticker-items {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		grid-gap: 6px;
		margin-top: 6px;

		.sticker-item {
			width: 56px;
			height: 72px;
			border-radius: 6px;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			transition: transform 0.2s;
			padding: 4px 4px 6px;

			img {
				width: 48px;
				height: 48px;
			}

			.sticker-name {
				margin-top: 4px;
				font-size: var(--im-font-size-smaller);
				color: var(--im-text-color-light);
				text-align: center;
				width: 100%;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			&:hover {
				transform: scale(1.05);
				background: var(--im-background-active-dark);
			}

			&.upload-item {
				background: var(--im-background-light);

				.upload-btn {
					width: 48px;
					height: 48px;
					display: flex;
					align-items: center;
					justify-content: center;
					border-radius: 8px;
					background: var(--im-background-active-dark);
					border: var(--im-border);

					i {
						font-size: 24px;
						color: var(--im-text-color-light);
					}

				}
			}
		}
	}

	.sticker-empty {
		text-align: center;
		color: var(--im-text-color-light);
		font-size: var(--im-font-size-smaller);
		padding: 12px 0;
	}

	.search-box {
		margin-bottom: 8px;
	}

	.search-box :deep(.el-input__inner) {
		height: 30px;
	}

	.album-bar-wrapper {
		display: flex;
		align-items: center;
		margin-top: 6px;
		padding-top: 10px;
		padding-bottom: 5px;
		border-top: var(--im-border);
		gap: 10px;

		.album-arrow {
			width: 28px;
			height: 28px;
			border-radius: 50%;
			border: 1px solid #dcdfe6;
			background: #fff;
			display: flex;
			align-items: center;
			justify-content: center;
			color: var(--im-text-color-light);
			cursor: pointer;
			transition: all 0.2s;

			i {
				font-size: 16px;
			}

			&:hover {
				color: var(--im-color-primary);
				border-color: var(--im-color-primary);
			}

			&:disabled {
				opacity: 0.4;
				cursor: not-allowed;
			}
		}

		.album-bar {
			flex: 1;
			display: flex;
			flex-wrap: nowrap;
			gap: 18px;
			cursor: pointer;

			.album-item {
				flex: 0 0 auto;
				display: flex;
				align-items: center;
				justify-content: center;
				width: 32px;
				height: 32px;
				border-radius: 50%;
				cursor: pointer;
				font-size: 0;
				transition: all 0.2s;

				img {
					width: 26px;
					height: 26px;
					border-radius: 50%;
					object-fit: cover;
				}

				.album-item-icon {
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 0;
					line-height: 1;
					width: 24px;
					height: 24px;

					i {
						font-size: 24px;
					}
				}

				&.active {
					background: #e8f3ff;
					box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
				}

				&:hover {
					background: #e0e7ff;
				}
			}
		}
	}

	.preview-box {
		position: absolute;
		width: 120px;
		height: 120px;
		padding: 6px;
		background: rgba(0, 0, 0, 0.75);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);

		img {
			max-width: 100%;
			max-height: 100%;
		}
	}
}
</style>
