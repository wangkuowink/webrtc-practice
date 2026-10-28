/**
 * SignalingClient - WebSocket 信令客户端
 *
 * 负责与信令服务器通信：
 * - 连接 / 断开
 * - 加入房间
 * - 收发信令消息
 */

import type { SignalMessage } from '../types/signal'

export class SignalingClient {
  private ws: WebSocket | null = null
  private url: string
  private onMessage?: (msg: SignalMessage) => void
  private onOpen?: () => void
  private onClose?: () => void

  constructor(url: string) {
    this.url = url
  }

  /** 设置回调 */
  setCallbacks(callbacks: {
    onOpen?: () => void
    onMessage?: (msg: SignalMessage) => void
    onClose?: () => void
  }) {
    this.onOpen = callbacks.onOpen
    this.onMessage = callbacks.onMessage
    this.onClose = callbacks.onClose
  }

  /** 连接 WebSocket */
  connect() {
    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      this.onOpen?.()
    }

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data) as SignalMessage
        this.onMessage?.(msg)
      } catch {
        console.error('解析信令消息失败')
      }
    }

    this.ws.onclose = () => {
      this.onClose?.()
    }

    this.ws.onerror = (err) => {
      console.error('WebSocket 错误:', err)
    }
  }

  /** 发送消息 */
  send(message: SignalMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  /** 断开连接 */
  disconnect() {
    this.ws?.close()
    this.ws = null
  }

  /** 获取连接状态 */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
