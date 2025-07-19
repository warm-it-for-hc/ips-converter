let configCache: any = null;

export async function getConfig() {
  if (configCache) return configCache;
  const res = await fetch("/config.json");
  if (!res.ok) throw new Error("config.json load fail");
  configCache = await res.json();
  return configCache;
}
