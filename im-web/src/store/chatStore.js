import { defineStore } from 'pinia';
import { MESSAGE_TYPE, MESSAGE_STATUS } from "../api/enums.js"
import i18n from '../i18n';
import useUserStore from './userStore.js';
import useFriendStore from './friendStore.js';
import useGroupStore from './groupStore.js';
import * as messageUtil from '../api/messageUtil.js';
import * as messageType from '../api/messageType.js';
import localForage from 'localforage';


/**
 * 优化1(冷热消息分区):
 * 热消息：登录后的消息
 * 冷消息: 登录前的消息
 * 每个会话的冷热消息分别用一个key进行存储，当有新的消息时，只更新热消息key，冷消息key保持不变
 * 由于热消息数量不会很大，所以localForage.setItem耗时很低，可以防止消息过多时出现卡顿的情况
 *
 * 优化2(延迟渲染):
 * 拉取消息时，如果直接用state.chats接收，页面就开始渲染，一边渲染页面一边大量接消息会导致很严重的卡顿
 * 为了加速拉取离线消息效率，拉取时消息暂时存储到cacheChats,等待所有离线消息拉取完成后，再统一放至state中进行渲染
 * 
 * 优化3(pinia代替vuex)
 * 实测pinia的远超vuex,且语法更简洁清晰
 * 
 * 优化4(限制写盘频率)
 * 每秒钟只允许执行一次saveToStorage,能有效避免消息量大时卡顿
 * 实测：处理消息效率从每秒30条提升至每秒70条
 * */


let cacheChats = [];
let lastWriteTime = 0;
let writeDiskTimer = null;

export default defineStore('chatStore', {
	state: () => {
		return {
			activeChat: null,
			chats: [],
			privateMsgMaxId: 0,
			groupMsgMaxId: 0,
			systemMsgMaxSeqNo: 0,
			loading: true
		}
	},
	actions: {
		initChats(chatsData) {
			this.chats = [];
			this.activeChat = null;
			this.privateMsgMaxId = chatsData.privateMsgMaxId || 0;
			this.groupMsgMaxId = chatsData.groupMsgMaxId || 0;
			this.systemMsgMaxSeqNo = chatsData.systemMsgMaxSeqNo || 0;
			cacheChats = chatsData.chats || [];
		},
		openChat(chatInfo) {
			let chats = this.findChats()
			let chat = this.findChat(chatInfo);
			// 创建会话
			if (chat == null) {
				chat = {
					targetId: chatInfo.targetId,
					type: chatInfo.type,
					showName: chatInfo.showName,
					headImage: chatInfo.headImage,
					companyName: chatInfo.companyName,
					isDnd: chatInfo.isDnd,
					isTop: chatInfo.isTop,
					lastContent: "",
					lastSendTime: new Date().getTime(),
					optTime: new Date().getTime(),
					unreadCount: 0,
					hotMinIdx: 0,
					readedMessageIdx: 0,
					messages: [],
					atMe: false,
					atAll: false,
					lastAtMessageId: -1,
					stored: false,
					delete: false
				};
				chats.push(chat);
			}
			this.moveTop(chatInfo);
		},
		setActiveChat(chatInfo) {
			this.activeChat = this.findChat(chatInfo);
		},
		resetUnreadCount(chatInfo) {
			let chat = this.findChat(chatInfo);
			chat.unreadCount = 0;
			chat.stored = false;
			this.saveToStorage();
		},
		resetAtMessage(chatInfo) {
			let chat = this.findChat(chatInfo);
			chat.atAll = false;
			chat.atMe = false;
			chat.lastAtMessageId = -1;
			chat.stored = false;
			this.saveToStorage();
		},
		readedMessage(pos) {
			let chat = this.findChatByFriend(pos.friendId);
			if (!chat) return;
			// 已读回执没有做可靠性投递，通过回溯100条的方式去修正
			let isColdMessage = false;
			let idx = Math.max(0, chat.readedMessageIdx - 100);
			for (; idx < chat.messages.length; idx++) {
				let m = chat.messages[idx];
				// pos.maxId为空表示整个会话已读
				if (!pos.maxId || m.id <= pos.maxId) {
					// 更新消息已读状态
					if (m.id && m.selfSend && m.status < MESSAGE_STATUS.RECALL) {
						m.status = MESSAGE_STATUS.READED
						chat.stored = false;
						isColdMessage = idx < chat.hotMinIdx;
					}
					// 记录已读消息位置
					if (chat.readedMessageIdx < idx) {
						chat.readedMessageIdx = idx;
						chat.stored = false;
					}
				}
			}
			if (!chat.stored) {
				this.saveToStorage(isColdMessage);
			}
		},
		cleanMessage(chatInfo) {
			let chat = this.findChat(chatInfo);
			chat.lastContent = '';
			chat.hotMinIdx = 0;
			chat.unreadCount = 0;
			chat.atMe = false;
			chat.atAll = false;
			chat.lastAtMessageId = -1
			chat.stored = false;
			chat.messages = [];
			chat.readedMessageIdx = 0;
			this.saveToStorage(true);
		},
		removeChat(chatInfo) {
			let chat = this.findChat(chatInfo);
			if (chat == this.activeChat) {
				this.activeChat = null;
			}
			chat.delete = true;
			chat.stored = false;
			this.saveToStorage()
		},
		removePrivateChat(friendId) {
			let chat = this.findChatByFriend(friendId);
			chat && this.removeChat(chat);
		},
		removeGroupChat(groupId) {
			let chat = this.findChatByGroup(groupId);
			chat && this.removeChat(chat);
		},
		moveTop(chatInfo) {
			// 加载中不移动，很耗性能
			if (this.loading) {
				return;
			}
			let idx = this.findChatIdx(chatInfo);
			let chats = this.findChats();
			let chat = chats[idx];
			let insertIdx = chat.isTop ? 0 : this.topSize();
			if (idx != insertIdx) {
				chats.splice(idx, 1);
				chats.splice(insertIdx, 0, chat);
				chat.optTime = new Date().getTime();
				chat.stored = false;
				this.saveToStorageInTimer();
			}
		},
		insertMessage(msgInfo, chatInfo) {
			let type = chatInfo.type;
			// 记录消息的最大id
			if (msgInfo.id && type == "PRIVATE" && msgInfo.id > this.privateMsgMaxId) {
				this.privateMsgMaxId = msgInfo.id;
			}
			if (msgInfo.id && type == "GROUP" && msgInfo.id > this.groupMsgMaxId) {
				this.groupMsgMaxId = msgInfo.id;
			}
			if (msgInfo.seqNo && type == "SYSTEM" && msgInfo.seqNo > this.systemMsgMaxSeqNo) {
				this.systemMsgMaxSeqNo = msgInfo.seqNo;
			}
			// 如果是已存在消息，则覆盖旧的消息数据
			let chat = this.findChat(chatInfo);
			let message = this.findMessage(chat, msgInfo);
			if (message) {
				Object.assign(message, msgInfo);
				chat.stored = false;
				this.saveToStorageInTimer();
				return;
			}
			// 会话列表内容
			chat.lastContent = messageUtil.previewContent(msgInfo);
			chat.lastSendTime = msgInfo.sendTime;
			chat.sendNickName = msgInfo.sendNickName;
			chat.optTime = msgInfo.sendTime;
			// 未读加1
			if (!msgInfo.selfSend && msgInfo.status != MESSAGE_STATUS.READED &&
				msgInfo.status != MESSAGE_STATUS.RECALL && msgInfo.type != MESSAGE_TYPE.TIP_TEXT) {
				chat.unreadCount++;
			}
			// 是否有人@我
			if (!msgInfo.selfSend && chat.type == "GROUP" && msgInfo.atUserIds &&
				msgInfo.status != MESSAGE_STATUS.READED) {
				const userStore = useUserStore();
				let userId = userStore.userInfo.id;
				if (msgInfo.atUserIds.indexOf(userId) >= 0) {
					chat.atMe = true;
					chat.lastAtMessageId = msgInfo.id;
				}
				if (msgInfo.atUserIds.indexOf(-1) >= 0) {
					chat.atAll = true;
					chat.lastAtMessageId = msgInfo.id;
				}
			}
			// 间隔大于10分钟插入时间显示
			if (!chat.lastTimeTip || (chat.lastTimeTip < msgInfo.sendTime - 600 * 1000)) {
				chat.messages.push({
					sendTime: msgInfo.sendTime,
					type: MESSAGE_TYPE.TIP_TIME,
				});
				chat.lastTimeTip = msgInfo.sendTime;
			}
			chat.messages.push(msgInfo);
			chat.stored = false;
			this.saveToStorageInTimer();
		},
		updateMessage(msgInfo, chatInfo) {
			// 获取对方id或群id
			let chat = this.findChat(chatInfo);
			let message = this.findMessage(chat, msgInfo);
			if (message) {
				// 属性拷贝
				Object.assign(message, msgInfo);
				chat.stored = false;
				this.saveToStorage();
			}
		},
		deleteMessage(msgInfo, chatInfo) {
			let isColdMessage = false;
			let chat = this.findChat(chatInfo);
			let delIdx = -1;
			for (let idx in chat.messages) {
				// 已经发送成功的，根据id删除
				if (chat.messages[idx].id && chat.messages[idx].id == msgInfo.id) {
					delIdx = idx;
					break;
				}
				// 正在发送中的消息可能没有id，只有临时id
				if (chat.messages[idx].tmpId && chat.messages[idx].tmpId == msgInfo.tmpId) {
					delIdx = idx;
					break;
				}
			}
			if (delIdx >= 0) {
				chat.messages.splice(delIdx, 1);
				if (delIdx < chat.hotMinIdx) {
					isColdMessage = true;
					chat.hotMinIdx--;
				}
				if (delIdx < chat.readedMessageIdx) {
					chat.readedMessageIdx--;
				}
				chat.stored = false;
				this.saveToStorage(isColdMessage);
			}
		},
		recallMessage(msgInfo, chatInfo) {
			let chat = this.findChat(chatInfo);
			if (!chat) return;
			let isColdMessage = false;
			// 要撤回的消息id
			let id = msgInfo.content;
			for (let idx in chat.messages) {
				let m = chat.messages[idx];
				if (m.id && m.id == id) {
					let recallContent = '';
					// 使用 key+params 格式存储，语言切换时由 displayContent 自动渲染
					if (chat.type == 'GROUP') {
						const userStore = useUserStore();
						const userId = userStore.userInfo.id;
						let recallerName = msgInfo.sendNickName || i18n.t('home.unknownUser');
						let recallerId = msgInfo.sendId;
						let recallerMark = `#{${recallerName}:${recallerId}}`;
						if (m.sendId != msgInfo.sendId) {
							let senderName = m.sendNickName || i18n.t('home.unknownUser');
							let senderId = m.sendId;
							let senderMark = `#{${senderName}:${senderId}}`;
							recallContent = JSON.stringify({ key: 'tip.recall.byOther', params: [recallerMark, senderMark] });
						} else {
							recallContent = JSON.stringify({ key: 'tip.recall.self', params: [recallerMark] });
						}
						
						const groupStore = useGroupStore();
						let group = groupStore.findGroup(chatInfo.targetId);
						if (!group) {
							group = {
								id: chatInfo.targetId,
								showGroupName: JSON.stringify({ key: 'common.unknownGroup', params: [] }),
								headImageThumb: ""
							}
						}
						var groupMembers=group.members.filter(m => !m.quit)
						let mz = groupMembers.find((m) => m.userId == userId);
						if(group.ownerId == userId || (mz && mz.isManager)){
							console.log('User has permission to recall message');
						}else{
							recallContent=""
						}
					} else {
						recallContent = JSON.stringify({ key: msgInfo.selfSend ? 'tip.recall.privateSelf' : 'tip.recall.privateOther', params: [] });
					}
					// 改造成一条提示消息
					m.status = MESSAGE_STATUS.RECALL;
					m.content = recallContent;
					m.type = MESSAGE_TYPE.TIP_TEXT
					// 会话列表
					chat.lastContent = messageUtil.previewContent(m);
					chat.lastSendTime = msgInfo.sendTime;
					chat.sendNickName = '';
					if (!msgInfo.selfSend && msgInfo.status != MESSAGE_STATUS.READED) {
						chat.unreadCount++;
					}
					isColdMessage = idx < chat.hotMinIdx;
				}
				// 被引用的消息也要撤回，使用 key+params 便于语言切换
				if (m.quoteMessage && m.quoteMessage.id == id) {
					m.quoteMessage.content = JSON.stringify({ key: 'tip.recall.quote' });
					m.quoteMessage.status = MESSAGE_STATUS.RECALL;
					m.quoteMessage.type = MESSAGE_TYPE.TIP_TEXT
				}
			}
			chat.stored = false;
			this.saveToStorage(isColdMessage);
		},
		updateChatFromFriend(friend) {
			let chat = this.findChatByFriend(friend.id);
			// 更新会话中的昵称和头像
			if (chat && (chat.headImage != friend.headImage ||
				chat.showName != friend.showNickName)) {
				chat.headImage = friend.headImage;
				chat.showName = friend.showNickName;
				chat.stored = false;
				this.saveToStorage();
			}
		},
		updateChatFromUser(user) {
			let chat = this.findChatByFriend(user.id);
			// 更新会话中的昵称和头像
			if (chat && (chat.headImage != user.headImageThumb ||
				chat.showName != user.nickName)) {
				chat.headImage = user.headImageThumb;
				chat.showName = user.nickName;
				chat.stored = false;
				this.saveToStorage();
			}
		},
		updateChatFromGroup(group) {
			let chat = this.findChatByGroup(group.id);
			if (chat && (chat.headImage != group.headImageThumb ||
				chat.showName != group.showGroupName)) {
				// 更新会话中的群名称和头像
				chat.headImage = group.headImageThumb;
				chat.showName = group.showGroupName;
				chat.stored = false;
				this.saveToStorage();
			}
		},
		setLoading(loading) {
			this.loading = loading;
		},
		setDnd(chatInfo, isDnd) {
			let chat = this.findChat(chatInfo);
			if (chat) {
				chat.isDnd = isDnd;
			}
		},
		setTop(chatInfo, isTop) {
			let chat = this.findChat(chatInfo);
			if (chat) {
				chat.isTop = isTop;
				this.moveTop(chatInfo);
			}
		},
		refreshAllLastContent() {
			let chats = cacheChats || this.chats;
			chats.forEach(chat => this.refreshLastContent(chat));
		},
		refreshLastContent(chatInfo) {
			let chat = this.findChat(chatInfo);
			for (let idx = chat.messages.length - 1; idx >= 0; idx--) {
				let m = chat.messages[idx];
				if (messageType.isNormal(m.type) || messageType.isAction(m.type)) {
					chat.lastContent = messageUtil.previewContent(m);
					return
				}
			}
		},
		refreshChats() {
			let chats = cacheChats || this.chats;
			// 更新会话置顶和免打扰状态
			const friendStore = useFriendStore();
			const groupStore = useGroupStore();
			chats.forEach(chat => {
				if (chat.type == 'PRIVATE') {
					let friend = friendStore.findFriend(chat.targetId);
					if (friend) {
						chat.isDnd = friend.isDnd;
						chat.isTop = friend.isTop;
						chat.companyName = friend.companyName;
					}
					
					
				} else if (chat.type == 'GROUP') {
					let group = groupStore.findGroup(chat.targetId);
					if (group) {
						chat.isDnd = group.isDnd;
						chat.isTop = group.isTop;
					}
				}
			})
			// 排序
			chats.sort((chat1, chat2) => {
				if (chat1.isTop && !chat2.isTop) {
					return -1;
				} else if (chat2.isTop && !chat1.isTop) {
					return 1;
				} else {
					return chat2.optTime - chat1.optTime
				}
			});
			/**
			 * 由于部分浏览器不支持websql或indexdb，只能使用localstorage，而localstorage大小只有10m,可能会导致缓存空间溢出
			 * 解决办法:针对只能使用localstorage的浏览器，最多保留1w条消息,每个会话最多保留1000条消息
			 */
			if (localForage.driver().includes("localStorage")) {
				this.fliterMessage(chats, 10000, 1000)
			}
			// 记录热数据索引位置
			chats.forEach(chat => {
				if (!chat.hotMinIdx || chat.hotMinIdx != chat.messages.length) {
					chat.hotMinIdx = chat.messages.length;
					chat.stored = false;
				}
			});
			// 将消息一次性装载回来
			this.chats = chats;
			// 清空缓存
			cacheChats = null;
			// 持久化消息
			this.saveToStorage(true);
		},
		fliterMessage(chats, maxTotalSize, maxPerChatSize) {
			// 每个会话只保留maxPerChatSize条消息
			let remainTotalSize = 0;
			chats.forEach(chat => {
				if (chat.messages.length > maxPerChatSize) {
					let idx = chat.messages.length - maxPerChatSize;
					chat.messages = chat.messages.slice(idx);
				}
				remainTotalSize += chat.messages.length;
			})
			// 保证消息总数不超过maxTotalSize条，否则继续清理
			if (remainTotalSize > maxTotalSize) {
				this.fliterMessage(chats, maxTotalSize, maxPerChatSize / 2);
			}
		},
		setDraftText(chatInfo, draftText) {
			let chat = this.findChat(chatInfo);
			chat.draftText = draftText;
		},
		saveToStorageInTimer() {
			// 控制每秒只能写入一次磁盘，避免消息量大时频繁写入造成卡顿
			if (new Date().getTime() - lastWriteTime > 1000) {
				this.saveToStorage();
				lastWriteTime = new Date().getTime();
				clearTimeout(writeDiskTimer)
				writeDiskTimer = null;
			} else if (!writeDiskTimer) {
				writeDiskTimer = setTimeout(() => {
					this.saveToStorageInTimer();
				}, 1000)
			}
		},
		saveToStorage(withColdMessage) {
			// 加载中不保存，防止卡顿
			if (this.loading || !this.chats.length) {
				return;
			}
			const userStore = useUserStore();
			let userId = userStore.userInfo.id;
			let key = "chats-" + userId;
			let chatKeys = [];
			const promises = [];
			// 按会话为单位存储
			for (let idx in this.chats) {
				let chat = this.chats[idx];
				// 只存储有改动的会话
				let chatKey = `${key}-${chat.type}-${chat.targetId}`
				if (!chat.stored) {
					if (chat.delete) {
						let hotKey = chatKey + '-hot';
						promises.push(localForage.removeItem(chatKey))
						promises.push(localForage.removeItem(hotKey))
					} else {
						// 存储冷数据
						if (withColdMessage) {
							let coldChat = Object.assign({}, chat);
							coldChat.messages = chat.messages.slice(0, chat.hotMinIdx);
							promises.push(localForage.setItem(chatKey, coldChat))
							console.log("coldKey:", chatKey)
						}
						// 存储热消息
						let hotKey = chatKey + '-hot';
						let hotChat = Object.assign({}, chat);
						hotChat.messages = chat.messages.slice(chat.hotMinIdx)
						promises.push(localForage.setItem(hotKey, hotChat))
						console.log("hotKey:", hotKey)
					}
					chat.stored = true;
				}
				if (!chat.delete) {
					chatKeys.push(chatKey);
				}
			}
			// 会话核心信息
			let chatsData = {
				privateMsgMaxId: this.privateMsgMaxId,
				groupMsgMaxId: this.groupMsgMaxId,
				systemMsgMaxSeqNo: this.systemMsgMaxSeqNo,
				chatKeys: chatKeys
			}
			Promise.all(promises).then(() => {
				localForage.setItem(key, chatsData)
			}).catch(() => {
				console.log("本地消息缓存存储失败")
			})
			// 清理已删除的会话
			this.chats = this.chats.filter(chat => !chat.delete)
		},
		clear() {
			cacheChats = []
			this.activeChat = null;
			this.chats = [];
			this.privateMsgMaxId = 0;
			this.groupMsgMaxId = 0;
			this.systemMsgMaxSeqNo = 0;
			this.loading = false;
		},
		loadChat() {
			return new Promise((resolve, reject) => {
				let userStore = useUserStore();
				let userId = userStore.userInfo.id;
				let key = "chats-" + userId;
				localForage.getItem(key).then((chatsData) => {
					if (!chatsData) {
						resolve();
					} else if (chatsData.chatKeys) {
						const promises = [];
						chatsData.chatKeys.forEach(key => {
							promises.push(localForage.getItem(key))
							promises.push(localForage.getItem(key + "-hot"))
						})
						Promise.all(promises).then(chats => {
							chatsData.chats = [];
							// 偶数下标为冷消息，奇数下标为热消息
							for (let i = 0; i < chats.length; i += 2) {
								if (!chats[i] && !chats[i + 1]) {
									continue;
								}
								let coldChat = chats[i];
								let hotChat = chats[i + 1];
								// 防止消息一直处在发送中状态
								hotChat && hotChat.messages.forEach(msg => {
									if (msg.status == MESSAGE_STATUS.SENDING) {
										msg.status = MESSAGE_STATUS.FAILED
									}
								})
								// 冷热消息合并
								let chat = Object.assign({}, coldChat, hotChat);
								if (hotChat && coldChat) {
									chat.messages = coldChat.messages.concat(hotChat
										.messages)
								}
								// 清空草稿
								chat.draftText = "";
								// 历史版本没有readedMessageIdx和optTime字段，做兼容一下
								chat.readedMessageIdx = chat.readedMessageIdx || 0;
								chat.optTime = chat.optTime || chat.lastSendTime;
								// 当存在热消息时，需要存储一遍
								chat.stored = !(hotChat && hotChat.messages.length)
								chatsData.chats.push(chat);

							}
							this.initChats(chatsData);
							resolve();
						})
					}
				}).catch((e) => {
					console.log("加载消息失败")
					reject();
				})
			})
		}
	},
	getters: {
		findChats: (state) => () => {
			if (cacheChats && state.loading) {
				return cacheChats;
			}
			return state.chats;
		},
		findChatIdx: (state) => (chat) => {
			let chats = state.findChats();
			for (let idx in chats) {
				if (chats[idx].type == chat.type &&
					chats[idx].targetId === chat.targetId) {
					chat = chats[idx];
					return idx
				}
			}
		},
		findChat: (state) => (chat) => {
			let chats = state.findChats();
			let idx = state.findChatIdx(chat);
			return idx >= 0 ? chats[idx] : null;
		},
		findChatByFriend: (state) => (fid) => {
			let chats = state.findChats();
			return chats.find(chat => chat.type == 'PRIVATE' &&
				chat.targetId == fid)
		},
		findChatByGroup: (state) => (gid) => {
			let chats = state.findChats();
			return chats.find(chat => chat.type == 'GROUP' &&
				chat.targetId == gid)
		},
		findMessage: (state) => (chat, msgInfo) => {
			if (!chat) {
				return null;
			}
			if (chat.type == 'SYSTEM') {
				// 系统消息通过seqNo判断
				for (let idx in chat.messages) {
					if (msgInfo.seqNo && chat.messages[idx].seqNo == msgInfo.seqNo) {
						return chat.messages[idx];
					}
				}
			} else {
				// 通过id判断
				if (msgInfo.id) {
					for (let idx = chat.messages.length - 1; idx >= 0; idx--) {
						let m = chat.messages[idx];
						if (m.id && msgInfo.id == m.id) {
							return m;
						}
						// 如果id比要查询的消息小，说明没有这条消息
						if (m.id && m.id < msgInfo.id) {
							break;
						}
					}
				}
				// 正在发送中的临时消息可能没有id,只有tmpId
				if (msgInfo.selfSend && msgInfo.tmpId) {
					for (let idx = chat.messages.length - 1; idx >= 0; idx--) {
						let m = chat.messages[idx];
						if (!m.selfSend || !m.tmpId) {
							continue;
						}
						if (msgInfo.tmpId == m.tmpId) {
							return m;
						}
						// 如果id比要查询的消息小，说明没有这条消息
						if (m.tmpId && m.tmpId < msgInfo.tmpId) {
							break;
						}
					}
				}
			}
		},
		topSize: (state) => () => {
			let chats = state.findChats();
			return chats.filter(chat => chat.isTop).length;
		}
	}
});