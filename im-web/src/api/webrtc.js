
class ImWebRtc {
	constructor() {
		this.configuration = {}
		this.stream = null;
	}
}

ImWebRtc.prototype.isEnable = function () {
	window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window
		.mozRTCPeerConnection;
	window.RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window
		.mozRTCSessionDescription;
	window.RTCIceCandidate = window.RTCIceCandidate || window.webkitRTCIceCandidate || window
		.mozRTCIceCandidate;
	return !!window.RTCPeerConnection;
}

ImWebRtc.prototype.init = function (configuration) {
	this.configuration = configuration;
}

ImWebRtc.prototype.setupPeerConnection = function (callback) {
	this.peerConnection = new RTCPeerConnection(this.configuration);
	this.peerConnection.ontrack = (e) => {
		// 对方的视频流
		callback(e.streams[0]);
	};
}


ImWebRtc.prototype.setStream = function (stream) {
	if (this.peerConnection) {
		this.peerConnection.getSenders().forEach((sender) => {
			this.peerConnection.removeTrack(sender);
		});
	}
	this.videoSender = null;
	this.audioSender = null;
	if (stream) {
		stream.getTracks().forEach((track) => {
			const sender = this.peerConnection.addTrack(track, stream);
			if (track.kind === 'video') {
				this.videoSender = sender;
			} else if (track.kind === 'audio') {
				this.audioSender = sender;
			}
		});
	}
	this.stream = stream;
}

// 替换当前发送的音视频轨道（关摄像头后 sender.track 为空，须用固定 sender 才能再次 replaceTrack）
ImWebRtc.prototype.switchStream = function (stream) {
	let videoTrack = stream.getVideoTracks()[0];
	let audioTrack = stream.getAudioTracks()[0];
	if (this.videoSender) {
		this.videoSender.replaceTrack(videoTrack);
	}
	if (this.audioSender) {
		this.audioSender.replaceTrack(audioTrack);
	}
	this.stream = stream;
}


ImWebRtc.prototype.onIcecandidate = function (callback) {
	this.peerConnection.onicecandidate = (event) => {
		// 追踪到候选信息
		if (event.candidate) {
			callback(event.candidate)
		}
	}
}

ImWebRtc.prototype.onStateChange = function (callback) {
	// 监听连接状态
	this.peerConnection.oniceconnectionstatechange = (event) => {
		let state = event.target.iceConnectionState;
		console.log("ICE连接状态变化: : " + state)
		callback(state)
	};
}

ImWebRtc.prototype.createOffer = function () {
	return new Promise((resolve, reject) => {
		const offerParam = {};
		offerParam.offerToReceiveAudio = 1;
		offerParam.offerToReceiveVideo = 1;
		// 创建本地sdp信息
		this.peerConnection.createOffer(offerParam).then((offer) => {
			// 设置本地sdp信息
			this.peerConnection.setLocalDescription(offer);
			// 发起呼叫请求
			resolve(offer)
		}).catch((e) => {
			reject(e)
		})
	});
}


ImWebRtc.prototype.createAnswer = function (offer) {
	return new Promise((resolve, reject) => {
		// 设置远端的sdp
		this.setRemoteDescription(offer);
		// 创建本地dsp
		const offerParam = {};
		offerParam.offerToReceiveAudio = 1;
		offerParam.offerToReceiveVideo = 1;
		this.peerConnection.createAnswer(offerParam).then((answer) => {
			// 设置本地sdp信息
			this.peerConnection.setLocalDescription(answer);
			// 接受呼叫请求
			resolve(answer)
		}).catch((e) => {
			reject(e)
		})
	});
}

ImWebRtc.prototype.setRemoteDescription = function (offer) {
	// 设置对方的sdp信息
	this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
}

ImWebRtc.prototype.addIceCandidate = function (candidate) {
	// 添加对方的候选人信息
	this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

ImWebRtc.prototype.close = function (uid) {
	// 关闭RTC连接
	if (this.peerConnection) {
		this.peerConnection.close();
		this.peerConnection.onicecandidate = null;
		this.peerConnection.onaddstream = null;
		this.peerConnection = null;
	}
	this.videoSender = null;
	this.audioSender = null;
	this.stream = null;
}

export default ImWebRtc;