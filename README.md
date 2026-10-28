# WebRTC 练习项目

技术栈：**Vite + Vue 3 + TypeScript + WebSocket 信令服务器**

## 快速开始

```bash
npm install
npm run dev
```

同时启动前端开发服务器 (5173) 和 WebSocket 信令服务器 (3000)。

## 项目结构

```
src/
├── server/           # 信令服务器 (Node.js + ws)
│   └── index.ts
├── lib/              # WebRTC 核心封装
│   ├── RTCClient.ts      # RTCPeerConnection 封装
│   └── SignalingClient.ts # WebSocket 信令客户端
├── types/            # 类型定义
│   └── signal.ts        # 信令消息类型
├── views/            # 页面
│   ├── HomeView.vue     # 首页
│   └── P2PView.vue      # 1对1视频通话
├── router/           # 路由
├── assets/           # 静态资源
├── App.vue           # 根组件
└── main.ts           # 入口
```

## WebRTC 核心概念

### 1. SDP (Session Description Protocol)
描述媒体能力（编解码器、分辨率等）。通过 `createOffer` / `createAnswer` 生成，通过信令服务器交换。

### 2. ICE (Interactive Connectivity Establishment)
NAT 穿透机制。通过 STUN 服务器发现公网地址，收集候选后通过信令交换，找到最优连接路径。

### 3. 连接流程
```
A (主叫)                    信令服务器                    B (被叫)
   |                            |                            |
   |--- JOIN room ------------->|--- PEERS [B] ----------->|
   |                            |--- JOIN (A) ------------->|
   |                            |                            |
   |--- OFFER (sdp) ----------->|--- OFFER (sdp) --------->|
   |                            |                            |
   |<-- ANSWER (sdp) ----------|<--- ANSWER (sdp) ---------|
   |                            |                            |
   |<-- ICE candidate ---------|<-- ICE candidate ---------|
   |--- ICE candidate -------->|--- ICE candidate -------->|
   |                            |                            |
   |<======= P2P 媒体流直连 (不再经过服务器) ===========>|
```

## 练习内容

- [x] 1对1视频通话 (P2PView.vue)
- [ ] 多人会议 (Mesh / SFU)
- [ ] 数据通道 (RTCDataChannel)
- [ ] 屏幕共享 (getDisplayMedia)
