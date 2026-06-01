<template>
	<div class="chat-input-area">
		<div class="input-placeholder" v-show="isEmpty">{{ $t('chat.inputPlaceholder') }}</div>
		<div :class="['edit-container', isEmpty ? '' : 'not-empty']" contenteditable="true" @paste.prevent="onPaste"
			@keydown="onKeydown" @compositionstart="compositionFlag = true" @compositionend="onCompositionEnd"
			@input="onEditorInput" @mousedown="onMousedown" ref="content" @keyup="onKeyup" @click="onClickInput">
		</div>
		<chat-at-box @select="onAtSelect" :search-text="atSearchText" ref="atBox" :group="group"
			:members="groupMembers"></chat-at-box>

		<!-- 右键菜单 -->
		<div v-show="showContextMenu" class="context-menu" :style="{ top: menuTop + 'px', left: menuLeft + 'px' }"
			@click.stop>
			<ul>
				<li @click="execCommand('copy')">
					<i class="el-icon-document-copy"></i> {{ $t('chat.copy') }}
				</li>
				<li @click="execCommand('cut')">
					<i class="el-icon-scissors"></i> {{ $t('chat.cut') }}
				</li>
				<li @click="execCommand('paste')">
					<i class="el-icon-document-checked"></i> {{ $t('chat.paste') }}
				</li>
			</ul>
		</div>
	</div>
</template>

<script>
	import ChatAtBox from "./ChatAtBox";

	export default {
		name: "ChatInput",
		components: {
			ChatAtBox
		},
		props: {
			group: {
				type: Object
			},
			groupMembers: {
				type: Array
			},
		},
		data() {
			return {
				draftMap: new Map(),
				imageList: [],
				fileList: [],
				currentId: 0,
				atSearchText: null,
				compositionFlag: false,
				atIng: false,
				isEmpty: true,
				blurRange: null,

				// 【新增】右键菜单相关状态
				showContextMenu: false,
				menuTop: 0,
				menuLeft: 0,
				cachedRange: null, // 缓存右键点击时的光标范围

				// 【新增】运行环境标识
				isElectron: false,
			}
		},
		methods: {
			// 将粘贴文本中的表情编码 #xxx; 转为表情图片插入
			insertPastedTextWithEmoji(range, txt) {
				const emojiPattern = /\#[\u4E00-\u9FA5]{1,3}\;/g;
				const parts = [];
				let lastIndex = 0;
				let match;
				while ((match = emojiPattern.exec(txt)) !== null) {
					if (match.index > lastIndex) {
						parts.push({
							type: 'text',
							content: txt.substring(lastIndex, match.index)
						});
					}
					const code = match[0];
					const word = code.replace(/#|;/gi, '');
					if (this.$emo.emoTextList.indexOf(word) !== -1) {
						parts.push({
							type: 'emoji',
							code
						});
					} else {
						parts.push({
							type: 'text',
							content: code
						});
					}
					lastIndex = match.index + code.length;
				}
				if (lastIndex < txt.length) {
					parts.push({
						type: 'text',
						content: txt.substring(lastIndex)
					});
				}
				if (parts.length === 0) {
					parts.push({
						type: 'text',
						content: txt
					});
				}
				for (let i = 0; i < parts.length; i++) {
					const part = parts[i];
					let node;
					if (part.type === 'text') {
						node = document.createTextNode(part.content);
					} else {
						node = document.createElement('img');
						node.className = 'emoji-normal no-text';
						node.dataset.emojiCode = part.code;
						node.src = this.$emo.textToUrl(part.code);
					}
					range.insertNode(node);
					if (i < parts.length - 1) {
						range.setStartAfter(node);
						range.setEndAfter(node);
					}
				}
				range.collapse(false);
			},
			onPaste(e) {
				this.isEmpty = false;
				let txt = e.clipboardData.getData('Text')
				let range = window.getSelection().getRangeAt(0)
				if (range.startContainer !== range.endContainer || range.startOffset !== range.endOffset) {
					range.deleteContents();
				}
				// 粘贴图片和文件时，这里没有数据
				if (txt && typeof(txt) == 'string') {
					this.insertPastedTextWithEmoji(range, txt);
					return;
				}
				let items = (e.clipboardData || window.clipboardData).items
				if (items.length) {
					for (let i = 0; i < items.length; i++) {
						if (items[i].type.indexOf('image') !== -1) {
							let file = items[i].getAsFile();
							let imagePush = {
								fileId: this.generateId(),
								file: file,
								url: URL.createObjectURL(file)
							};
							this.imageList[imagePush.fileId] = (imagePush);
							let line = this.newLine();
							let imageElement = document.createElement('img');
							imageElement.className = 'chat-image no-text';
							imageElement.src = imagePush.url;
							imageElement.dataset.imgId = imagePush.fileId;
							line.appendChild(imageElement);
							let after = document.createTextNode('\u00A0');
							line.appendChild(after);
							this.selectElement(after, 1);
						} else {
							let asFile = items[i].getAsFile();
							if (!asFile) {
								continue;
							}
							let filePush = {
								fileId: this.generateId(),
								file: asFile
							};
							this.fileList[filePush.fileId] = (filePush)
							let line = this.newLine();
							let fileElement = this.createFile(filePush);
							line.appendChild(fileElement);
							let after = document.createTextNode('\u00A0');
							line.appendChild(after);
							this.selectElement(after, 1);
						}
					}
				}
				range.collapse();
			},
			pasteScreenShot(buffer) {
				let id = this.generateId();
				let file = new File([buffer], 'screenShot-' + id + '.png', {
					type: "image/png"
				}); //type为图片的格式
				let imagePush = {
					fileId: id,
					file: file,
					url: URL.createObjectURL(file)
				};
				this.imageList[imagePush.fileId] = (imagePush);
				let line = this.newLine();
				let imageElement = document.createElement('img');
				imageElement.className = 'chat-image no-text';
				imageElement.src = imagePush.url;
				imageElement.dataset.imgId = imagePush.fileId;
				line.appendChild(imageElement);
				let after = document.createTextNode('\u00A0');
				line.appendChild(after);
				this.selectElement(after, 1);
			},
			selectElement(element, endOffset) {
				let selection = window.getSelection();
				// 插入元素可能不是立即执行的，vue可能会在插入元素后再更新dom
				this.$nextTick(() => {
					let t1 = document.createRange();
					t1.setStart(element, 0);
					t1.setEnd(element, endOffset || 0);
					if (element.firstChild) {
						t1.selectNodeContents(element.firstChild);
					}
					t1.collapse();
					selection.removeAllRanges();
					selection.addRange(t1);
					// 需要时自动聚焦
					if (element.focus) {
						element.focus();
					}
				})
			},
			onCompositionEnd(e) {
				this.compositionFlag = false;
				this.onEditorInput(e);
			},
			onKeydown(e) {
				if (e.keyCode === 13) {
					e.preventDefault();
					e.stopPropagation();
					if (this.atIng) {
						this.$refs.atBox.select();
						return;
					}
					if (e.ctrlKey) {
						let selection = window.getSelection();
						let currentRange = selection.getRangeAt(0);
						let currentContainer = currentRange.endContainer;
						// 如果光标在零宽度空格节点中，先移动到父节点，避免影响 newLine() 的识别
						if (currentContainer.nodeType === 3 && currentContainer.textContent === '\u200B') {
							let parent = currentContainer.parentNode;
							let offset = Array.from(parent.childNodes).indexOf(currentContainer);
							currentRange.setStart(parent, offset);
							currentRange.setEnd(parent, offset);
							currentRange.collapse(true);
							selection.removeAllRanges();
							selection.addRange(currentRange);
						}
						let line = this.newLine();
						// 使用零宽度空格节点（\u200B）用于光标定位，不可见，不影响对齐
						let zeroWidthSpace = document.createTextNode('\u200B');
						line.appendChild(zeroWidthSpace);
						// 同步设置光标位置，确保连续换行时能正确定位
						let range = document.createRange();
						range.setStart(zeroWidthSpace, 0);
						range.setEnd(zeroWidthSpace, 0);
						range.collapse(true);
						selection.removeAllRanges();
						selection.addRange(range);
						// 同步更新 blurRange，确保下次操作使用正确位置
						this.blurRange = range.cloneRange();
						this.isEmpty = false;
					} else {
						// 中文输入标记
						if (this.compositionFlag) {
							return;
						}
						this.submit();
					}
					return;
				}
				// 删除键
				if (e.keyCode === 8) {
					// 等待dom更新
					setTimeout(() => {
						let s = this.$refs.content.innerHTML.trim();
						// 空dom时，需要刷新dom
						if (s === '' || s === '<br>' || s === '<div>&nbsp;</div>') {
							// 拼接随机长度的空格，以刷新dom
							this.empty();
							this.isEmpty = true;
							this.selectElement(this.$refs.content);
						} else {
							this.isEmpty = false;
						}
					})
				}
				// at框打开时，上下键移动特殊处理
				if (this.atIng) {
					if (e.keyCode === 38) {
						e.preventDefault();
						e.stopPropagation();
						this.$refs.atBox.moveUp();
					}
					if (e.keyCode === 40) {
						e.preventDefault();
						e.stopPropagation();
						this.$refs.atBox.moveDown();
					}
				}
			},
			insertAtMember(member) {
				this.focus();
				this.$nextTick(() => {
					this.updateRange();
					let blurRange = this.blurRange;
					if (!blurRange) {
						return;
					}
					if (blurRange.startContainer !== blurRange.endContainer || blurRange.startOffset !== blurRange
						.endOffset) {
						blurRange.deleteContents();
					}
					let element = document.createElement('SPAN');
					element.className = 'chat-at-user';
					element.dataset.id = member.userId;
					element.contentEditable = 'false';
					element.innerText = `@${member.showNickName}`;
					blurRange.insertNode(element);
					blurRange.collapse(false);
					let textNode = document.createTextNode('\u00A0');
					blurRange.insertNode(textNode);
					blurRange.collapse();
					this.selectElement(textNode, 1);
					this.isEmpty = false;
				});
			},
			onAtSelect(member) {
				this.atIng = false;
				// 选中输入的 @xx 符
				let blurRange = this.blurRange;
				let endContainer = blurRange.endContainer
				let startOffset = endContainer.data.indexOf("@" + this.atSearchText);
				let endOffset = startOffset + this.atSearchText.length + 1;
				blurRange.setStart(blurRange.endContainer, startOffset);
				blurRange.setEnd(blurRange.endContainer, endOffset);
				blurRange.deleteContents()
				blurRange.collapse();
				this.focus();
				// 创建元素节点
				let element = document.createElement('SPAN')
				element.className = "chat-at-user";
				element.dataset.id = member.userId;
				element.contentEditable = 'false'
				element.innerText = `@${member.showNickName}`
				blurRange.insertNode(element)
				// 光标移动到末尾
				blurRange.collapse()

				// 插入空格
				let textNode = document.createTextNode('\u00A0');
				blurRange.insertNode(textNode);

				blurRange.collapse()
				this.atSearchText = "";
				this.selectElement(textNode, 1);
			},
			onEditorInput(e) {
				this.isEmpty = false;
				if (this.$props.groupMembers && !this.compositionFlag) {
					let selection = window.getSelection()
					let range = selection.getRangeAt(0);
					// 截取@后面的名称作为过滤条件，并以空格结束
					let endContainer = range.endContainer;
					let endOffset = range.endOffset;
					let textContent = endContainer.textContent;
					let startIndex = -1;
					for (let i = endOffset; i >= 0; i--) {
						if (textContent[i] === '@') {
							startIndex = i;
							break;
						}
					}
					// 没有at符号，则关闭弹窗
					if (startIndex === -1) {
						this.$refs.atBox.close();
						return;
					}

					let endIndex = endOffset;
					for (let i = endOffset; i < textContent.length; i++) {
						if (textContent[i] === ' ') {
							endIndex = i;
							break;
						}
					}
					this.atSearchText = textContent.substring(startIndex + 1, endIndex).trim();
					// 打开选择弹窗
					if (this.atSearchText == '') {
						this.showAtBox(e)
					}
				}
			},
			onClickInput() {
				this.updateRange();
			},
			onKeyup() {
				this.updateRange();
			},
			onMousedown() {
				if (this.atIng) {
					this.$refs.atBox.close();
					this.atIng = false;
				}
			},
			insertEmoji(emojiText) {
				let emojiElement = document.createElement('img');
				emojiElement.className = 'emoji-normal no-text';
				emojiElement.dataset.emojiCode = emojiText;
				emojiElement.src = this.$emo.textToUrl(emojiText);

				let blurRange = this.blurRange;
				if (!blurRange) {
					this.focus();
					this.updateRange();
					blurRange = this.blurRange;
				}
				if (blurRange.startContainer !== blurRange.endContainer || blurRange.startOffset !== blurRange.endOffset) {
					blurRange.deleteContents();
				}
				blurRange.insertNode(emojiElement);
				blurRange.collapse()

				let textNode = document.createTextNode('\u00A0');
				blurRange.insertNode(textNode)
				blurRange.collapse()

				this.selectElement(textNode);
				this.isEmpty = false;
			},
			generateId() {
				return this.currentId++;
			},
			createFile(filePush) {
				let file = filePush.file;
				let fileId = filePush.fileId;
				let container = document.createElement('div');
				container.className = 'chat-file-container no-text';
				container.contentEditable = 'false';
				container.dataset.fileId = fileId;

				let left = document.createElement('div');
				left.className = 'file-position-left';
				container.appendChild(left);

				let icon = document.createElement('div');
				icon.className = 'el-icon-document';
				left.appendChild(icon);

				let right = document.createElement('div');
				right.className = 'file-position-right';
				container.appendChild(right);

				let fileName = document.createElement('div');
				fileName.className = 'file-name';
				fileName.innerText = file.name;

				let fileSize = document.createElement('div');
				fileSize.className = 'file-size';
				fileSize.innerText = this.sizeConvert(file.size);

				right.appendChild(fileName);
				right.appendChild(fileSize);

				return container;
			},
			sizeConvert(len) {
				if (len < 1024) {
					return len + 'B';
				} else if (len < 1024 * 1024) {
					return (len / 1024).toFixed(2) + 'KB';
				} else if (len < 1024 * 1024 * 1024) {
					return (len / 1024 / 1024).toFixed(2) + 'MB';
				} else {
					return (len / 1024 / 1024 / 1024).toFixed(2) + 'GB';
				}
			},
			updateRange() {
				let selection = window.getSelection();
				this.blurRange = selection.getRangeAt(0);
			},
			newLine() {
				let selection = window.getSelection();
				let range = selection.getRangeAt(0);
				let divElement = document.createElement('div');
				let endContainer = range.endContainer;
				let parentElement = endContainer.parentElement;
				if (parentElement.parentElement === this.$refs.content) {
					divElement.innerHTML = endContainer.textContent.substring(range.endOffset).trim();
					endContainer.textContent = endContainer.textContent.substring(0, range.endOffset);
					// 插入到当前div（当前行）后面
					parentElement.insertAdjacentElement('afterend', divElement);
				} else {
					divElement.innerHTML = '';
					this.$refs.content.append(divElement);
				}
				return divElement;
			},
			clear() {
				this.empty();
				this.imageList = [];
				this.fileList = [];
				this.$refs.atBox.close();
			},
			empty() {
				this.$refs.content.innerHTML = "";
				let line = this.newLine();
				let after = document.createTextNode('\u00A0');
				line.appendChild(after);
				this.$nextTick(() => this.selectElement(after));
			},
			showAtBox() {
				this.atIng = true;
				// show之后会自动更新当前搜索的text
				// this.atSearchText = "";
				let selection = window.getSelection()
				let range = selection.getRangeAt(0)
				// 光标所在坐标
				let pos = range.getBoundingClientRect();
				this.$refs.atBox.open({
					x: pos.x,
					y: pos.y
				})
				// 记录光标所在位置
				this.updateRange();
			},
			submit() {
				let nodes = this.$refs.content.childNodes;
				let fullList = [];
				let tempText = '';
				let atUserIds = [];
				let each = (nodes) => {
					for (let i = 0; i < nodes.length; i++) {
						let node = nodes[i];
						if (!node) {
							continue;
						}
						if (node.nodeType === 3) {
							tempText += node.textContent;
							continue;
						}
						let nodeName = node.nodeName.toLowerCase();
						if (nodeName === 'script') {
							continue;
						}
						let text = tempText.trim();
						if (nodeName === 'img') {
							let imgId = node.dataset.imgId;
							if (imgId) {
								if (text) {
									fullList.push({
										type: 'text',
										content: text,
										atUserIds: atUserIds
									})
									tempText = '';
									atUserIds = []
								}
								fullList.push({
									type: 'image',
									content: this.imageList[imgId]
								})
							} else {
								let emojiCode = node.dataset.emojiCode;
								tempText += emojiCode;
							}
						} else if (nodeName === 'div') {
							let fileId = node.dataset.fileId
							// 文件
							if (fileId) {
								if (text) {
									fullList.push({
										type: 'text',
										content: text,
										atUserIds: atUserIds
									})
									tempText = '';
									atUserIds = []
								}
								fullList.push({
									type: 'file',
									content: this.fileList[fileId]
								})
							} else {
								tempText += '\n';
								each(node.childNodes);
							}
						} else if (nodeName === 'span') {
							if (node.dataset.id) {
								tempText += node.innerHTML;
								atUserIds.push(node.dataset.id)
							} else if (node.outerHtml) {
								tempText += node.outerHtml;
							}
						}
					}
				}
				each(nodes)
				let text = tempText.trim();
				if (text !== '') {
					fullList.push({
						type: 'text',
						content: text,
						atUserIds: atUserIds
					})
				}
				this.$emit('submit', fullList);
			},
			focus() {
				this.$refs.content.focus();
			},
			saveDraft(chat) {
				if (!chat) return;
				const draft = {
					innerHTML: this.$refs.content.innerHTML,
					imageList: this.imageList,
					fileList: this.fileList,
					isEmpty: this.isEmpty
				}
				const key = this.buildDraftKey(chat);
				this.draftMap.set(key, draft);
				this.chatStore.setDraftText(chat, this.draftText())

			},
			restoreDraft(chat) {
				if (!chat) return;
				const key = this.buildDraftKey(chat);
				const draft = this.draftMap.get(key);
				if (draft && !draft.isEmpty) {
					this.$refs.content.innerHTML = draft.innerHTML;
					this.imageList = draft.imageList;
					this.fileList = draft.fileList;
					this.isEmpty = draft.isEmpty;
					this.chatStore.setDraftText(chat, "");
					// 将光标移动到末尾
					this.moveCursorToEnd();
				} else {
					this.clear();
				}
			},
			moveCursorToEnd() {
				const content = this.$refs.content;
				const range = document.createRange();
				const selection = window.getSelection();
				// 将光标设置到 content 元素的末尾
				range.selectNodeContents(content);
				// false表示折叠到范围的末尾
				range.collapse(false);
				selection.removeAllRanges();
				selection.addRange(range);
				this.focus();
				this.updateRange();
			},
			buildDraftKey(chat) {
				return chat.type + '-' + chat.targetId;
			},
			draftText() {
				let nodes = this.$refs.content.childNodes;
				let tempText = '';
				let each = (nodes) => {
					for (let i = 0; i < nodes.length; i++) {
						let node = nodes[i];
						if (!node) {
							continue;
						}
						if (node.nodeType === 3) {
							tempText += node.textContent;
							continue;
						}
						let nodeName = node.nodeName.toLowerCase();
						if (nodeName === 'script') {
							continue;
						}
						if (nodeName === 'img') {
							let imgId = node.dataset.imgId;
							if (imgId) {
								tempText += this.$t('chat.previewImage');
							} else {
								let emojiCode = node.dataset.emojiCode;
								tempText += emojiCode;
							}
						} else if (nodeName === 'div') {
							let fileId = node.dataset.fileId
							// 文件
							if (fileId) {
								tempText += this.$t('chat.previewFile');
							} else {
								tempText += '\n';
								each(node.childNodes);
							}
						} else if (nodeName === 'span') {
							if (node.dataset.id) {
								tempText += node.innerHTML;
							} else if (node.outerHtml) {
								tempText += node.outerHtml;
							}
						}
					}
				}
				each(nodes)
				return tempText.trim();
			},
			// ==========================================
			// 【核心】右键菜单逻辑
			// ==========================================

			handleContextMenu(e) {
				// 阻止默认浏览器菜单
				e.preventDefault();

				const {
					clientX,
					clientY
				} = e;
				const {
					innerWidth,
					innerHeight
				} = window;

				// 简单的边界计算 (菜单宽高预估)
				this.menuLeft = clientX > innerWidth - 150 ? clientX - 150 : clientX;
				this.menuTop = clientY > innerHeight - 120 ? clientY - 120 : clientY;

				// 缓存当前选区，用于后续的复制/剪切/粘贴定位
				const selection = window.getSelection();
				if (selection.rangeCount > 0) {
					this.cachedRange = selection.getRangeAt(0).cloneRange();
				}

				this.showContextMenu = true;
			},

			hideMenu() {
				this.showContextMenu = false;
				this.cachedRange = null;
			},

			// ==========================================
			// 【核心】跨平台剪贴板操作
			// ==========================================
			async execCommand(command) {
				try {
					// 1. 恢复光标位置
					if (this.cachedRange) {
						const selection = window.getSelection();
						selection.removeAllRanges();
						selection.addRange(this.cachedRange);
					}

					if (command === 'paste') {
						await this.handlePaste();
					} else {
						// 复制和剪切
						const success = document.execCommand(command);
						if (success) {
							this.onEditorInput(); // 强制更新视图状态
						}
					}
				} catch (err) {
					console.error(`${command} failed:`, err);
				} finally {
					this.hideMenu();
				}
			},

			// ==========================================
			// 【核心】智能粘贴逻辑 (适配网页/桌面)
			// ==========================================
			async handlePaste() {
				let text = '';
				let imageData = null;
				try {
					
					if (this.isElectron) {
						// --- 【Electron 桌面端】: 使用 Node.js 模块，权限最高 ---
						const {
							clipboard
						} = require('electron');

						// 优先读取富文本或特殊格式 (如果有的话)
						// text = clipboard.readText() || clipboard.readHTML();
						text = clipboard.readText();

						// Electron 可以直接读取图片
						const image = clipboard.readImage();
						if (!image.isEmpty()) {
							// 将图片转为 Blob 或 DataURL
							const imageDataBuffer = image.toPNG(); // 返回 Buffer
							imageData = new File([imageDataBuffer], 'clipboard-image.png', {
								type: 'image/png'
							});
						}
					} else {
						// --- 【网页端】: 使用现代 Web API ---
						// 需要 HTTPS 环境
						const items = await navigator.clipboard.readText();

						for (let item of items) {
							if (item.types.includes('text/plain')) {
								text = await item.getType('text/plain');
								text = text ? text.textContent : '';
							}
							// 网页端读取图片较为复杂，通常直接触发 onPaste 事件让浏览器处理
							// 这里简化处理，如果需要网页端读取图片，需使用 readItem.getAsFile()
						}
					}
					console.log('环境检测:', this.isElectron, '是否获取到文本:', text)
				} catch (err) {
					console.warn('Modern clipboard API failed, falling back to legacy method:', err);

					// --- 兜底方案 (Legacy) ---
					// 如果现代 API 失败（如网页端 HTTP 环境），尝试触发你原有的 onPaste 逻辑
					// 这依赖于浏览器的默认行为
					const fakeEvent = {
						clipboardData: {
							getData: (type) => type === 'Text' ? 'Fallback Text' : '',
							items: [] // 模拟空数据，防止报错
						},
						preventDefault: () => {}
					};
					this.onPaste(fakeEvent);
					return;
				}

				// 执行插入逻辑
				if (imageData) {
					// 插入图片 (参考你原有的 onPaste 中处理图片的逻辑)
					this.insertPastedImage(imageData);
				} else if (text) {
					// 插入文本 (参考你原有的逻辑)
					this.insertPastedTextWithEmoji(this.cachedRange || window.getSelection().getRangeAt(0), text);
				}
			},

			// ==========================================
			// 【辅助】插入图片逻辑 (简化版)
			// ==========================================
			insertPastedImage(file) {
				const id = this.generateId();
				const imagePush = {
					fileId: id,
					file: file,
					url: URL.createObjectURL(file)
				};
				this.imageList[id] = imagePush;

				const range = this.cachedRange || window.getSelection().getRangeAt(0);
				range.deleteContents(); // 删除原有选中内容

				const line = this.newLine();
				const img = document.createElement('img');
				img.className = 'chat-image no-text';
				img.src = imagePush.url;
				img.dataset.imgId = id;
				line.appendChild(img);

				const after = document.createTextNode('\u00A0');
				line.appendChild(after);
				range.collapse(false);
				this.selectElement(after, 1);
			}
		},
		
		mounted() {
			// 【新增】检测是否为 Electron 环境
			this.isElectron = window && window.process && window.process.type === 'renderer';
			console.log('环境检测:', this.isElectron,process)
			document.addEventListener('click', this.hideMenu);
			document.addEventListener('contextmenu', this.handleContextMenu); // 全局监听右键
		},
		beforeUnmount() {
			document.removeEventListener('click', this.hideMenu);
			document.removeEventListener('contextmenu', this.handleContextMenu);
		},
	}
</script>

<style lang="scss">
	.chat-input-area {
		width: 100%;
		height: 100%;
		position: relative;

		.input-placeholder {
			position: absolute;
			top: 5px;
			left: 5px;
			color: gray;
			pointer-events: none;
			font-size: var(--im-font-size);
			line-height: 26px;
		}

		.edit-container {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			outline: none;
			padding: 5px;
			line-height: 26px;
			font-size: var(--im-font-size);
			text-align: left;
			overflow-y: auto;
			white-space: pre-wrap;

			// 单独一行时，无法在前面输入的bug
			>div:before {
				content: "\00a0";
				font-size: 14px;
				position: absolute;
				top: 0;
				left: 0;
			}

			.chat-image {
				display: block;
				max-width: 200px;
				max-height: 100px;
				border: 1px solid #e6e6e6;
				cursor: pointer;
			}

			.chat-file-container {
				max-width: 65%;
				padding: 10px;
				border: 2px solid #587ff0;
				display: flex;
				background: #eeeC;
				border-radius: 10px;

				.file-position-left {
					display: flex;
					width: 80px;
					justify-content: center;
					align-items: center;

					.el-icon-document {
						font-size: 40px;
						text-align: center;
						color: #d42e07;
					}
				}

				.file-position-right {
					flex: 1;

					.file-name {
						font-size: 16px;
						font-weight: 600;
						color: #66b1ff;
					}

					.file-size {
						font-size: 14px;
						font-weight: 600;
					}
				}
			}

			.chat-at-user {
				color: #00f;
				border-radius: 3px;
			}
		}


		// 右键菜单样式
		.context-menu {
			position: fixed;
			background: #fff;
			border: 1px solid #ddd;
			border-radius: 4px;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
			z-index: 9999;
			min-width: 120px;
			font-size: 14px;

			ul {
				list-style: none;
				padding: 0;
				margin: 0;
			}

			li {
				padding: 8px 20px;
				cursor: pointer;
				display: flex;
				align-items: center;
				color: #333;
				transition: background 0.2s;

				&:hover {
					background: #f0f0f0;
				}

				i {
					margin-right: 10px;
					font-size: 16px;
					color: #666;
				}
			}
		}


	}
</style>