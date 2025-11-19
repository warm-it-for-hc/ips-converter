import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { decryptData, encryptData, resourceReclassify, severityColors } from '@/lib/avatar'
import { getConfig } from '@/lib/config'
import type { ConvertResponse, LoginDataResponse } from '@/lib/response'
import type { SignalingMessage } from '@/lib/signal'
import { buildRtcConfiguration, DEFAULT_RTC_CONFIGURATION } from '@/lib/webrtc'
import { AlertTriangle, CheckCircle, CheckCircle2, Info, XCircle } from 'lucide-react'

const Result = () => {
	const location = useLocation()
	const navigate = useNavigate()
	const state = location.state

	const wsRef = useRef<WebSocket | null>(null)
	const qrDivRef = useRef<HTMLDivElement | null>(null)
	const peerMap = useRef<Map<string, RTCPeerConnection>>(new Map())
	const offerRef = useRef<RTCSessionDescriptionInit>(undefined)
	const toUserIdSet = useRef<Set<string>>(new Set())
	const dataChannelMap = useRef<Map<string, RTCDataChannel>>(new Map())
	const avatarRef = useRef<HTMLIFrameElement>(null)

	const [convertResponse, setConvertResponse] = useState<ConvertResponse | null>(null)
	const [userId, setUserId] = useState<string | null>(uuidv4())
	const [roomId, setRoomId] = useState<string | null>(uuidv4())
	const [joinCode, setJoinCode] = useState<string | null>(null)
	const [isSticky, setIsSticky] = useState<boolean>(false)
	const [toasts, setToasts] = useState<any[]>([])

	const [clientUrl, setClientUrl] = useState<string>('')
	const [rtcConfig, setRtcConfig] = useState<RTCConfiguration | null>(null)

	const avatarUrl = import.meta.env.VITE_AVATAR_URL ?? "https://www.vis-term.com/avatar-react-web-three"

	useEffect(() => {
		let mounted = true
		const envClientUrl = import.meta.env.VITE_CLIENT_PUBLIC_URL

		getConfig()
			.then(config => {
				if (!mounted) return
				setClientUrl(envClientUrl || config.CLIENT_PUBLIC_URL || '')
				setRtcConfig(buildRtcConfiguration(config))
			})
			.catch(() => {
				if (!mounted) return
				setClientUrl(envClientUrl || '')
				setRtcConfig(DEFAULT_RTC_CONFIGURATION)
			})

		return () => {
			mounted = false
		}
	}, [])

	useEffect(() => {
		if (!state) {
			navigate('/upload')
			return
		}
		setConvertResponse(state.result)
	}, [navigate, state])

	// TODO: copy
	useEffect(() => {
		if (!convertResponse) return

		handleSubmit()
	}, [convertResponse])

	useEffect(() => {
		const handleScroll = () => {
			if (qrDivRef.current) {
				const { top } = qrDivRef.current.getBoundingClientRect()
				setIsSticky(top < 50)
			}
		}

		window.addEventListener('scroll', handleScroll, { passive: true })
		handleScroll()

		return () => {
			window.removeEventListener('scroll', handleScroll)
		}
	}, [])

	useEffect(() => {
		if (!state || !rtcConfig) {
			return
		}

		const convertPayload = state.result
		const ws = new WebSocket('/api/v1/signal')

		ws.onopen = () => {
			ws.send(
				JSON.stringify({
					type: 'register',
					payload: {
						userId,
					},
					timestamp: Date.now(),
				}),
			)

			ws.send(
				JSON.stringify({
					type: 'joinRoom',
					payload: {
						userId,
						roomId,
					},
					timestamp: Date.now(),
				}),
			)

			ws.send(
				JSON.stringify({
					type: 'joinCodeIssue',
					payload: {
						userId,
						roomId,
					},
					timestamp: Date.now(),
				}),
			)
		}

		ws.onmessage = event => {
			const message: SignalingMessage = JSON.parse(event.data)
			console.log('Received message:', message)

			switch (message.type) {
				case 'registered':
					break
				case 'joinedRoom':
					if (message.payload.userId !== userId) {
						const remoteUserId = message.payload.userId
						if (!peerMap.current.has(remoteUserId)) {
							const peer = new RTCPeerConnection(rtcConfig)
							peer.onicecandidate = event => {
								if (event.candidate) {
									wsRef.current?.send(
										JSON.stringify({
											type: 'candidate',
											payload: {
												from: userId,
												to: remoteUserId,
												candidate: event.candidate,
											},
											timestamp: Date.now(),
										}),
									)
								}
							}
							peerMap.current.set(remoteUserId, peer)

							const dataChannel = peer.createDataChannel('file')
							dataChannel.onopen = () => {
								console.log('Data channel opened for user', remoteUserId)
								dataChannel.send(JSON.stringify(convertPayload))
								console.log('Data sent over data channel')
							}
							dataChannel.onclose = () => {
								console.log('Data channel closed for user', remoteUserId)
							}
							dataChannelMap.current.set(remoteUserId, dataChannel)
						}

						toUserIdSet.current.add(remoteUserId)

						const toastId = uuidv4()
						setToasts(toasts => [
							...toasts,
							{
								id: toastId,
								type: 'info',
								message: `Code has been scanned by ${remoteUserId}.`,
								disappearing: false,
							},
						])
						setTimeout(() => {
							setToasts(toasts =>
								toasts.map(t => (t.id === toastId ? { ...t, disappearing: true } : t)),
							)
							setTimeout(() => {
								setToasts(toasts => toasts.filter(t => t.id !== toastId))
							}, 400)
						}, 2500)
						;(async () => {
							const peer = peerMap.current.get(remoteUserId)
							if (peer) {
								const offer = await peer.createOffer()
								await peer.setLocalDescription(offer)
								offerRef.current = offer
								ws.send(
									JSON.stringify({
										type: 'offer',
										payload: {
											from: userId,
											to: remoteUserId,
											sdp: offer?.sdp,
										},
										timestamp: Date.now(),
									}),
								)
							}
						})()
					}
					break
				case 'joinCodeIssued':
					setJoinCode(message.payload.joinCode)
					break
				case 'leftRoom':
					// if (message.payload.userId !== userId) {
					//   alert(`User ${message.payload.userId} has left the room.`);
					// }
					break
				case 'answer':
					{
						const fromUserId = message.payload.from
						const peer = peerMap.current.get(fromUserId)
						if (peer) {
							peer.setRemoteDescription(
								new RTCSessionDescription({
									type: 'answer',
									sdp: message.payload.sdp,
								}),
							)
						}
					}
					break
				case 'candidate':
					{
						const fromUserId = message.payload.from
						const peer = peerMap.current.get(fromUserId)
						if (peer && message.payload.candidate) {
							peer.addIceCandidate(message.payload.candidate)
						}
					}
					break
				default:
					console.warn('Unhandled message type:', message.type)
			}
		}

		ws.onclose = () => {}
		ws.onerror = () => {}

		wsRef.current = ws

		return () => {
			ws.close()
		}
	}, [rtcConfig, roomId, state, userId])

	useEffect(() => {
		const handleBeforeUnload = () => {
			if (wsRef.current?.readyState === WebSocket.OPEN) {
				wsRef.current.send(
					JSON.stringify({
						type: 'leaveRoom',
						payload: {
							userId,
							roomId,
						},
						timestamp: Date.now(),
					}),
				)
				wsRef.current.send(
					JSON.stringify({
						type: 'unregister',
						payload: {
							userId,
						},
						timestamp: Date.now(),
					}),
				)
				wsRef.current.close()
			}
		}

		window.addEventListener('beforeunload', handleBeforeUnload)
		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload)
		}
	}, [roomId, userId])

	if (!convertResponse) return null

	const formatDate = (v: number | string) => {
		if (typeof v === 'number') {
			const ts = v > 1e12 ? v : v * 1000
			return new Date(ts).toLocaleString()
		}
		return v
	}

	// TODO: copy
	const handleSubmit = async () => {
		if (!convertResponse) return

		try {
			const raw = JSON.stringify(convertResponse.data)
			console.log("TODO: passed raw ********************************")
			console.log(`${raw}`)
			console.log("TODO: passed raw ********************************")

			JSON.parse(raw)
			console.log(raw)
		} catch (error) {
			alert('Parsing error')
			return
		}

		try {
			const paramsAuthenticate = {
				email: 'ips001@ips001.com',
				password: 'ips001',
			}
			console.log(`TODO: paramsAuth ${JSON.stringify(paramsAuthenticate)}`)

			const response = await fetch(`https://www.vis-term.com/avatar_web_gateway_operate/api-avc/v1/auth/user/signin`, {
				method: 'POST',
				body: JSON.stringify(paramsAuthenticate),
				headers: { 'Content-Type': 'application/json' },
			})

			// 헤더에 토큰, response에 encrypt key
			console.log(`TODO: res ${JSON.stringify(response)}`)
			const responseJson = await response.json()
			console.log(`TODO: resjson ${JSON.stringify(responseJson)}`)

			const token = response.headers.get('Authorization')
			console.log(`TODO: token ${token}`)
			const results = JSON.parse(responseJson.results) as LoginDataResponse
			console.log(`TODO: as logindataresponse ${results}`)

			console.log("TODO: ********************************")
			console.log("TODO: lc storage token and enctypt")
			console.log(`TODO: res ${results}`)
			console.log(`TODO: resjson ${responseJson}`)
			console.log(`TODO: enc ${results.encrypt_key}`)

			console.log("TODO: ********************************")

			if (!token || !results) return

			console.log("TODO: ********************************")
			console.log("TODO: lc storage token and enctypt")
			console.log(`TODO: res ${results}`)
			console.log(`TODO: resjson ${responseJson}`)
			console.log(`TODO: token ${token}`)
			console.log(`TODO: enc ${results.encrypt_key}`)

			localStorage.setItem('token', token)
			localStorage.setItem('encryptKey', results.encrypt_key)
			console.log("TODO: ********************************")

			handleResponseData()
		} catch (error) {
			alert('An error occurred')

			localStorage.removeItem('token')
			localStorage.removeItem('encryptKey')

			return
		}
	}

	// 인증 API 호출 -> 토큰, encrypt key 로컬 스토리지 저장 -> Fhir to AVC json 변환 API 호출 -> crypto로 암/복호화 -> ifame post message
	// TODO: copy
	const handleResponseData = async () => {
		console.log("TODO: ********************************************")
		// const param = JSON.parse(convertResponse.data) as [key: string, string | number | null]
		const response = await fetch(`https://www.vis-term.com/avatar_web_gateway_operate/api-avc/v1/fhir/avc-data-converter-pcp`, {
			method: 'POST',
			body: JSON.stringify(convertResponse.data),
			headers: { 'Content-Type': 'application/json' },
		})
		const responseJson = await response.json()

		console.log(`TODO: resposejson -> ${responseJson}`) 

		const encryptKey = localStorage.getItem('encryptKey')

		if (!encryptKey || !responseJson || !avatarRef.current) return

		// // 1. 복호화
		const decryption = decryptData({
			encryptKey,
			type: 'decrypt',
			avcJson: responseJson.results,
		})

		if (!decryption) return

		// 2. 가공
		// avc json으로 변환된 fhir json을 assest 데이터로 변환
		const reclassifiedData = resourceReclassify(decryption)

		if (!reclassifiedData) return

		console.log("TODO: ********************************************")

		const assetData = Object.fromEntries(
			Object.entries(reclassifiedData.assets).map(([key, value]) => {
				if (Array.isArray(value) && value.length > 0) {
					const filtered = value
						.filter(item => item.assetKey.opt_disease.length > 0)
						.map(item => {
							const asset = item.assetKey
							const colorRgb = severityColors(
								Math.max(...asset.opt_disease.map((disease: number) => disease)),
							)

							return {
								assetKey: {
									anatomy_code: asset.anatomy_code,
									asset_code: asset.asset_code,
									body_system_code: asset.body_system_code,
									color_rgb: colorRgb.rgb,
									opt_display: asset.opt_display,
								},
							}
						})

					return [key, filtered]
				}

				// 배열이 아니거나 빈 배열이면 그대로 유지
				return [key, value]
			}),
		)

		console.log(`TODO: supposed to be assetData -> ${assetData}`) 
		console.log("TODO: ********************************************")
		// 3. 암호화
		const decryptionEncrypt = encryptData({
			encryptKey,
			type: 'encrypt',
			avcJson: JSON.stringify([assetData]),
		})

		if (!decryptionEncrypt) return

		// 4. postMesage
		avatarRef.current.contentWindow?.postMessage(
			JSON.stringify({
				domain: 'asset-web',
				msg: 'assetObj request!',
				data: {
					asset: decryptionEncrypt,
					encrypt_key: encryptKey,
				},
			}),
			avatarUrl,
		)
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
			<Card className="w-full max-w-4xl mx-auto shadow-lg border-0 backdrop-blur-sm">
				<CardHeader className="flex flex-col items-center mt-20">
					<CheckCircle className="h-12 w-12 text-green-500" />
					<CardTitle className="text-xl flex items-center">QR Code Created</CardTitle>
				</CardHeader>
				<CardContent>
					<div
						ref={qrDivRef}
						className="flex flex-col items-center gap-1 mb-20 sticky top-0 bg-white p-2"
						onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
						style={{
							height: isSticky ? 80 : 250,
							transition: '0.3s cubic-bezier(0.2, 0, 0.2, 1)',
						}}
					>
						<QRCodeSVG
							width="100%"
							height="100%"
							value={`${clientUrl}/share?joinCode=${joinCode}`}
						/>
						<span
							className={`text-xs text-slate-500 font-mono transition-opacity duration-200 ${
								joinCode ? 'opacity-100' : 'opacity-0'
							}`}
						>
							{joinCode ? (
								<>
									{joinCode.slice(0, 3)}&middot;{joinCode.slice(3, 6)}
								</>
							) : (
								'\u00A0'
							)}
						</span>
					</div>
					<div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-4">
						<div className="text-blue-900 text-base font-semibold">{convertResponse.version}</div>
						<div className="text-xs text-slate-500 mt-1">
							{formatDate(convertResponse.createdAt)}
						</div>
					</div>

					{/* 아바타차트 */}
					<div style={{ width: '100%', height: 500 }}>
						<iframe
							ref={avatarRef}
							src={avatarUrl}
							title="WebView"
							style={{ width: '100%', height: '100%' }}
						/>
					</div>

					<div className="p-4 max-h-[100vh] overflow-auto bg-slate-900 rounded-lg">
						<pre className="text-sm text-green-400 font-mono leading-relaxed">
							{JSON.stringify(convertResponse.data, null, 2)}
						</pre>

					</div>
				</CardContent>
			</Card>
			{/* Toasts Floating Bottom Stacked */}
			<div className="fixed bottom-6 left-0 w-full z-50 pointer-events-none flex flex-col items-center gap-3">
				{toasts.map(toast => {
					let icon = <Info className="w-8 h-8 mr-4 text-blue-400" />
					if (toast.type === 'success')
						icon = <CheckCircle2 className="w-8 h-8 mr-4 text-green-400" />
					if (toast.type === 'error') icon = <XCircle className="w-8 h-8 mr-4 text-red-400" />
					if (toast.type === 'warning')
						icon = <AlertTriangle className="w-8 h-8 mr-4 text-yellow-400" />
					return (
						<div
							key={toast.id}
							className={`flex items-center min-w-[250px] max-w-[350px] bg-slate-900/95 text-white px-6 py-3 rounded-lg shadow-lg pointer-events-auto transition-all duration-[400ms] ease-in-out ${
								toast.disappearing ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
							}`}
						>
							{icon}
							<span className="text-sm">{toast.message}</span>
						</div>
					)
				})}
			</div>
		</div>
	)
}

export default Result
