import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { QRCodeSVG } from 'qrcode.react';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import type { SignalingMessage } from "@/lib/signal";
import type { ResultResponse } from "@/lib/result";

const Result = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;

  const wsRef = useRef<WebSocket|null>(null);
  const [resultResponse, setResultResponse] = useState<ResultResponse|null>(null);
  const [userId] = useState<string>(uuidv4());
  const [roomId] = useState<string>(uuidv4());
  const [joinCode, setJoinCode] = useState<string>(uuidv4());

  useEffect(() => {
    if (!state) {
      navigate("/upload");
    } else {
      setResultResponse(state.result);

      const ws = new WebSocket("/api/v1/signal");
      wsRef.current = ws;

      const createRoomMessage: SignalingMessage = {
        type: "create",
        roomId,
        userId,
      };

      ws.onopen = () => {
        ws.send(JSON.stringify(createRoomMessage));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.type === "joinCode") {
          setJoinCode(message.joinCode);
        }
      };

      ws.onclose = () => {};
      ws.onerror = () => {};

      return () => {
        if (wsRef.current) {
          const leaveMessage: SignalingMessage = {
            type: "destroy",
            roomId,
            userId,
          };
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(leaveMessage));
          }
          wsRef.current?.close();
        }
      };
    }
  }, [state, navigate, roomId, userId]);

  if (!resultResponse) return null;

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
          <div className="flex flex-col items-center gap-1 mb-20 sticky top-0 bg-white p-4">
            <QRCodeSVG
              width={160}
              height={160}
              value={`${import.meta.env.VITE_CLIENT_PUBLIC_URL}/share?joinCode=${joinCode}`}
            />
            <span className='text-xs text-slate-500 font-mono'>
              {joinCode?.slice(0, 3)}&middot;{joinCode?.slice(3, 6)}
            </span>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-4">
            <div className="text-blue-900 text-base font-semibold">{resultResponse.message}</div>
            <div className="text-xs text-slate-500 mt-1">
              {formatDate(resultResponse.created_at)}
            </div>
          </div>
          <div className="p-4 max-h-[100vh] overflow-auto bg-slate-900 rounded-lg">
            <pre className="text-sm text-green-400 font-mono leading-relaxed">
              {JSON.stringify(resultResponse.data, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Result;