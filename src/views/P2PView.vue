<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RTCClient } from '@/lib/RTCClient'
import { SignalingClient } from '@/lib/SignalingClient'
import { SignalType, type SignalMessage } from '@/types/signal'

const localVideoRef = ref<HTMLVideoElement | null>(null)
const remoteVideoRef = ref<HTMLVideoElement | null>(null)

const roomId = ref('test-room')
const connState = ref('空闲')
const iceState = ref('空闲')
const statusText = ref('未连接')
const isConnecting = ref(false)
const isInCall = ref(false)

let signaling: SignalingClient | null = null
let rtcClient: RTCClient | null = null
let myId = ''
let remotePeerId: string | null = null

/** 初始化信令连接 */
function initSignaling() {
  const wsUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`
  signaling = new SignalingClient(wsUrl)

  signaling.setCallbacks({
    onOpen: () => {
      statusText.value = '信令已连接，加入房间...'
      signaling!.send({ type: SignalType.JOIN, room: roomId.value })
    },
    onMessage: handleSignalMessage,
    onClose: () => {
      statusText.value = '信令断开'
    },
  })

  signaling.connect()
}

/** 处理收到的信令消息 */
function handleSignalMessage(msg: SignalMessage) {
  switch (msg.type) {
    case SignalType.PEERS: {
      // 收到房间内现有用户列表
      const peers = msg.data as string[] || []
      if (peers.length > 0) {
        remotePeerId = peers[0]
        statusText.value = `发现用户 ${remotePeerId}，可以发起通话`
      } else {
        statusText.value = '房间内暂无其他用户，等待对方加入...'
      }
      break
    }

    case SignalType.JOIN: {
      // 有新用户加入房间，将其设为对端
      if (!remotePeerId) {
        remotePeerId = msg.from!
        statusText.value = `用户 ${remotePeerId} 加入房间，可以发起通话`
      }
      break
    }

    case SignalType.LEAVE: {
      if (remotePeerId === msg.from) {
        remotePeerId = null
        statusText.value = '对端已离开'
        hangup()
      }
      break
    }

    case SignalType.OFFER: {
      // 作为被叫收到 Offer
      if (remotePeerId !== msg.from) {
        remotePeerId = msg.from!
      }
      handleOffer(msg)
      break
    }

    case SignalType.ANSWER: {
      // 收到 Answer，设置远端描述
      rtcClient?.handleAnswer(msg.sdp!)
      break
    }

    case SignalType.ICE_CANDIDATE: {
      // 收到 ICE 候选
      rtcClient?.handleIceCandidate(msg.candidate!)
      break
    }

    case SignalType.REJECT: {
      statusText.value = '通话被拒绝'
      isConnecting.value = false
      break
    }
  }
}

/** 发起通话（主叫） */
async function startCall() {
  if (!remotePeerId) {
    alert('房间内没有其他用户')
    return
  }
  isConnecting.value = true
  statusText.value = '正在获取摄像头...'

  try {
    // 1. 获取本地媒体流并显示
    const stream = await rtcClient!.getLocalStream()
    if (localVideoRef.value) {
      localVideoRef.value.srcObject = stream
    }
    statusText.value = '正在建立连接...'

    // 2. 创建 Offer 并通过信令发送
    rtcClient!.setPeerId(remotePeerId)
    await rtcClient!.createOffer()
    isInCall.value = true
  } catch (err) {
    console.error('发起通话失败:', err)
    statusText.value = `失败: ${err}`
    isConnecting.value = false
  }
}

/** 处理收到的 Offer（被叫） */
async function handleOffer(msg: SignalMessage) {
  try {
    statusText.value = '收到通话请求，正在获取摄像头...'
    const stream = await rtcClient!.getLocalStream()
    if (localVideoRef.value) {
      localVideoRef.value.srcObject = stream
    }

    rtcClient!.setPeerId(msg.from!)
    await rtcClient!.handleOffer(msg.sdp!)
    isInCall.value = true
    statusText.value = '通话中'
  } catch (err) {
    console.error('处理 Offer 失败:', err)
  }
}

/** 挂断 */
function hangup() {
  rtcClient?.close()
  rtcClient = null
  isInCall.value = false
  isConnecting.value = false
  if (remoteVideoRef.value) {
    remoteVideoRef.value.srcObject = null
  }
  if (localVideoRef.value) {
    localVideoRef.value.srcObject = null
  }
  statusText.value = '已挂断'

  // 重新创建 RTCClient 以备下次通话
  createRTCClient()
}

/** 创建 RTCClient 实例 */
function createRTCClient() {
  rtcClient = new RTCClient(
    (message) => signaling?.send(message),
    {
      onRemoteStream: (stream) => {
        if (remoteVideoRef.value) {
          remoteVideoRef.value.srcObject = stream
        }
        statusText.value = '通话中'
        isConnecting.value = false
      },
      onIceCandidate: (candidate, to) => {
        signaling?.send({
          type: SignalType.ICE_CANDIDATE,
          to,
          candidate,
        })
      },
      onConnectionStateChange: (state) => {
        connState.value = state
        if (state === 'failed' || state === 'closed') {
          statusText.value = '连接断开'
        }
      },
      onIceConnectionStateChange: (state) => {
        iceState.value = state
      },
    },
  )
}

onMounted(() => {
  createRTCClient()
  initSignaling()
})

onUnmounted(() => {
  hangup()
  signaling?.disconnect()
})
</script>

<template>
  <div class="p2p-container">
    <h1 class="title">1对1视频通话</h1>
    <p class="hint-text">在另一个浏览器标签/窗口打开本页面，使用同一房间名即可通话</p>

    <div class="control-bar">
      <label>
        房间名：
        <input v-model="roomId" :disabled="isInCall" @keyup.enter="() => { signaling?.disconnect(); initSignaling() }" />
      </label>
      <button :disabled="isInCall" @click="startCall">
        {{ isConnecting ? '连接中...' : isInCall ? '通话中' : '发起通话' }}
      </button>
      <button v-if="isInCall" class="danger" @click="hangup">挂断</button>
    </div>

    <div class="status-bar">
      <span class="status">状态：{{ statusText }}</span>
      <span class="state">连接: {{ connState }}</span>
      <span class="state">ICE: {{ iceState }}</span>
    </div>

    <div class="video-container">
      <div class="video-item">
        <div class="video-label">本地画面</div>
        <video ref="localVideoRef" autoplay playsinline muted />
      </div>
      <div class="video-item">
        <div class="video-label">远端画面</div>
        <video ref="remoteVideoRef" autoplay playsinline />
      </div>
    </div>
  </div>
</template>

<style scoped>
.p2p-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 32px 24px;
}

.title {
  font-size: 24px;
  margin-bottom: 4px;
}

.hint-text {
  color: #888;
  font-size: 13px;
  margin-bottom: 24px;
}

.control-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.control-bar label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.control-bar input {
  padding: 6px 12px;
  border: 1px solid #444;
  border-radius: 6px;
  background: #1a1a2e;
  color: #fff;
  font-size: 14px;
  width: 180px;
}

.status-bar {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  font-size: 13px;
  color: #888;
}

.status {
  color: #4facfe;
}

.video-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.video-item {
  position: relative;
}

.video-label {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 1;
}

.video-item video {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

@media (max-width: 640px) {
  .video-container {
    grid-template-columns: 1fr;
  }
}
</style>
