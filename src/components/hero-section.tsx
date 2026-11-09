import { ArrowDown } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"

import { HandwrittenTitle } from "@/components/handwritten-title"
import { Button } from "@/components/ui/button"
import { SonarGrid } from "@/components/ui/sonar-grid"
import { easeOut, revealHidden, revealShow } from "@/lib/motion"

export function HeroSection() {
  const reducedMotion = useReducedMotion()
  const enter = (delay: number) =>
    reducedMotion
      ? {}
      : {
          initial: revealHidden,
          animate: revealShow,
          transition: {
            duration: 0.6,
            delay,
            ease: easeOut,
          },
        }

  return (
    <SonarGrid
      id="home"
      spacing={20}
      dotRadius={1.3}
      color="#f472b6"
      ringWidth={84}
      speed={240}
      amplitude={1.5}
      pingEvery={3.8}
      baseOpacity={0.25}
      pingArea={[0.22, 0.18, 0.78, 0.82]}
      className="flex min-h-svh w-full flex-col"
    >
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 pt-36 pb-24 text-center sm:px-8">
        <div className="flex max-w-3xl flex-col items-center">
          <motion.p
            {...enter(0)}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm"
          >
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-primary"
            />
            一个关于记录与创造的个人空间
          </motion.p>
          <HandwrittenTitle />
          <motion.p
            {...enter(1.65)}
            className="mt-6 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg"
          >
            写下思考，留下作品。让那些值得记住的瞬间，在这里慢慢生长。
          </motion.p>
          <motion.div {...enter(1.85)} className="mt-9">
            <Button size="lg" asChild>
              <a href="#blog">
                阅读博客 <ArrowDown data-icon="inline-end" aria-hidden="true" />
              </a>
            </Button>
          </motion.div>
        </div>
      </div>

      <p className="relative z-10 pb-7 text-center text-xs tracking-[0.2em] text-muted-foreground uppercase">
        向下阅读 · 轻点背景试试
      </p>
    </SonarGrid>
  )
}
