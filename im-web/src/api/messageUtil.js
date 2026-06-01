import { MESSAGE_TYPE } from "./enums.js";
import useUserStore from '../store/userStore.js';
import useChatStore from '../store/chatStore.js';
import useGroupStore from '../store/groupStore.js';
import useFriendStore from '../store/friendStore.js';
import i18n from '@/i18n';

function previewContent(msgInfo) {
    let content = i18n.t('chat.unsupportedType');
    try {
        if (msgInfo.type == MESSAGE_TYPE.IMAGE) {
            content = i18n.t('chat.previewImage');
        } else if (msgInfo.type == MESSAGE_TYPE.VIDEO) {
            content = i18n.t('chat.previewVideo');
        } else if (msgInfo.type == MESSAGE_TYPE.FILE) {
            content = i18n.t('chat.previewFile') + ' ' + JSON.parse(msgInfo.content).name;
        } else if (msgInfo.type == MESSAGE_TYPE.AUDIO) {
            content = i18n.t('chat.previewVoice') + ' ' + JSON.parse(msgInfo.content).duration + '"';
        } else if (msgInfo.type == MESSAGE_TYPE.USER_CARD) {
            content = i18n.t('chat.previewUserCard') + ' ' + JSON.parse(msgInfo.content).nickName;
        } else if (msgInfo.type == MESSAGE_TYPE.GROUP_CARD) {
            content = i18n.t('chat.previewGroupCard') + ' ' + JSON.parse(msgInfo.content).groupName;
        } else if (msgInfo.type == MESSAGE_TYPE.STICKER) {
            content = i18n.t('chat.previewSticker') + ' ' + JSON.parse(msgInfo.content).name;
        } else if (msgInfo.type == MESSAGE_TYPE.MERGE_FORWARD) {
            const n = JSON.parse(msgInfo.content).messages.length;
            content = i18n.t('chat.mergeForwardCount', { n });
        } else if (msgInfo.type == MESSAGE_TYPE.ACT_RT_VOICE) {
            content = i18n.t('chat.voiceCallTag');
        } else if (msgInfo.type == MESSAGE_TYPE.ACT_RT_VIDEO) {
            content = i18n.t('chat.videoCallTag');
        } else if (msgInfo.type == MESSAGE_TYPE.SYSTEM_MESSAGE) {
            content = msgInfo.title;
        } else if (msgInfo.type == MESSAGE_TYPE.TEXT || msgInfo.type == MESSAGE_TYPE.RECALL) {
            content = msgInfo.content;
        } else if (msgInfo.type == MESSAGE_TYPE.TIP_TEXT) {
            content = displayContent(msgInfo.content);
            const userStore = useUserStore();
			if (msgInfo.content && msgInfo.content.trim().startsWith('{')) {
				const obj = JSON.parse(msgInfo.content);
				if (obj && obj.key) {
					if(obj.key=="tip.group.remove"){
						if(obj.params.length==2){
							var strs=obj.params[1].split(",")
							for (var i = 0; i < strs.length; i++) {
								var ids=strs[i].slice(2, -1)
								var ids1=ids.split(":")
								if(ids1.length==2){
									if(ids1[1]==userStore.userInfo.id){
										const groupStore = useGroupStore();
										const chatStore = useChatStore();
										groupStore.removeGroup(msgInfo.groupId);
										let chatInfo = {
											type: 'GROUP',
											targetId: msgInfo.groupId
										}
										chatStore.removeChat(chatInfo)
									}
								}
							}
							
						}
						
					}else if(obj.key=="tip.group.disband"){
						const groupStore = useGroupStore();
						const chatStore = useChatStore();
						groupStore.removeGroup(msgInfo.groupId);
						let chatInfo = {
							type: 'GROUP',
							targetId: msgInfo.groupId
						}
						chatStore.removeChat(chatInfo)
					}else if(obj.key=="tip.friend.relationRemoved"){
						const chatStore = useChatStore();
						const friendStore = useFriendStore();
						let friendId = msgInfo.selfSend ? msgInfo.recvId : msgInfo.sendId;
						friendStore.removeFriend(friendId)
						let chatInfo = {
							type: 'PRIVATE',
							targetId: friendId
						}
						chatStore.removeChat(chatInfo)
					}
					
				}
			}
			
			
            content = content.replace(/#\{([^:]+):(\d+)\}/g, (match, displayName, userId) => {
                if (userStore.userInfo.id == userId) {
                    return i18n.t('chat.you');
                }
                return displayName;
            });
        }
    } catch (e) {
        console.log("message:", msgInfo, e);
    }
    return content;
}

/**
 * TIP_TEXT 展示文案：若 content 为 key+params JSON 则按当前语言渲染，否则返回原 content（历史纯字符串）
 * @param {string} content - 存库的 content
 * @returns {string} 展示用文案
 */
function displayContent(content) {
    try {
         // 兼容旧版本
        if (!content ||!content.trim().startsWith('{')) {
            return content;
        }
        // 转化
        const obj = JSON.parse(content);
        if (obj && obj.key) {
            return i18n.t(obj.key, obj.params) || content;
        }
    } catch (e) {
        console.log("displayContent error,message:", content, e);
    }
    return content;
}

export {
    previewContent,
    displayContent
};
