import { WebSocketServer } from "ws";
import { createClient } from "redis";
import { generateJoinCode } from "./utils.js";

const redis_url = process.env.REDIS_URL || "redis://localhost:6379";
const client = createClient({
  url: redis_url,
});
client.on("error", (err) => console.log("Redis Client Error", err));
client.connect().catch(console.error);

const PORT = 3000;
const JOIN_CODE_TTL_SECONDS = 5;
const ROOM_TTL_SECONDS = 60 * 15;

const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server is running at port ${PORT}`);

wss.on("connection", (ws) => {
  console.log("New client connected");

  let joinCodeInterval: NodeJS.Timeout | null = null;

  ws.on("message", async (message) => {
    const data = JSON.parse(message.toString());

    if (data.type === "create") {
      await client
        .multi()
        .sAdd(`room:${data.roomId}`, data.userId)
        .expire(`room:${data.roomId}`, ROOM_TTL_SECONDS)
        .exec();

      ws.send(
        JSON.stringify({
          type: "joined",
          roomId: data.roomId,
          userId: data.userId,
        })
      );

      async function sendJoinCode() {
        let joinCode: string = "";
        let attempts: number = 0;
        let exsists: boolean = true;

        if (ws.readyState === WebSocket.OPEN) {
          do {
            joinCode = generateJoinCode();
            exsists = (await client.exists(`join:${joinCode}`)) > 0;
            if (!exsists) break;
            attempts++;
          } while (attempts < 10);

          if (attempts >= 10) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Failed to generate unique join code",
              })
            );
          } else {
            await client.set(`join:${joinCode}`, data.roomId, {
              EX: JOIN_CODE_TTL_SECONDS + 5,
            });
            ws.send(JSON.stringify({ type: "joinCode", joinCode, ttl: JOIN_CODE_TTL_SECONDS }));
          }
        }
      }

      await sendJoinCode();
      joinCodeInterval = setInterval(async () => {
        await sendJoinCode();
      }, JOIN_CODE_TTL_SECONDS * 1000);
    } else if (data.type === "destroy") {
      await client.sRem(`room:${data.roomId}`, data.userId);
      ws.send(
        JSON.stringify({
          type: "destroyed",
          roomId: data.roomId,
          userId: data.userId,
        })
      );
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    if (joinCodeInterval) clearInterval(joinCodeInterval);
  });
});
