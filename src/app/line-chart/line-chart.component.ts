import {
  Component,
  OnInit,
  PLATFORM_ID,
  Inject,
  OnDestroy,
} from '@angular/core';
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
import { ChartService } from '../services/chart.service';

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
export class LineChartComponent implements OnInit, OnDestroy {
  chartOption: EChartsOption = {};
  chartInstance!: echarts.ECharts;
  isBrowser: boolean;

  unsubscribe$ = new Subject<void>();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private chartService: ChartService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      const series = this.chartService.generateSeries();
      this.chartOption = this.chartService.createChartOptions(series);
    }
    console.log(this.chartOption);
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
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
        tap(() => this.chartService.resetSeriesStyling(this.chartInstance)),
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
          const series = this.chartService.getSeries();

          for (const serie of series) {
            const inRangePoints = serie.data.filter(
              ([x, y]: [number, number]) =>
                x >= xRange[0] &&
                x <= xRange[1] &&
                y >= yRange[0] &&
                y <= yRange[1]
            );
            if (inRangePoints.length > 0) {
              highlightedIds.push(serie.id);
            }
          }

          return highlightedIds;
        }),
        tap((highlightedIds: string[]) => {
          console.log('highlightedIds:', highlightedIds);
          this.chartService.updateSelectedSeries(
            this.chartInstance,
            highlightedIds
          );
        }),
        takeUntil(this.unsubscribe$)
      )
      .subscribe();
}
