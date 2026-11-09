import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Activity } from "@/components/contribution-graph"
import {
  ContributionGraph,
  ContributionGraphBlock,
  ContributionGraphCalendar,
  ContributionGraphFooter,
  ContributionGraphLegend,
  ContributionGraphTotalCount,
} from "@/components/contribution-graph"

export function GitHubContributions({
  contributions: data,
  githubProfileUrl,
  className,
  blockSize = 11,
  blockMargin = 3,
}: {
  contributions: Activity[]
  githubProfileUrl: string
  className?: string
  blockSize?: number
  blockMargin?: number
}) {
  return (
    <TooltipProvider>
    <ContributionGraph
      className={cn("w-full py-2", className)}
      data={data}
      blockSize={blockSize}
      blockMargin={blockMargin}
      blockRadius={2}
      labels={{ legend: { less: "少", more: "多" } }}
    >
      <ContributionGraphCalendar
        className="no-scrollbar px-2"
        title="GitHub Contributions"
      >
        {({ activity, dayIndex, weekIndex }) => (
          <Tooltip>
            <TooltipTrigger asChild>
                <g tabIndex={0}>
                  <ContributionGraphBlock
                    activity={activity}
                    dayIndex={dayIndex}
                    weekIndex={weekIndex}
                  />
                </g>
            </TooltipTrigger>
            <TooltipContent className="font-sans">
              <p>
                {format(new Date(activity.date), "yyyy-MM-dd")} · {activity.count} 次贡献
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </ContributionGraphCalendar>

      <ContributionGraphFooter className="px-2">
        <ContributionGraphTotalCount>
          {({ totalCount }) => (
            <div className="text-muted-foreground">
              过去一年 · {totalCount.toLocaleString("zh-CN")} 次公开贡献 ·{" "}
              <a
                className="text-foreground link-underline"
                href={githubProfileUrl}
                target="_blank"
                rel="noopener"
              >
                GitHub
              </a>
            </div>
          )}
        </ContributionGraphTotalCount>

        <ContributionGraphLegend />
      </ContributionGraphFooter>
    </ContributionGraph>
    </TooltipProvider>
  )
}

export function GitHubContributionsFallback() {
  return (
    <div className="flex h-40.5 w-full items-center justify-center">
      <Spinner className="text-muted-foreground" />
    </div>
  )
}
