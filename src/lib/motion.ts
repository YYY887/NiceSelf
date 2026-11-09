export const easeOut = [0.22, 1, 0.36, 1] as const

export const revealHidden = { opacity: 0, y: 14, filter: "blur(6px)" }
export const revealShow = { opacity: 1, y: 0, filter: "blur(0px)" }

export const pageTransition = {
  duration: 0.38,
  ease: easeOut,
}

export const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
}

export const staggerItem = {
  hidden: revealHidden,
  show: {
    ...revealShow,
    transition: {
      duration: 0.45,
      ease: easeOut,
    },
  },
}
