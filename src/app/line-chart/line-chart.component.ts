import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { EChartsOption } from 'echarts';
import { NgxEchartsModule } from 'ngx-echarts';
import { provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  BrushComponent,
  ToolboxComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { filter, fromEvent, map, Subject, takeUntil, tap } from 'rxjs';

if (typeof window !== 'undefined') {
  echarts.use([
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    DataZoomComponent,
    BrushComponent,
    ToolboxComponent,
    LineChart,
    CanvasRenderer,
  ]);
}

@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [NgxEchartsModule, CommonModule],
  providers: [
    provideEchartsCore({
      echarts: () => import('echarts/core'),
    }),
  ],
  templateUrl: './line-chart.component.html',
  styleUrl: './line-chart.component.scss',
})
export class LineChartComponent implements OnInit {
  chartOption: EChartsOption = {};
  chartInstance!: echarts.ECharts;
  isBrowser: boolean;

  unsubscribe$ = new Subject<void>();
  series: any[] = [];
  seriesColors: Record<string, string> = {};
  startTime!: number;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      const series = this.generateSeries();
      const totalPoints = series.reduce((sum, s) => sum + s.data.length, 0);

      if (totalPoints > 500000) {
        this.chartOption = {
          title: {
            text: '⚠️ Too many ONTs selected',
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
        return;
      }

      const hasData = series.some((s) => s.data.length > 0);
      if (!hasData) {
        this.chartOption = {
          title: {
            text: 'No data available for the selected ONTs',
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
        return;
      }

      this.chartOption = {
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
    console.log(this.chartOption);
  }

  onChartInit(chartInstance: echarts.ECharts): void {
    this.chartInstance = chartInstance;
    this.handleBrush();
    this.handleBrushEnd();
  }

  private handleBrush = () =>
    fromEvent(this.chartInstance as any, 'brush')
      .pipe(
        filter(
          ({ command, areas }: any) => command === 'clear' || areas.length === 0
        ),
        tap(() => this.clearStrummedState()),
        takeUntil(this.unsubscribe$)
      )
      .subscribe();

  private handleBrushEnd = () =>
    fromEvent(this.chartInstance as any, 'brushEnd')
      .pipe(
        filter((params: any) => params?.areas?.[0]?.coordRange?.length > 0),
        map((params: any) => {
          const [xRange, yRange] = params.areas[0].coordRange;
          const highlightedIds: string[] = [];

          for (const series of this.series) {
            const inRangePoints = series.data.filter(
              ([x, y]: [number, number]) =>
                x >= xRange[0] &&
                x <= xRange[1] &&
                y >= yRange[0] &&
                y <= yRange[1]
            );
            if (inRangePoints.length > 0) {
              highlightedIds.push(series.id);
            }
          }

          return highlightedIds;
        }),
        tap((highlightedIds: string[]) => {
          console.log('highlightedIds:', highlightedIds);
          this.handleStrummedSeries(highlightedIds);
        }),
        takeUntil(this.unsubscribe$)
      )
      .subscribe();

  private handleStrummedSeries(strummedSeriesIds: string[]): void {
    this.chartInstance?.setOption({
      series: this.series.map((series) => ({
        id: series.id,
        lineStyle: {
          color: strummedSeriesIds.includes(series.id) ? 'purple' : 'blue',
          opacity: strummedSeriesIds.includes(series.id) ? 1 : 0.2,
        },
      })),
    });
  }

  private clearStrummedState(): void {
    this.chartInstance?.setOption({
      series: this.series.map((series) => ({
        id: series.id,
        lineStyle: {
          color: 'blue',
          opacity: 1,
        },
      })),
    });
  }

  private generateSeries(): any[] {
    const pointCount = 4032;
    this.startTime = Date.now() - pointCount * 5 * 60 * 1000;
    const series: any[] = [];

    for (let i = 0; i < 28; i++) {
      const color = `hsl(${i * 60}, 70%, 50%)`;
      this.seriesColors[`serie-${i}`] = color;

      const data: [number, number][] = Array.from(
        { length: pointCount },
        (_, j) => [
          this.startTime + j * 5 * 60 * 1000,
          Math.floor(Math.random() * 1000) + 1,
        ]
      );

      series.push({
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

    this.series = series;
    return series;
  }
}
