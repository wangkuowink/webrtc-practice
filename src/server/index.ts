/**
 * WebSocket 信令服务器
 *
 * WebRTC 本身不包含信令协议，需要自行实现信令交换。
 * 本服务器使用 WebSocket 实现简单的房间机制：
 * - 用户加入房间后，获取房间内其他用户列表
 * - 用户之间通过服务器中转 SDP 和 ICE Candidate
 *
 * 通信流程：
 *   A.join → server → A: peers(B)
 *   A → server → offer → B
 *   B → server → answer → A
 *   A/B → server → ice-candidate → B/A（双向）
 */

import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import { SignalType, type SignalMessage } from '../types/signal'

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

/** 房间 -> 用户集合 */
const rooms = new Map<string, Set<WebSocket>>()

/** 为每个 WebSocket 绑定用户 ID 和房间 ID */
interface ClientMeta {
  id: string
  room: string
}
const clientMeta = new WeakMap<WebSocket, ClientMeta>()

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

function broadcast(room: string, message: SignalMessage, exclude?: WebSocket) {
  const members = rooms.get(room)
  if (!members) return
  const data = JSON.stringify(message)
  members.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
}

function sendTo(ws: WebSocket, message: SignalMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message))
  }
}

wss.on('connection', (ws: WebSocket) => {
  const id = generateId()
  let currentRoom = ''

  ws.on('message', (raw: Buffer) => {
    let msg: SignalMessage
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return
    }

    switch (msg.type) {
      case SignalType.JOIN: {
        // 离开旧房间
        if (currentRoom) {
          const oldRoom = rooms.get(currentRoom)
          oldRoom?.delete(ws)
          broadcast(currentRoom, {
            type: SignalType.LEAVE,
            from: id,
            room: currentRoom,
          })
        }

        // 加入新房间
        const room = msg.room || 'default'
        currentRoom = room
        clientMeta.set(ws, { id, room })

        if (!rooms.has(room)) {
          rooms.set(room, new Set())
        }
        const members = rooms.get(room)!

        // 通知房间内已有用户：有新人加入
        broadcast(room, { type: SignalType.JOIN, from: id, room }, ws)

        // 告诉新用户房间内现有用户
        const peers = Array.from(members)
          .map((c) => clientMeta.get(c)?.id)
          .filter(Boolean) as string[]
        sendTo(ws, { type: SignalType.PEERS, from: 'server', room, data: peers })

        members.add(ws)
        break
      }

      case SignalType.OFFER:
      case SignalType.ANSWER:
      case SignalType.ICE_CANDIDATE:
      case SignalType.REJECT: {
        // 转发给目标用户
        const meta = clientMeta.get(ws)
        if (!meta) return
        const { room } = meta
        const members = rooms.get(room)
        if (!members) return
        for (const client of members) {
          const peerMeta = clientMeta.get(client)
          if (peerMeta?.id === msg.to) {
            sendTo(client, { ...msg, from: id })
            break
          }
        }
        break
      }
    }
  })

  ws.on('close', () => {
    if (currentRoom) {
      const members = rooms.get(currentRoom)
      members?.delete(ws)
      broadcast(currentRoom, {
        type: SignalType.LEAVE,
        from: id,
        room: currentRoom,
      })
      if (members?.size === 0) {
        rooms.delete(currentRoom)
      }
    }
    clientMeta.delete(ws)
  })

  ws.on('error', () => {
    clientMeta.delete(ws)
  })
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

const PORT = 3000
server.listen(PORT, () => {
  console.log(`✅ 信令服务器已启动: http://localhost:${PORT}`)
  console.log(`   WebSocket 地址: ws://localhost:${PORT}/ws`)
})
