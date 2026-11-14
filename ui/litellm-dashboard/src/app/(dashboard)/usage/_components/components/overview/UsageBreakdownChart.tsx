"use client";

import { useMemo, useState } from "react";
import type { DailyData } from "@/components/UsagePage/types";
import { StackedUsageChart, type StackedUsageScale } from "@/components/shared/charts";
import { cn } from "@/lib/cva.config";
import { BreakdownControls, Leaderboard, useBreakdown, type BreakdownState } from "./BreakdownChart";
import {
  bucketSeries,
  bucketTotals,
  formatMetricValue,
  labelForDate,
  modelColorMap,
  type BreakdownDimension,
  type Granularity,
  type UsageMetric,
} from "./overviewData";
import { ChartSkeleton, Panel, PANEL_INSET_X, Segmented } from "./Primitives";

const METRIC_NOUN: Record<UsageMetric, string> = { spend: "花费", tokens: "Token 数", requests: "请求数" };
const GRANULARITY_OPTIONS = [
  { value: "day", label: "按天" },
  { value: "week", label: "按周" },
] as const satisfies readonly { value: Granularity; label: string }[];
const SCALE_OPTIONS = [
  { value: "linear", label: "线性" },
  { value: "log", label: "对数" },
] as const satisfies readonly { value: StackedUsageScale; label: string }[];

interface UsageBreakdownChartProps {
  results: readonly DailyData[];
  loading: boolean;
  compact?: boolean;
  colorByModel?: ReadonlyMap<string, string>;
  dimension?: BreakdownDimension;
}

export default function UsageBreakdownChart({
  results,
  loading,
  compact = false,
  colorByModel,
  dimension = "model_groups",
}: UsageBreakdownChartProps) {
  const [metric, setMetric] = useState<UsageMetric>("spend");
  const state: BreakdownState = { metric, dimension };
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [scale, setScale] = useState<StackedUsageScale>("linear");
  const modelColors = useMemo(() => colorByModel ?? modelColorMap(results), [colorByModel, results]);
  const { series: dailySeries, ranking } = useBreakdown(results, state, 8, modelColors);
  const series = useMemo(() => bucketSeries(dailySeries, granularity), [dailySeries, granularity]);
  const totalsByBucket = useMemo(() => bucketTotals(series), [series]);
  const format = (value: number) => formatMetricValue(value, state.metric);

  return (
    <Panel
      title={`${granularity === "day" ? "按天" : "按周"}用量`}
      subtitle={`${granularity === "day" ? "按天" : "按周"}${METRIC_NOUN[state.metric]}按模型（前 8，其余归为其他）`}
      action={
        <>
          <BreakdownControls state={state} onChange={(next) => setMetric(next.metric)} showDimension={false} />
          <Segmented label="时间粒度" value={granularity} options={GRANULARITY_OPTIONS} onChange={setGranularity} />
          <Segmented label="刻度" value={scale} options={SCALE_OPTIONS} onChange={setScale} />
        </>
      }
      bodyClassName="px-0 pt-4 pb-0"
    >
      <div className="px-2 pb-2">
        {loading ? (
          <ChartSkeleton className={cn("mx-3 w-auto", compact ? "h-56" : "h-[380px]")} />
        ) : (
          <StackedUsageChart
            data={series.data}
            series={series.keys}
            labels={series.labels}
            colors={series.colors}
            xKey="date"
            xLabel={(date) => labelForDate(series, date)}
            scale={scale}
            format={format}
            totalFor={(date) => totalsByBucket.get(date)}
            className={compact ? "h-56" : undefined}
          />
        )}
      </div>
      <div className={cn("border-t pt-3 pb-2", PANEL_INSET_X)}>
        <h4 className="text-sm leading-5 font-medium text-foreground">模型排行</h4>
        {loading ? (
          <div role="status" aria-label="Loading top models">
            <ChartSkeleton className="my-2 h-20" />
          </div>
        ) : (
          <Leaderboard
            ranking={ranking}
            series={dailySeries}
            metric={state.metric}
            dimension={state.dimension}
            colorByKey={modelColors}
            columns={compact ? 1 : 2}
            limit={10}
          />
        )}
      </div>
    </Panel>
  );
}
