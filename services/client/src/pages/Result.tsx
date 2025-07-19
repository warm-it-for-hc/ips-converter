import { data, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, use } from "react";
import { v4 as uuidv4 } from "uuid";
import { QRCodeSVG } from 'qrcode.react';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { Info, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { SignalingMessage } from "@/lib/signal";
import type { ConvertResponse } from "@/lib/response";

const Result = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;

  const wsRef = useRef<WebSocket|null>(null);
  const qrDivRef = useRef<HTMLDivElement|null>(null);
  const peerRef = useRef<RTCPeerConnection>(undefined);
  const offerRef = useRef<RTCSessionDescriptionInit>(undefined);
  const toUserIdRef = useRef<string|null>(null);

  const [convertResponse, setConvertResponse] = useState<ConvertResponse|null>(null);
  const [userId, setUserId] = useState<string|null>(uuidv4());
  const [roomId, setRoomId] = useState<string|null>(uuidv4());
  const [joinCode, setJoinCode] = useState<string|null>(null);
  const [isSticky, setIsSticky] = useState<boolean>(false);
  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => {
    const peer = new RTCPeerConnection();
    peer.onicecandidate = (event) => {
      if (event.candidate && toUserIdRef.current) {
        wsRef.current?.send(JSON.stringify({
          type: "candidate",
          payload: {
            from: userId,
            to: toUserIdRef.current,
            candidate: event.candidate,
          },
          timestamp: Date.now(),
        }));
      }
    }
    peerRef.current = peer;
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      if (qrDivRef.current) {
        const { top } = qrDivRef.current.getBoundingClientRect();
        setIsSticky(top < 50);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!state) {
      navigate("/upload");
      return;
    }
    setConvertResponse(state.result);

    const ws = new WebSocket("/api/v1/signal");

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "register",
        payload: {
          userId,
        },
        timestamp: Date.now(),
      }));

      ws.send(JSON.stringify({
        type: "joinRoom",
        payload: {
          userId,
          roomId,
        },
        timestamp: Date.now(),
      }));

      ws.send(JSON.stringify({
        type: "joinCodeIssue",
        payload: {
          userId,
          roomId,
        },
        timestamp: Date.now(),
      }));
    };

    ws.onmessage = (event) => {
      const message: SignalingMessage = JSON.parse(event.data);
      console.log("Received message:", message);

      switch (message.type) {
        case "registered":
          break;
        case "joinedRoom":
          if (message.payload.userId !== userId) {
            const toastId = uuidv4();
            setToasts(toasts => [...toasts, {
                id: toastId,
                type: "info",
                message: `Code has been scanned by ${message.payload.userId}.`,
                disappearing: false,
              }
            ]);
            setTimeout(() => {
              setToasts(toasts => toasts.map(t =>
                t.id === toastId ? { ...t, disappearing: true } : t
              ));
              setTimeout(() => {
                setToasts(toasts => toasts.filter(t => t.id !== toastId));
              }, 400);
            }, 2500);
          
            const dataChannel = peerRef.current?.createDataChannel("file");
            if (dataChannel) {
              dataChannel.onopen = () => {
                console.log("Data channel opened");
                dataChannel.send(JSON.stringify(state?.result?.data));
                console.log("Data sent over data channel");
              };
              dataChannel.onclose = () => {
                console.log("Data channel closed");
              };
            }

            toUserIdRef.current = message.payload.userId;

            (async () => {
              const offer = await peerRef.current?.createOffer();
              await peerRef.current?.setLocalDescription(offer);
              offerRef.current = offer;
              ws.send(JSON.stringify({
                type: "offer",
                payload: {
                  from: userId,
                  to: message.payload.userId,
                  sdp: offer?.sdp,
                },
                timestamp: Date.now(),
              }));
            })();
          }
          break;
        case "joinCodeIssued":
          setJoinCode(message.payload.joinCode);
          break;
        case "leftRoom":
          // if (message.payload.userId !== userId) {
          //   alert(`User ${message.payload.userId} has left the room.`);
          // }
          break;
        case "answer":
          peerRef.current?.setRemoteDescription(
            new RTCSessionDescription({
              type: "answer",
              sdp: message.payload.sdp,
          }));
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

  if (!convertResponse) return null;

  const formatDate = (v: number | string) => {
    if (typeof v === "number") {
      const ts = v > 1e12 ? v : v * 1000;
      return new Date(ts).toLocaleString();
    }
    return v;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <Card className="w-full max-w-4xl mx-auto shadow-lg border-0 backdrop-blur-sm">
        <CardHeader className="flex flex-col items-center mt-20">
          <CheckCircle className="h-12 w-12 text-green-500" />
          <CardTitle className="text-xl flex items-center">
            QR Code Created
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={qrDivRef}
            className="flex flex-col items-center gap-1 mb-20 sticky top-0 bg-white p-2"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            style={{
              height: isSticky ? 80 : 250,
              transition: "0.3s cubic-bezier(0.2, 0, 0.2, 1)",
            }}
          >
            <QRCodeSVG
              width="100%"
              height="100%"
              value={`${import.meta.env.VITE_CLIENT_PUBLIC_URL}/share?joinCode=${joinCode}`}
            />
            { isSticky ?
              null :
              <span className='text-xs text-slate-500 font-mono'>
                {joinCode?.slice(0, 3)}&middot;{joinCode?.slice(3, 6)}
              </span> }
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-4">
            <div className="text-blue-900 text-base font-semibold">{convertResponse.message}</div>
            <div className="text-xs text-slate-500 mt-1">
              {formatDate(convertResponse.createdAt)}
            </div>
          </div>
          <div className="p-4 max-h-[100vh] overflow-auto bg-slate-900 rounded-lg">
            <pre className="text-sm text-green-400 font-mono leading-relaxed">
              {JSON.stringify(convertResponse.data, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
      {/* Toasts Floating Bottom Stacked */}
      <div
        className="fixed bottom-6 left-0 w-full z-50 pointer-events-none flex flex-col items-center gap-3"
      >
        {toasts.map((toast) => {
          let icon = <Info className="w-8 h-8 mr-4 text-blue-400" />;
          if (toast.type === "success") icon = <CheckCircle2 className="w-8 h-8 mr-4 text-green-400" />;
          if (toast.type === "error") icon = <XCircle className="w-8 h-8 mr-4 text-red-400" />;
          if (toast.type === "warning") icon = <AlertTriangle className="w-8 h-8 mr-4 text-yellow-400" />;
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
          );
        })}
      </div>
    </div>
  );
};

export default Result;