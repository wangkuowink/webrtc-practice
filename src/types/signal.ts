/**
 * 信令消息类型定义
 * WebRTC 需要通过信令服务器交换以下信息：
 * 1. SDP (Session Description Protocol) - 描述媒体能力（编解码器等）
 * 2. ICE Candidates - 网络连接候选地址
 */

/** 信令消息类型 */
export enum SignalType {
  /** 新用户加入房间 */
  JOIN = 'join',
  /** 用户离开房间 */
  LEAVE = 'leave',
  /** 房间内现有用户列表（服务端返回） */
  PEERS = 'peers',
  /** 发起 Offer（A 向 B 发起通话请求） */
  OFFER = 'offer',
  /** 回复 Answer（B 接受通话） */
  ANSWER = 'answer',
  /** 交换 ICE Candidate（网络地址候选） */
  ICE_CANDIDATE = 'ice-candidate',
  /** 拒绝通话 */
  REJECT = 'reject',
}

/** 信令消息结构 */
export interface SignalMessage {
  type: SignalType
  /** 发送者 ID */
  from?: string
  /** 接收者 ID */
  to?: string
  /** 房间 ID */
  room?: string
  /** SDP 描述（用于 offer/answer） */
  sdp?: RTCSessionDescriptionInit
  /** ICE 候选地址 */
  candidate?: RTCIceCandidateInit
  /** 附加数据 */
  data?: unknown
}

/** 房间内用户信息 */
export interface PeerInfo {
  id: string
}
