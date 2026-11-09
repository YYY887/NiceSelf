import { motion, useReducedMotion } from "motion/react"

const title = "QianQiu-MySelf"
const words = ["QianQiu-", "MySelf"]

export function HandwrittenTitle() {
  const reducedMotion = useReducedMotion()

  return (
    <h1
      aria-label={title}
      className="flex flex-wrap justify-center font-script text-[clamp(3.65rem,9vw,7.5rem)] leading-none font-medium tracking-tight text-foreground"
    >
      {words.map((word, index) => (
        <motion.span
          key={word}
          aria-hidden="true"
          className="inline-block whitespace-nowrap"
          initial={
            reducedMotion
              ? false
              : { clipPath: "inset(-25% 110% -30% -20%)", opacity: 0 }
          }
          animate={{ clipPath: "inset(-25% -20% -30% -20%)", opacity: 1 }}
          transition={{
            duration: 1.2,
            delay: 0.12 + index * 1.05,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {word}
        </motion.span>
      ))}
    </h1>
  )
}
