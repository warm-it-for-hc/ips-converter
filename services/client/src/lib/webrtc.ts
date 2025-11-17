const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
    ],
  },
];

export const DEFAULT_RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: DEFAULT_ICE_SERVERS,
};

type ClientConfig = {
  ICE_SERVERS?: RTCIceServer[];
};

function parseEnvIceServers(): RTCIceServer[] | null {
  const raw = import.meta.env?.VITE_ICE_SERVERS;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (error) {
    console.error("Failed to parse VITE_ICE_SERVERS:", error);
  }
  return null;
}

const ENV_ICE_SERVERS = parseEnvIceServers();

export function buildRtcConfiguration(config?: ClientConfig): RTCConfiguration {
  if (ENV_ICE_SERVERS) {
    return { iceServers: ENV_ICE_SERVERS };
  }
  if (config?.ICE_SERVERS && config.ICE_SERVERS.length > 0) {
    return { iceServers: config.ICE_SERVERS };
  }
  return DEFAULT_RTC_CONFIGURATION;
}
