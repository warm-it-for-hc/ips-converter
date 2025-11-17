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

export function buildRtcConfiguration(config?: ClientConfig): RTCConfiguration {
  if (config?.ICE_SERVERS && config.ICE_SERVERS.length > 0) {
    return { iceServers: config.ICE_SERVERS };
  }
  return DEFAULT_RTC_CONFIGURATION;
}
