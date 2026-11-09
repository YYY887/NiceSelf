import { flushSync } from "react-dom"

type Theme = "light" | "dark" | "system"

let changingTheme = false

export function toggleThemeWithCircle(setTheme: (theme: Theme) => void, origin: Element) {
  if (changingTheme) return

  const nextTheme = document.documentElement.classList.contains("dark") ? "light" : "dark"
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (!document.startViewTransition || reducedMotion) {
    setTheme(nextTheme)
    return
  }

  const rect = origin.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

  changingTheme = true
  const transition = document.startViewTransition(() => {
    flushSync(() => setTheme(nextTheme))
    // The provider also applies this class in its effect; set it here so the
    // new view-transition snapshot always contains the requested theme.
    document.documentElement.classList.toggle("dark", nextTheme === "dark")
    document.documentElement.classList.toggle("light", nextTheme === "light")
  })

  void transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 600, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" },
    )
  }).catch(() => {})
  void transition.finished.then(() => { changingTheme = false }, () => { changingTheme = false })
}
