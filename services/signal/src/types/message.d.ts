export type Message<TMessageType = string, TPayload = any> = {
	type: TMessageType
	payload: TPayload
	timestamp?: number
	target?: string
}

export type AllMessage =
	| Message<"register", { userId: string }>
	| Message<"registered", { userId: string } & ResponsePayload>
	| Message<"unregister", { userId: string }>
	| Message<"unregistered", { userId: string } & ResponsePayload>
	| Message<"joinRoom", { userId: string; roomId: string }>
	| Message<"joinedRoom", { userId: string; roomId: string } & ResponsePayload>
	| Message<"joinCodeIssue", { userId: string; roomId: string; ttl?: number }>
	| Message<"joinCodeIssued", { userId: string; roomId: string; joinCode: string; ttl?: number } & ResponsePayload>
	| Message<"joinRoomWithCode", { userId: string; joinCode: string }>
	| Message<"leaveRoom", { userId: string; roomId: string }>
	| Message<"leftRoom", { userId: string; roomId: string } & ResponsePayload>
	| Message<"offer", { from: string, to: string, sdp: any } & ResponsePayload>
	| Message<"answer", { from: string, to: string, sdp: any } & ResponsePayload>
	| Message<"candidate", { from: string, to: string, candidate: any } & ResponsePayload>

export interface ResponsePayload {
	success: boolean
	responseCode?: number
	message?: string
}
