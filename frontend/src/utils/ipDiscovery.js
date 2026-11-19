/**
 * Client Public IP Discovery Utility for Local Development and VPN Testing.
 *
 * When testing on localhost (React & FastAPI running on the same laptop),
 * loopback connections bypass the VPN tunnel.
 * This discovery utility queries external public endpoints to determine the
 * actual public IP (such as the Turbo VPN exit IP or ISP public IP).
 */

export async function discoverClientPublicIP(timeoutMs = 2500) {
  // 1. Try our own backend discovery proxy
  try {
    const res = await fetch('/api/system/client-ip', {
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (res.ok) {
      const data = await res.json()
      if (data?.discovered_public_ip) {
        return data.discovered_public_ip
      }
    }
  } catch (err) {
    // Continue to external discovery
  }

  // 2. Direct external lookup (goes out through the Turbo VPN adapter if active)
  try {
    const res = await fetch('https://api64.ipify.org?format=json', {
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (res.ok) {
      const data = await res.json()
      if (data?.ip) {
        return data.ip
      }
    }
  } catch (err) {
    // External network unavailable / offline
  }

  return null
}
