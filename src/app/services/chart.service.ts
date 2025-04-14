import { Injectable } from '@angular/core';
import { EChartsOption } from 'echarts';
import * as echarts from 'echarts/core';

@Injectable({
  providedIn: 'root',
})
export class ChartService {
  private seriesColors: Record<string, string> = {};
  private startTime!: number;
  private series: any[] = [];

  constructor() {}

  generateSeries(seriesCount: number = 28, pointCount: number = 4032): any[] {
    this.startTime = Date.now() - pointCount * 5 * 60 * 1000;
    this.series = [];

    for (let i = 0; i < seriesCount; i++) {
      const color = `hsl(${i * 60}, 70%, 50%)`;
      this.seriesColors[`serie-${i}`] = color;

      const data: [number, number][] = Array.from(
        { length: pointCount },
        (_, j) => [
          this.startTime + j * 5 * 60 * 1000,
          Math.floor(Math.random() * 1000) + 1,
        ]
      );

      this.series.push({
        id: `serie-${i}`,
        name: `Serie ${i + 1}`,
        type: 'line',
        data,
        symbol: 'none',
        sampling: 'average',
        progressive: 1000,
        lineStyle: {
          width: 1,
          color: 'blue',
          opacity: 1,
        },
      });
    }

    return this.series;
  }

  createChartOptions(series: any[]): EChartsOption {
    const totalPoints = series.reduce((sum, s) => sum + s.data.length, 0);

    if (totalPoints > 500000) {
      return this.createWarningOptions('⚠️ Too many ONTs selected');
    }

    const hasData = series.some((s) => s.data.length > 0);
    if (!hasData) {
      return this.createWarningOptions(
        'No data available for the selected ONTs'
      );
    }

    return {
      xAxis: {
        type: 'value',
        min: this.startTime,
        max: this.startTime + 4032 * 5 * 60 * 1000,
        interval: 24 * 60 * 60 * 1000,
        axisLabel: {
          formatter: (value: number) => {
            const date = new Date(value);
            return `${date.getDate().toString().padStart(2, '0')}/${(
              date.getMonth() + 1
            )
              .toString()
              .padStart(2, '0')} ${date
              .getHours()
              .toString()
              .padStart(2, '0')}:${date
              .getMinutes()
              .toString()
              .padStart(2, '0')}`;
          },
          rotate: 90,
          hideOverlap: true,
        },
      },
      yAxis: {
        type: 'value',
        max: 1000,
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'weakFilter',
          start: 0,
          end: 100,
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          filterMode: 'weakFilter',
          start: 0,
          end: 100,
        },
      ],
      brush: {
        toolbox: ['rect', 'lineX', 'clear'],
        xAxisIndex: 0,
        brushMode: 'multiple',
      },
      series,
    };
  }

  private createWarningOptions(message: string): EChartsOption {
    return {
      title: {
        text: message,
        left: 'center',
        top: 'middle',
        textStyle: {
          fontSize: 18,
          color: '#888',
        },
      },
      xAxis: { show: true },
      yAxis: { show: true },
      series: [],
    };
  }

  updateSelectedSeries(
    chartInstance: echarts.ECharts,
    highlightedIds: string[]
  ): void {
    chartInstance?.setOption({
      series: this.series.map((series) => ({
        id: series.id,
        lineStyle: {
          color: highlightedIds.includes(series.id) ? 'purple' : 'blue',
          opacity: highlightedIds.includes(series.id) ? 1 : 0.2,
        },
      })),
    });
  }

  resetSeriesStyling(chartInstance: echarts.ECharts): void {
    chartInstance?.setOption({
      series: this.series.map((series) => ({
        id: series.id,
        lineStyle: {
          color: 'blue',
          opacity: 1,
        },
      })),
    });
  }

  getSeries(): any[] {
    return this.series;
  }
}
