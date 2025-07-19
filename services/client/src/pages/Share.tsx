import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { QrCode, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { v4 as uuidv4 } from "uuid";

import type { SignalingMessage } from "@/lib/signal";

const Share: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const joinCode = searchParams.get("joinCode");
  const code = searchParams.get("code");

  const wsRef = useRef<WebSocket>(undefined);
  const peerRef = useRef<RTCPeerConnection>(undefined);
  const answerRef = useRef<RTCSessionDescriptionInit>(undefined);

  const [userId, setUserId] = useState<string|null>(uuidv4());
  const [roomId, setRoomId] = useState<string|null>(null);
  const [receivedData, setReceivedData] = useState<string|null>(null);

  useEffect(() => {
    const peer = new RTCPeerConnection();

    peer.ondatachannel = (event) => {
      const channel = event.channel;
      channel.onopen = () => {
        console.log("Data channel opened");
      };
      channel.onmessage = (e) => {
        setReceivedData(e.data)
      };
      channel.onclose = () => {
        console.log("Data channel closed");
      };
    };

    peerRef.current = peer;
  }, [])

  useEffect(() => {
    const ws = new WebSocket("/api/v1/signal");

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "register",
        payload: {
          userId,
        },
        timestamp: Date.now(),
      }));

      if (joinCode) {
        ws.send(JSON.stringify({
          type: "joinRoomWithCode",
          payload: {
            userId,
            joinCode: joinCode,
          },
          timestamp: Date.now(),
        }));
      } else if (code) {
        ws.send(JSON.stringify({
          type: "joinRoom",
          payload: {
            userId,
            roomId: code,
          },
          timestamp: Date.now(),
        }));
      } else {
        console.error("No join code or room ID provided.");
      }
    }

    ws.onmessage = (event) => {
      const message: SignalingMessage = JSON.parse(event.data);
      switch (message.type) {
        case "registered":
          break;
        case "joinedRoom":
          if (message.payload.userId === userId) {
            setRoomId(message.payload.roomId);
          }
          // if (message.payload.userId !== userId) {
          //   alert(`User ${message.payload.userId} has joined the room.`);
          // }
          break;
        case "joinCodeIssued":
          break;
        case "leftRoom":
          // if (message.payload.userId !== userId) {
          //   alert(`User ${message.payload.userId} has left the room.`);
          // }
          break;
        case "offer":
          (async () => {
            await peerRef.current?.setRemoteDescription(new RTCSessionDescription({
              type: "offer",
              sdp: message.payload.sdp,
            }));
            const answer = await peerRef.current?.createAnswer();
            await peerRef.current?.setLocalDescription(answer);
            answerRef.current = answer;
            ws.send(JSON.stringify({
              type: "answer",
              payload: {
                from: userId,
                to: message.payload.from,
                sdp: answer?.sdp,
              },
              timestamp: Date.now(),
            }));
          })();
          break;
        case "candidate":
          peerRef.current?.addIceCandidate(
            new RTCIceCandidate(message.payload.candidate)
          )
        default:
          console.warn("Unhandled message type:", message.type);
      }
    }

    ws.onclose = () => {};
    ws.onerror = () => {};

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "leaveRoom",
          payload: {
            userId,
            roomId,
          },
          timestamp: Date.now(),
        }));
        wsRef.current.send(JSON.stringify({
          type: "unregister",
          payload: {
            userId,
          },
          timestamp: Date.now(),
        }));
        wsRef.current.close();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };

  }, [roomId, userId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <p>
                { JSON.stringify(joinCode) }
              </p>
              <p>
                { JSON.stringify(roomId) }
              </p>
              <p>
                { JSON.stringify(userId) }
              </p>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {roomId ? (
              <div className="flex flex-col items-center gap-6">
                <div className="bg-slate-900 rounded-lg px-8 py-6 shadow-inner border-2 border-blue-200 mb-2">
                  <span className="text-3xl font-mono tracking-widest text-blue-300 select-all">{joinCode}</span>
                </div>
                <div className="text-slate-700 text-center text-lg font-medium">
                  Welcome! Use this code to join or share your resource.
                </div>
                <Button
                  onClick={() => navigate("/")}
                  className="bg-blue-100 text-blue-700 hover:bg-blue-500 hover:text-white transition-colors duration-200 cursor-pointer mt-2"
                >
                  Go Home
                </Button>
              </div>
            ) : (
              <Alert className="border-red-200 bg-red-50 mt-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700 font-medium">
                  Sorry, we couldn't find your join code. Please try again or start over.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          { JSON.stringify(receivedData) }
        </Card>
      </div>
    </div>
  );
};

export default Share;