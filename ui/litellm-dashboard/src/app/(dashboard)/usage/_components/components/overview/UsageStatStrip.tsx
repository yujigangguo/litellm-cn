"use client";

import React, { useMemo } from "react";
import type { DailyData } from "@/components/UsagePage/types";
import { cn } from "@/lib/cva.config";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { dailyTotals, formatCompact, formatLatency, formatUsd, type OverviewTotals } from "./overviewData";
import { PANEL_INSET_X, Sparkline, Stat } from "./Primitives";

const BRAND = "#2b3fd6";

interface UsageStatStripProps {
  results: readonly DailyData[];
  totals: OverviewTotals;
  loading: boolean;
  requestCountsPending: boolean;
  budget: number | null;
}

/** Spend, requests, tokens and averages for a range, each with a daily sparkline. */
export default function UsageStatStrip({
  results,
  totals,
  loading,
  requestCountsPending,
  budget,
}: UsageStatStripProps) {
  const daily = useMemo(() => dailyTotals(results), [results]);
  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-xl border bg-card sm:grid-cols-2 lg:grid-cols-4 lg:divide-x">
      <StatCell trend={<Sparkline data={daily} dataKey="spend" color={BRAND} className="h-14" />}>
        <Stat
          label="花费"
          value={formatUsd(totals.spend)}
          pending={loading}
          hint={budget ? `预算 ${formatUsd(budget)}` : "未设预算"}
        />
      </StatCell>
      <StatCell trend={<Sparkline data={daily} dataKey="requests" color={BRAND} className="h-14" />}>
        <Stat label="请求总数" value={totals.requests.toLocaleString()} pending={requestCountsPending} />
        {!requestCountsPending && (
          <div className="mt-0.5 flex gap-3 text-xs leading-4 text-muted-foreground">
            <span>
              <span className="text-success tabular-nums">{totals.successful.toLocaleString()}</span> 成功
            </span>
            <span>
              <span className={totals.failed > 0 ? "text-destructive tabular-nums" : "tabular-nums"}>
                {totals.failed.toLocaleString()}
              </span>{" "}
              失败
            </span>
          </div>
        )}
      </StatCell>
      <StatCell trend={<Sparkline data={daily} dataKey="tokens" color={BRAND} className="h-14" />}>
        <Stat
          label="Token 总数"
          value={loading ? null : formatCompact(totals.tokens)}
          exact={`${totals.tokens.toLocaleString()} 个 Token`}
          pending={loading}
          hint={loading ? undefined : `${formatCompact(totals.cacheReadTokens)} 缓存读取`}
        />
        {!loading && (
          <Popover>
            <PopoverTrigger className="mt-1 text-xs font-medium text-primary underline-offset-4 hover:underline">
              查看 Token 明细
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-80 gap-3">
              <PopoverTitle>总 Token 数包括哪些？</PopoverTitle>
              <dl className="space-y-2 text-sm tabular-nums">
                <div className="flex justify-between gap-4">
                  <dt>输入 Token</dt>
                  <dd>{totals.inputTokens.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between gap-4 pl-3 text-xs text-muted-foreground">
                  <dt>缓存读取</dt>
                  <dd>{totals.cacheReadTokens.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between gap-4 pl-3 text-xs text-muted-foreground">
                  <dt>缓存写入</dt>
                  <dd>{totals.cacheWriteTokens.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>输出 Token</dt>
                  <dd>{totals.outputTokens.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t pt-2 font-medium">
                  <dt>Token 总数</dt>
                  <dd>{totals.tokens.toLocaleString()}</dd>
                </div>
              </dl>
              <p className="text-xs leading-5 text-muted-foreground">
                输入包含缓存读取和缓存写入。缓存输入单独计价，所以仅看 Token 总数无法解释成本。
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                不同客户端可能显示不同的 Token 子集。比较数量前，请先确保是同一个人、同一个客户端和同一时间范围。
              </p>
            </PopoverContent>
          </Popover>
        )}
      </StatCell>
      <StatCell>
        <div className="grid gap-3">
          <Stat label="平均每次花费" value={formatUsd(totals.avgCostPerRequest, 4)} pending={loading} />
          <Stat
            label="平均延迟"
            value={totals.avgLatencyMs === null ? "—" : formatLatency(totals.avgLatencyMs)}
            pending={loading}
            hint={totals.successRate === null ? undefined : `${totals.successRate.toFixed(1)}% 成功率`}
          />
        </div>
      </StatCell>
    </div>
  );
}

function StatCell({ children, trend }: { children: React.ReactNode; trend?: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col justify-between gap-3 border-b py-4 last:border-b-0 lg:border-b-0",
        PANEL_INSET_X,
      )}
    >
      <div className="min-w-0">{children}</div>
      {trend}
    </div>
  );
}
