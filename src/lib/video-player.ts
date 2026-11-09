import "@/styles/video-player.css"

const playIcon = '<svg viewBox="0 0 24 24"><path d="M8 5.14v13.72L19.5 12 8 5.14z"/></svg>'
const pauseIcon = '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z"/></svg>'
const volumeIcon = '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 5V4L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg>'
const muteIcon = '<svg viewBox="0 0 24 24"><path d="M16.5 12a4.5 4.5 0 0 0-2.5-4v2.18L16.5 12zM4.27 3 3 4.27 7.73 9H4v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.94 8.94 0 0 0 3.96-1.74L19.73 21 21 19.73 4.27 3zM12 4 9.91 6.09 12 8.18V4z"/></svg>'
const fullIcon = '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm12 0h-2v3h-3v2h5v-5zM7 7h3V5H5v5h2V7zm12-2h-5v2h3v3h2V5z"/></svg>'
const exitIcon = '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>'

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00"
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const rest = total % 60
  const mm = String(minutes).padStart(2, "0")
  const ss = String(rest).padStart(2, "0")
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

export function createVideoPlayer(src: string, options?: { title?: string }) {
  const root = document.createElement("div")
  root.className = "site-player is-paused"
  root.tabIndex = 0
  if (options?.title) root.setAttribute("aria-label", options.title)
  root.innerHTML = `
    <video preload="metadata" playsinline></video>
    <div class="site-player-center"><button type="button" aria-label="播放">${playIcon}</button></div>
    <div class="site-player-chrome">
      <div class="site-player-progress" role="slider" aria-label="进度">
        <div class="site-player-buffered"></div>
        <div class="site-player-played"></div>
        <div class="site-player-knob"></div>
      </div>
      <div class="site-player-row">
        <button type="button" class="site-player-toggle" aria-label="播放">${playIcon}</button>
        <span class="site-player-time">00:00 / 00:00</span>
        <span class="site-player-spacer"></span>
        <div class="site-player-volume">
          <button type="button" class="site-player-mute" aria-label="静音">${volumeIcon}</button>
          <div class="site-player-volume-panel" aria-hidden="true"><div class="site-player-volume-track" role="slider" aria-label="音量"><div class="site-player-volume-fill"></div></div></div>
        </div>
        <div class="site-player-speed">
          <button type="button" class="site-player-rate" aria-label="倍速">1.0x</button>
          <div class="site-player-speed-menu">${[2, 1.5, 1.25, 1, 0.75, 0.5].map((rate) => `<button type="button" data-rate="${rate}">${rate === 1 ? "1.0x" : `${rate}x`}</button>`).join("")}</div>
        </div>
        <button type="button" class="site-player-full" aria-label="全屏">${fullIcon}</button>
      </div>
    </div>
  `

  const video = root.querySelector("video")!
  video.src = src
  video.controls = false
  video.playsInline = true
  const toggle = root.querySelector<HTMLButtonElement>(".site-player-toggle")!
  const center = root.querySelector<HTMLButtonElement>(".site-player-center button")!
  const time = root.querySelector<HTMLElement>(".site-player-time")!
  const played = root.querySelector<HTMLElement>(".site-player-played")!
  const buffered = root.querySelector<HTMLElement>(".site-player-buffered")!
  const knob = root.querySelector<HTMLElement>(".site-player-knob")!
  const progress = root.querySelector<HTMLElement>(".site-player-progress")!
  const mute = root.querySelector<HTMLButtonElement>(".site-player-mute")!
  const volumeTrack = root.querySelector<HTMLElement>(".site-player-volume-track")!
  const volumeFill = root.querySelector<HTMLElement>(".site-player-volume-fill")!
  const rateButton = root.querySelector<HTMLButtonElement>(".site-player-rate")!
  const full = root.querySelector<HTMLButtonElement>(".site-player-full")!
  const rates = [...root.querySelectorAll<HTMLButtonElement>("[data-rate]")]

  const isExpanded = () => Boolean(document.fullscreenElement) || root.classList.contains("is-theater")
  let home: Comment | null = null

  const exitTheater = () => {
    root.classList.remove("is-theater")
    document.body.classList.remove("site-player-theater-open")
    if (home?.parentNode) {
      home.parentNode.insertBefore(root, home)
      home.remove()
    }
    home = null
  }

  const enterTheater = () => {
    if (!root.parentNode || root.classList.contains("is-theater")) return
    home = document.createComment("site-player-home")
    root.parentNode.insertBefore(home, root)
    document.body.append(root)
    root.classList.add("is-theater")
    document.body.classList.add("site-player-theater-open")
    root.focus()
  }

  const requestNativeFullscreen = async (el: HTMLElement) => {
    const node = el as HTMLElement & { webkitRequestFullscreen?: () => void; webkitEnterFullscreen?: () => void }
    if (el.requestFullscreen) return el.requestFullscreen()
    if (node.webkitRequestFullscreen) return Promise.resolve(node.webkitRequestFullscreen())
    if (node.webkitEnterFullscreen) return Promise.resolve(node.webkitEnterFullscreen())
    throw new Error("fullscreen unavailable")
  }

  const toggleFullscreen = async () => {
    if (root.classList.contains("is-theater")) {
      exitTheater()
      sync()
      return
    }
    if (document.fullscreenElement) {
      await document.exitFullscreen?.()
      sync()
      return
    }
    const insideEditor = Boolean(root.closest(".ProseMirror, [contenteditable='true']"))
    if (insideEditor) {
      enterTheater()
      sync()
      return
    }
    try {
      await requestNativeFullscreen(root)
    } catch {
      try {
        await requestNativeFullscreen(video)
      } catch {
        enterTheater()
      }
    }
    sync()
  }

  const sync = () => {
    const duration = video.duration || 0
    const ratio = duration ? video.currentTime / duration : 0
    played.style.width = `${ratio * 100}%`
    knob.style.left = `${ratio * 100}%`
    time.textContent = `${formatTime(video.currentTime)} / ${formatTime(duration)}`
    if (video.buffered.length) buffered.style.width = `${(video.buffered.end(video.buffered.length - 1) / (duration || 1)) * 100}%`
    const paused = video.paused
    root.classList.toggle("is-paused", paused)
    toggle.innerHTML = paused ? playIcon : pauseIcon
    toggle.setAttribute("aria-label", paused ? "播放" : "暂停")
    center.innerHTML = playIcon
    mute.innerHTML = video.muted || video.volume === 0 ? muteIcon : volumeIcon
    volumeFill.style.height = `${(video.muted ? 0 : video.volume) * 100}%`
    const expanded = isExpanded()
    full.innerHTML = expanded ? exitIcon : fullIcon
    full.setAttribute("aria-label", expanded ? "退出全屏" : "全屏")
    rates.forEach((button) => button.classList.toggle("is-active", Number(button.dataset.rate) === video.playbackRate))
  }

  const playToggle = () => {
    if (video.paused) void video.play()
    else video.pause()
  }

  const seekFromEvent = (event: PointerEvent) => {
    const box = progress.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width))
    if (video.duration) video.currentTime = ratio * video.duration
  }

  const onKey = (event: KeyboardEvent) => {
    if (event.key === " " || event.key === "k") { event.preventDefault(); playToggle() }
    if (event.key === "ArrowRight") video.currentTime += 5
    if (event.key === "ArrowLeft") video.currentTime -= 5
    if (event.key === "f") { event.preventDefault(); void toggleFullscreen() }
    if (event.key === "Escape" && root.classList.contains("is-theater")) { event.preventDefault(); exitTheater(); sync() }
    if (event.key === "m") video.muted = !video.muted
  }

  video.addEventListener("click", playToggle)
  center.addEventListener("click", playToggle)
  toggle.addEventListener("click", playToggle)
  video.addEventListener("timeupdate", sync)
  video.addEventListener("progress", sync)
  video.addEventListener("loadedmetadata", sync)
  video.addEventListener("play", sync)
  video.addEventListener("pause", sync)
  video.addEventListener("volumechange", sync)
  mute.addEventListener("click", () => { video.muted = !video.muted })
  const setVolumeFromEvent = (event: PointerEvent) => {
    const box = volumeTrack.getBoundingClientRect()
    const ratio = 1 - Math.min(1, Math.max(0, (event.clientY - box.top) / box.height))
    video.volume = ratio
    video.muted = ratio === 0
  }
  volumeTrack.addEventListener("pointerdown", (event) => {
    event.preventDefault()
    event.stopPropagation()
    setVolumeFromEvent(event)
    const move = (next: PointerEvent) => setVolumeFromEvent(next)
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  })
  rateButton.addEventListener("click", (event) => {
    event.stopPropagation()
    root.classList.toggle("is-menu")
  })
  rates.forEach((button) => button.addEventListener("click", () => {
    video.playbackRate = Number(button.dataset.rate)
    rateButton.textContent = `${Number(button.dataset.rate).toFixed(1)}x`
    root.classList.remove("is-menu")
    sync()
  }))
  full.addEventListener("pointerdown", (event) => event.stopPropagation(), true)
  full.addEventListener("mousedown", (event) => event.stopPropagation(), true)
  full.addEventListener("click", (event) => {
    event.stopPropagation()
    event.preventDefault()
    void toggleFullscreen()
  })
  video.addEventListener("dblclick", (event) => {
    event.preventDefault()
    event.stopPropagation()
    void toggleFullscreen()
  })
  document.addEventListener("fullscreenchange", sync)
  const onDocKey = (event: KeyboardEvent) => {
    if (event.key === "Escape" && root.classList.contains("is-theater")) {
      event.preventDefault()
      exitTheater()
      sync()
    }
  }
  document.addEventListener("keydown", onDocKey)
  progress.addEventListener("pointerdown", (event) => {
    seekFromEvent(event)
    const move = (next: PointerEvent) => seekFromEvent(next)
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  })
  root.addEventListener("keydown", onKey)
  root.addEventListener("click", () => root.classList.remove("is-menu"))
  sync()

  const dispose = () => {
    exitTheater()
    video.pause()
    video.removeAttribute("src")
    video.load()
    document.removeEventListener("fullscreenchange", sync)
    document.removeEventListener("keydown", onDocKey)
  }
  Object.assign(root, { dispose })
  return root
}

export type VideoPlayerRoot = HTMLDivElement & { dispose?: () => void }
