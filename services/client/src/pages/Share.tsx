import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { HeartHandshake, Info, QrCode } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { v4 as uuidv4 } from "uuid";
import type { SignalingMessage } from "@/lib/signal";
import { formatDate } from "@/lib/utils";
import { getConfig } from "@/lib/config";

const Share: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const joinCode = searchParams.get("joinCode");
  const code = searchParams.get("code");

  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  const [showInfoSlide, setShowInfoSlide] = useState(false);

  const wsRef = useRef<WebSocket>(undefined);
  const peerRef = useRef<RTCPeerConnection>(undefined);
  const answerRef = useRef<RTCSessionDescriptionInit>(undefined);

  const [userId] = useState<string|null>(uuidv4());
  const [roomId, setRoomId] = useState<string|null>(null);
  const [receivedData, setReceivedData] = useState<any|null>(null);

  // AirDrop-style animation state
  const [showSlideIn, setShowSlideIn] = useState(false);

  const [clientUrl, setClientUrl] = useState<string>("");


  useEffect(() => {
    getConfig().then(config => {
      setClientUrl(import.meta.env.VITE_CLIENT_PUBLIC_URL || config.CLIENT_PUBLIC_URL || "");
    })
  }, [])

  useEffect(() => {
    if (!joinCode && !code) {
      setInfoMsg("Please scan the QR code using your favorite camera app.");
    }
  }, [joinCode, code]);

  useEffect(() => {
    if (infoMsg) {
      setShowInfoSlide(false);
      setTimeout(() => setShowInfoSlide(true), 30);
    }
  }, [infoMsg]);

  useEffect(() => {
    const peer = new RTCPeerConnection();

    peer.ondatachannel = (event) => {
      const channel = event.channel;
      channel.onopen = () => {
        console.log("Data channel opened");
      };
      channel.onmessage = (e) => {
        setReceivedData(JSON.parse(e.data));
      };
      channel.onclose = () => {
        console.log("Data channel closed");
      };
    };

    peerRef.current = peer;
  }, []);

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
    };

    ws.onmessage = (event) => {
      const message: SignalingMessage = JSON.parse(event.data);
      switch (message.type) {
        case "registered":
          break;
        case "joinedRoom":
          if (message.payload.success === false) {
            setExpired(true);
            setInfoMsg("This code is expired or invalid. Please request a new QR code.");
          } else if (message.payload.userId === userId) {
            setRoomId(message.payload.roomId);
          }
          break;
        case "joinCodeIssued":
          break;
        case "leftRoom":
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
          );
          break;
        default:
          console.warn("Unhandled message type:", message.type);
      }
    };

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

  // AirDrop animation: show on receive, auto-hide after 3s
  useEffect(() => {
    if (receivedData) {
      setShowSlideIn(true);
      const timeout = setTimeout(() => setShowSlideIn(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [receivedData]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      {infoMsg && (
        <div
          className={`
            fixed top-0 left-1/2 -translate-x-1/2 z-50
            w-full max-w-2xl px-4
            transition-all duration-500 ease-out
            ${showInfoSlide ? 'translate-y-0 opacity-100' : '-translate-y-32 opacity-0'}
            pointer-events-none
          `}
          style={{ willChange: "transform, opacity" }}
        >
          <div className="flex items-center gap-3 bg-white/95 shadow-2xl rounded-2xl p-5 border border-slate-200 backdrop-blur-lg mt-3 pointer-events-auto">
            <span className="text-slate-900 font-bold text-lg tracking-tight">
              {infoMsg}
            </span>
          </div>
        </div>
      )}
      {(!expired && (joinCode || code)) && (
        <>
          {/* AirDrop-style top animation */}
          <div
            className={`
              fixed top-0 left-1/2 -translate-x-1/2 z-50
              w-full max-w-2xl px-4
              transition-all duration-500 ease-out
              ${showSlideIn ? 'translate-y-0 opacity-100' : '-translate-y-32 opacity-0'}
              pointer-events-none
            `}
            style={{ willChange: "transform, opacity" }}
          >
            <div className="flex items-center gap-3 bg-white/95 shadow-2xl rounded-2xl p-5 border border-slate-200 backdrop-blur-lg mt-3">
              <QrCode className="text-blue-500 w-6 h-6" />
              <span className="text-slate-900 font-bold text-lg tracking-tight">
                Data received!
              </span>
            </div>
          </div>
          {/* Main Card */}
          <Card className="w-full max-w-4xl mx-auto shadow-lg border-0 backdrop-blur-sm">
            <CardHeader className="flex flex-col items-center mt-20 mb-20">
              <HeartHandshake className="h-12 w-12 text-red-500" />
              <CardTitle className="text-xl flex items-center">
                Successfully Shared
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="text-xs text-slate-400 cursor-pointer underline m-2"
                onClick={() => navigate("/")}
              >
              What is this about?
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-4">
                <div className="text-blue-900 text-base font-semibold">{receivedData?.version}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {formatDate(receivedData?.createdAt)}
                </div>
              </div>
              <div className="p-4 max-h-[100vh] overflow-auto bg-slate-900 rounded-lg">
                <pre className="text-sm text-green-400 font-mono leading-relaxed">
                  {JSON.stringify(receivedData?.data, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Share;