import { Server } from "./handler.js"
import os from "os"

const HOSTNAME = os.hostname()
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

const server = new Server(HOSTNAME, REDIS_URL)
await server.start()
