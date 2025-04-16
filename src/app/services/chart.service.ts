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

  generateSeries(seriesCount: number = 5, pointCount: number = 4032): any[] {
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

    if (totalPoints > 5000000) {
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
        // interval: 5 * 60 * 1000,
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

  doesLineIntersectBrushArea(
    xRange: [number, number],
    yRange: [number, number],
    data: [number, number][]
  ): boolean {
    // Early return for empty data
    if (!data || data.length < 2) {
      return false;
    }

    // Define the brush rectangle boundaries
    const brushRect = {
      xMin: xRange[0],
      xMax: xRange[1],
      yMin: yRange[0],
      yMax: yRange[1],
    };

    // Check if a point is inside the brush rectangle
    const isPointInside = (x: number, y: number): boolean =>
      x >= brushRect.xMin &&
      x <= brushRect.xMax &&
      y >= brushRect.yMin &&
      y <= brushRect.yMax;

    // Check if two line segments intersect
    const doSegmentsIntersect = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      x3: number,
      y3: number,
      x4: number,
      y4: number
    ): boolean => {
      // Calculate the determinant
      const det = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);

      // Lines are parallel if determinant is zero
      if (Math.abs(det) < 1e-10) {
        return false;
      }

      // Calculate intersection parameters
      const lambda = ((y4 - y3) * (x4 - x1) + (x3 - x4) * (y4 - y1)) / det;
      const gamma = ((y1 - y2) * (x4 - x1) + (x2 - x1) * (y4 - y1)) / det;

      // Check if intersection is within both line segments
      return lambda >= 0 && lambda <= 1 && gamma >= 0 && gamma <= 1;
    };

    // Check if a line segment intersects with any edge of the brush rectangle
    const intersectsWithRectEdge = (
      x1: number,
      y1: number,
      x2: number,
      y2: number
    ): boolean => {
      const { xMin, xMax, yMin, yMax } = brushRect;

      // Check intersection with each edge of the rectangle
      return (
        doSegmentsIntersect(x1, y1, x2, y2, xMin, yMin, xMax, yMin) || // top edge
        doSegmentsIntersect(x1, y1, x2, y2, xMax, yMin, xMax, yMax) || // right edge
        doSegmentsIntersect(x1, y1, x2, y2, xMax, yMax, xMin, yMax) || // bottom edge
        doSegmentsIntersect(x1, y1, x2, y2, xMin, yMax, xMin, yMin) // left edge
      );
    };

    // Check each line segment in the series
    for (let i = 0; i < data.length - 1; i++) {
      const [x1, y1] = data[i];
      const [x2, y2] = data[i + 1];

      // Quick check: if either endpoint is inside the brush area, return true
      if (isPointInside(x1, y1) || isPointInside(x2, y2)) {
        return true;
      }

      // Check if the line segment intersects with any edge of the brush rectangle
      if (intersectsWithRectEdge(x1, y1, x2, y2)) {
        return true;
      }
    }

    return false;
  }
}
