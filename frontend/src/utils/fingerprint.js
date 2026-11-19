/**
 * Device Fingerprinting Utility
 * Non-invasive client entropy collector for device identification.
 * Collects stable browser & hardware attributes without invasive tracking.
 */

async function sha256(message) {
  try {
    const msgBuffer = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    // Fallback simple hash if subtle crypto unavailable
    let hash = 0
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash |= 0
    }
    return Math.abs(hash).toString(16).padStart(16, '0')
  }
}

function getCanvasHash() {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 50
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'no-canvas'

    ctx.textBaseline = 'top'
    ctx.font = "14px 'Arial'"
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)
    ctx.fillStyle = '#069'
    ctx.fillText('ATO-Detect-v2.0, <canvas> 1.0', 2, 15)
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.fillText('ATO-Detect-v2.0, <canvas> 1.0', 4, 17)

    const dataUrl = canvas.toDataURL()
    let hash = 0
    for (let i = 0; i < dataUrl.length; i++) {
      hash = (hash << 5) - hash + dataUrl.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash).toString(16)
  } catch {
    return 'canvas-error'
  }
}

function getWebGLInfo() {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return { vendor: 'no-webgl', renderer: 'no-webgl' }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (!debugInfo) return { vendor: 'webgl-no-debug', renderer: 'webgl-no-debug' }

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown-vendor'
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown-renderer'
    return { vendor, renderer }
  } catch {
    return { vendor: 'webgl-error', renderer: 'webgl-error' }
  }
}

export async function getDeviceFingerprint() {
  if (typeof window === 'undefined') {
    return {
      fingerprint: 'server-rendered',
      components: {},
    }
  }

  // Persistent device seed in localStorage (acts like a hardware cookie)
  let deviceSeed = localStorage.getItem('ato_device_seed')
  if (!deviceSeed) {
    deviceSeed = 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
    localStorage.setItem('ato_device_seed', deviceSeed)
  }

  const webgl = getWebGLInfo()
  const canvasHash = getCanvasHash()

  const screenRes = `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}`
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const language = navigator.language || navigator.userLanguage || 'en'
  const platform = navigator.platform || 'unknown'
  const hardwareConcurrency = navigator.hardwareConcurrency || 4
  const deviceMemory = navigator.deviceMemory || 8

  // Detect coarse device category
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/i.test(navigator.userAgent)
  const deviceCategory = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'

  const components = {
    screen: screenRes,
    timezone,
    language,
    platform,
    cores: hardwareConcurrency,
    memory: deviceMemory,
    canvas: canvasHash,
    webglVendor: webgl.vendor,
    webglRenderer: webgl.renderer,
    deviceCategory,
    deviceSeed,
  }

  const rawFingerprintString = [
    deviceSeed,
    screenRes,
    timezone,
    language,
    platform,
    hardwareConcurrency,
    canvasHash,
    webgl.renderer,
  ].join('||')

  const fingerprintHash = await sha256(rawFingerprintString)

  return {
    fingerprint: fingerprintHash,
    deviceCategory,
    components,
  }
}
