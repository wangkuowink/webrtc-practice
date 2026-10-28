/**
 * RTCClient - WebRTC 客户端封装
 *
 * 封装了 RTCPeerConnection 的核心流程：
 * 1. 创建本地媒体流 (getUserMedia)
 * 2. 创建 PeerConnection 并设置 ICE 事件
 * 3. 创建 Offer → 设置本地描述 → 通过信令发送给对端
 * 4. 收到 Offer → 创建 Answer → 设置本地描述 → 通过信令回传
 * 5. 收到 ICE Candidate → 加入候选列表
 * 6. 远端流通过 track 事件获取
 */

import type { SignalMessage } from '../types/signal'
import { SignalType } from '../types/signal'

/** 回调函数集合 */
export interface RTCClientCallbacks {
  /** 收到远端媒体流 */
  onRemoteStream?: (stream: MediaStream) => void
  /** 本地 ICE 候选就绪（需通过信令发送给对端） */
  onIceCandidate?: (candidate: RTCIceCandidateInit, to: string) => void
  /** 收到 Offer（作为被叫） */
  onOffer?: (sdp: RTCSessionDescriptionInit, from: string) => void
  /** 连接状态变化 */
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void
  /** ICE 连接状态变化 */
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void
}

/** 信令发送函数 */
export type SendSignalFn = (message: SignalMessage) => void

export class RTCClient {
  private pc: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
  private peerId: string = ''
  private sendSignal: SendSignalFn
  private callbacks: RTCClientCallbacks

  /** STUN 服务器配置，用于 NAT 穿透 */
  private static readonly ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]

  constructor(sendSignal: SendSignalFn, callbacks: RTCClientCallbacks = {}) {
    this.sendSignal = sendSignal
    this.callbacks = callbacks
  }

  /** 设置对端 ID */
  setPeerId(id: string) {
    this.peerId = id
  }

  /** 获取本地媒体流 */
  async getLocalStream(video = true, audio = true): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: video
        ? { width: 640, height: 480, facingMode: 'user' }
        : false,
      audio,
    })
    this.localStream = stream
    return stream
  }

  /** 创建 PeerConnection 并绑定事件 */
  private createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: RTCClient.ICE_SERVERS,
    })

    // 添加本地轨道
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!)
      })
    }

    // 监听远端轨道
    pc.ontrack = (event: RTCTrackEvent) => {
      const stream = event.streams[0]
      this.remoteStream = stream
      this.callbacks.onRemoteStream?.(stream)
    }

    // 监听 ICE 候选
    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        this.callbacks.onIceCandidate?.(
          event.candidate.toJSON(),
          this.peerId,
        )
      }
    }

    // 连接状态
    pc.onconnectionstatechange = () => {
      this.callbacks.onConnectionStateChange?.(pc.connectionState)
    }

    // ICE 连接状态
    pc.oniceconnectionstatechange = () => {
      this.callbacks.onIceConnectionStateChange?.(pc.iceConnectionState)
    }

    return pc
  }

  /** 作为主叫：创建 Offer 并发送 */
  async createOffer(): Promise<void> {
    this.pc = this.createPeerConnection()
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    this.sendSignal({
      type: SignalType.OFFER,
      to: this.peerId,
      sdp: offer,
    })
  }

  /** 作为被叫：收到 Offer 后创建 Answer */
  async handleOffer(sdp: RTCSessionDescriptionInit): Promise<void> {
    this.pc = this.createPeerConnection()
    await this.pc.setRemoteDescription(sdp)
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    this.sendSignal({
      type: SignalType.ANSWER,
      to: this.peerId,
      sdp: answer,
    })
  }

  /** 收到 Answer 后设置远端描述 */
  async handleAnswer(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (this.pc) {
      await this.pc.setRemoteDescription(sdp)
    }
  }

  /** 收到 ICE Candidate 并添加 */
  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.pc) {
      await this.pc.addIceCandidate(candidate)
    }
  }

  /** 获取连接状态 */
  get connectionState(): RTCPeerConnectionState | null {
    return this.pc?.connectionState ?? null
  }

  /** 关闭连接并释放资源 */
  close() {
    if (this.pc) {
      this.pc.close()
      this.pc = null
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop())
      this.localStream = null
    }
    this.remoteStream = null
  }
}
