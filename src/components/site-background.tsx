export function SiteBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 bg-background"
    >
      <div className="absolute inset-0 bg-[radial-gradient(#f472b6_1px,transparent_1px)] [mask-image:radial-gradient(circle_at_50%_50%,#000_50%,transparent_100%)] [background-size:28px_28px] opacity-40 [-webkit-mask-image:radial-gradient(circle_at_50%_50%,#000_50%,transparent_100%)] dark:opacity-30" />
    </div>
  )
}
