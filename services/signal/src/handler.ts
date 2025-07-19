import { WebSocket, WebSocketServer } from "ws"
import { createClient } from "redis"
import type { RedisClientType } from "redis"
import type { AllMessage } from "./types/message.js"
import type { RoomMeta } from "./types/redis.js"
import { generateJoinCode } from "./utils.js"

const JOIN_CODE_TTL_SECONDS = 3600

class RedisClient {
	pub: RedisClientType
	sub: RedisClientType

	constructor(redisUrl: string) {
		this.pub = createClient({ url: redisUrl })
		this.sub = this.pub.duplicate()

		this.pub.on("error", (err) => {
			console.error("Redis Pub Error:", err)
		})

		this.sub.on("error", (err) => {
			console.error("Redis Sub Error:", err)
		})
	}

	async connect() {
		console.log("Connecting to Redis...")
		try {
			await Promise.all([this.pub.connect(), this.sub.connect()])
			console.log("...connected to Redis!")
		} catch (err) {
			console.error("Redis connection error:", err)
			process.exit(1)
		}
	}
}

export class Server {
	private hostName: string
	private wss: WebSocketServer
	private wsMap = new Map<string, WebSocket>()
	private intervalMap = new Map<WebSocket, NodeJS.Timeout>()
	private redisClient: RedisClient
	private port: number

	constructor(hostName: string, redisUrl: string, webSocketPort: number = 3000) {
		this.hostName = hostName
		this.wss = new WebSocketServer({ port: webSocketPort })
		this.redisClient = new RedisClient(redisUrl)
		this.port = webSocketPort
	}

	private async getHostName(userId: string): Promise<string | null> {
		const hostName = await this.redisClient.pub.get(`user:${userId}`)
		return hostName as string | null
	}

	async start() {
		await this.redisClient.connect()
		await this.redisClient.sub.subscribe(`host:${this.hostName}`, async (data) => {
			const message = JSON.parse(data)
			await this.handleChannelMessage(message)
		})
		this.wss.on("connection", (ws) => {
			ws.on("message", async (data) => {
				const message = JSON.parse(data.toString())
				await this.handleSignalingMessage(ws, message)
			})
			ws.on("close", () => {
				const interval = this.intervalMap.get(ws)
				if (interval) {
					clearInterval(interval)
					this.intervalMap.delete(ws)
				}
			})
			ws.on("error", console.error)
		})
		console.log(`WebSocket server is running at port ${this.port}`)
	}

	private async handleChannelMessage(message: AllMessage) {
		let ws: WebSocket | null = null
		switch (message.type) {
			case "joinedRoom":
				ws = this.wsMap.get(message.target)
				ws?.send(
					JSON.stringify({
						type: "joinedRoom",
						payload: {
							userId: message.payload.userId,
							roomId: message.payload.roomId,
							success: true,
						},
						timestamp: Date.now(),
					})
				)
				break

			case "leftRoom":
				ws = this.wsMap.get(message.target)
				ws?.send(
					JSON.stringify({
						type: "leftRoom",
						payload: {
							userId: message.payload.userId,
							roomId: message.payload.roomId,
							success: true,
						},
						timestamp: Date.now(),
					})
				)
				break

			case "offer":
				ws = this.wsMap.get(message.target)
				ws?.send(
					JSON.stringify({
						type: message.type,
						payload: message.payload,
						timestamp: Date.now(),
					})
				)
				break

			case "answer":
				ws = this.wsMap.get(message.target)
				ws?.send(
					JSON.stringify({
						type: message.type,
						payload: message.payload,
						timestamp: Date.now(),
					})
				)
				break

			case "candidate":
				ws = this.wsMap.get(message.target)
				ws?.send(
					JSON.stringify({
						type: message.type,
						payload: message.payload,
						timestamp: Date.now(),
					})
				)
				break

			default:
				console.error(`Channel message type ${message.type} unknown.`)
		}
	}

	private async handleSignalingMessage(ws: WebSocket, message: AllMessage) {
		let resMessage: AllMessage | null = null
		let joinCode: string | null = null
		let joinCodeTtl: number | null = null

		switch (message.type) {
			case "register":
				this.wsMap.set(message.payload.userId, ws)
				await this.redisClient.pub.set(`user:${message.payload.userId}`, this.hostName)
				resMessage = {
					type: "registered",
					payload: {
						...message.payload,
						success: true,
					},
					timestamp: Date.now(),
				}
				break

			case "unregister":
				this.wsMap.delete(message.payload.userId)
				await this.redisClient.pub.del(`user:${message.payload.userId}`)
				resMessage = {
					type: "unregistered",
					payload: {
						...message.payload,
						success: true,
					},
					timestamp: Date.now(),
				}
				break

			case "joinRoom":
				await this.redisClient.pub.sAdd(
					`room:${message.payload.roomId}`,
					message.payload.userId
				)
				const roomMeta: RoomMeta = {
					ownerId: message.payload.userId,
					createdAt: Date.now(),
				}
				await this.redisClient.pub.hSet(`roomMeta:${message.payload.roomId}`, roomMeta)
				resMessage = {
					type: "joinedRoom",
					payload: {
						...message.payload,
						success: true,
					},
					timestamp: Date.now(),
				}
				break

			case "joinCodeIssue":
				joinCode = generateJoinCode()
				joinCodeTtl = message.payload.ttl || JOIN_CODE_TTL_SECONDS
				await this.redisClient.pub.set(`joinCode:${joinCode}`, message.payload.roomId, {
					EX: joinCodeTtl + 5,
				})
				resMessage = {
					type: "joinCodeIssued",
					payload: {
						...message.payload,
						joinCode,
						ttl: joinCodeTtl,
						success: true,
					},
					timestamp: Date.now(),
				}
				const interval = setInterval(async () => {
					const joinCode = generateJoinCode()
					await this.redisClient.pub.set(`joinCode:${joinCode}`, message.payload.roomId, {
						EX: joinCodeTtl + 5,
					})
					ws.send(
						JSON.stringify({
							type: "joinCodeIssued",
							payload: {
								...message.payload,
								joinCode,
								ttl: joinCodeTtl,
								success: true,
							},
							timestamp: Date.now(),
						})
					)
				}, joinCodeTtl * 1000)
				this.intervalMap.set(ws, interval)
				break

			case "joinRoomWithCode":
				const roomId = (await this.redisClient.pub.get(
					`joinCode:${message.payload.joinCode}`
				)) as string | null
				if (roomId) {
					await this.redisClient.pub.sAdd(`room:${roomId}`, message.payload.userId)
					resMessage = {
						type: "joinedRoom",
						payload: {
							userId: message.payload.userId,
							roomId,
							success: true,
						},
						timestamp: Date.now(),
					}
				} else {
					resMessage = {
						type: "joinedRoom",
						payload: {
							userId: message.payload.userId,
							roomId: "",
							success: false,
							message: "Join code is invalid or expired.",
						},
						timestamp: Date.now(),
					}
				}
				break

			case "leaveRoom":
				await this.redisClient.pub.sRem(
					`room:${message.payload.roomId}`,
					message.payload.userId
				)
				const numMembers = await this.redisClient.pub.sMembers(
					`room:${message.payload.roomId}`
				)
				if (numMembers.length === 0) {
					await this.redisClient.pub.del(`room:${message.payload.roomId}`)
					await this.redisClient.pub.del(`roomMeta:${message.payload.roomId}`)
				}
				resMessage = {
					type: "leftRoom",
					payload: {
						...message.payload,
						success: true,
					},
					timestamp: Date.now(),
				}
				break

			case "offer":
				break

			case "answer":
				break

			case "candidate":
				break

			default:
				console.error(`Channel message type ${message.type} unknown.`)
		}

		if (resMessage) {
			ws.send(JSON.stringify(resMessage))
		}

		if (resMessage && (resMessage.type === "joinedRoom" || resMessage.type === "leftRoom")) {
			const members = await this.redisClient.pub.sMembers(`room:${resMessage.payload.roomId}`)
			members
				.filter((memberId) => memberId !== resMessage.payload.userId)
				.forEach(async (memberId) => {
					const hostName = await this.getHostName(memberId)
					if (hostName) {
						await this.redisClient.pub.publish(
							`host:${hostName}`,
							JSON.stringify({
								...resMessage,
								target: memberId,
							})
						)
					}
				})
		}

		if (message.type === "offer" || message.type === "answer" || message.type === "candidate") {
			const hostName = await this.getHostName(message.payload.to)
			if (hostName) {
				await this.redisClient.pub.publish(
					`host:${hostName}`,
					JSON.stringify({ ...message, target: message.payload.to })
				)
			}
		}
	}
}
