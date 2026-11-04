import ReactECharts from "echarts-for-react";

interface GaugeChartProps {
  label: string;
  value: number | null | undefined;
  max?: number;
  unit?: string;
  color?: string;
}

export default function GaugeChart({
  label,
  value,
  max = 100,
  unit = "%",
  color = "#39d6c8",
}: GaugeChartProps) {
  const v = value ?? 0;

  const option = {
    animation: true,

    series: [
      {
        type: "gauge",

        startAngle: 220,
        endAngle: -40,

        min: 0,
        max,

        radius: "88%",

        progress: {
          show: true,
          width: 12,
          itemStyle: {
            color,
          },
        },

        axisLine: {
          lineStyle: {
            width: 12,
            color: [
              [
                1,
                "rgba(255,255,255,0.08)",
              ],
            ],
          },
        },

        pointer: {
          show: false,
        },

        axisTick: {
          show: false,
        },

        splitLine: {
          show: false,
        },

        axisLabel: {
          show: false,
        },

        anchor: {
          show: false,
        },

        title: {
          show: true,
          offsetCenter: [0, "70%"],
          color: "#8fa1b3",
          fontSize: 12,
        },

        detail: {
          valueAnimation: true,
          offsetCenter: [0, "0%"],
          fontSize: 22,
          fontWeight: 700,
          color: "#e6ecf1",
          formatter: (val: number) =>
            `${val.toFixed(0)}${unit}`,
        },

        data: [
          {
            value: v,
            name: label,
          },
        ],
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      notMerge
      lazyUpdate
      style={{
        width: "100%",
        maxWidth: "100%",
        height: "clamp(180px, 24vw, 240px)",
      }}
    />
  );
}
