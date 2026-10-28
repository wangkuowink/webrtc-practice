<script setup lang="ts">
const topics = [
  { title: '1对1视频通话', desc: '最经典的 WebRTC 场景，学习 Offer/Answer 握手、ICE 候选交换', path: '/p2p' },
  { title: '多 人会议（待实现）', desc: '使用 Mesh / SFU 架构实现多人通话', path: '' },
  { title: '数据通道（待实现）', desc: '使用 RTCDataChannel 传输文本、文件', path: '' },
]

function go(path: string) {
  if (path) window.location.hash = ''
}
</script>

<template>
  <div class="home-container">
    <h1 class="title">WebRTC 练习项目</h1>
    <p class="subtitle">技术栈：Vite + Vue 3 + TypeScript + WebSocket 信令服务器</p>
    <div class="topics">
      <div v-for="topic in topics" :key="topic.title" class="topic-card card" @click="go(topic.path)">
        <h3>{{ topic.title }}</h3>
        <p>{{ topic.desc }}</p>
      </div>
    </div>

    <div class="hint card">
      <h3>💡 WebRTC 三步握手</h3>
      <ol>
        <li><strong>Offer</strong>：A 创建本地描述（媒体能力、编解码），通过信令发给 B</li>
        <li><strong>Answer</strong>：B 收到后设置远端描述，创建 Answer 回传给 A</li>
        <li><strong>ICE</strong>：双方各自收集网络候选地址，通过信令互相交换，找到最佳路径</li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px;
}

.title {
  font-size: 28px;
  margin-bottom: 8px;
}

.subtitle {
  color: #888;
  margin-bottom: 32px;
}

.topics {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.topic-card {
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s;
  border: 1px solid #333;
}

.topic-card:hover {
  transform: translateY(-2px);
  border-color: #4facfe;
}

.topic-card h3 {
  font-size: 16px;
  margin-bottom: 8px;
  color: #4facfe;
}

.topic-card p {
  font-size: 13px;
  color: #aaa;
  line-height: 1.6;
}

.hint {
  border: 1px solid #333;
}

.hint h3 {
  color: #4facfe;
  margin-bottom: 12px;
}

.hint ol {
  padding-left: 20px;
  line-height: 2;
  color: #ccc;
  font-size: 14px;
}
</style>
