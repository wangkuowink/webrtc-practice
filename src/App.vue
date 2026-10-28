<script setup lang="ts">
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <router-link to="/" class="logo">WebRTC 练习</router-link>
      <nav class="nav-links">
        <router-link to="/">首页</router-link>
        <router-link to="/p2p">1对1视频通话</router-link>
      </nav>
    </header>
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  background: #1a1a2e;
  color: #fff;
}

.logo {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 20px;
}

.nav-links a {
  color: #ccc;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  color: #4facfe;
}

.app-main {
  flex: 1;
  overflow: auto;
}
</style>
