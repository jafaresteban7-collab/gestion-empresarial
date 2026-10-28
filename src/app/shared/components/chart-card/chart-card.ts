import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  input,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';

// Registro selectivo de Chart.js (tree-shaking: solo lo que se usa)
Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  DoughnutController,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
);

/** Paleta accesible (contraste ≥ 3:1 sobre blanco para elementos gráficos). */
export const CHART_PALETTE = ['#0b4fc4', '#c2410c', '#146c2e', '#7e22ce', '#a4161a', '#0f766e'];

let nextId = 0;

/** Serie de datos del gráfico. */
export interface ChartSeries {
  label: string;
  data: number[];
  color?: string;
}

/** Evento emitido al pulsar un elemento del gráfico. */
export interface ChartPointEvent {
  label: string;
  index: number;
}

/**
 * Tarjeta de gráfico reutilizable basada en Chart.js.
 *
 * - Recibe tipo, etiquetas y series por `input()` y se redibuja de forma
 *   reactiva (sin recrear el canvas) cuando cambian.
 * - Emite `pointSelected` al pulsar una barra o sector (filtros interactivos).
 * - Ciclo de vida: crea el gráfico tras el primer renderizado y lo destruye
 *   en `ngOnDestroy` para evitar fugas de memoria.
 * - Accesibilidad: el canvas tiene `role="img"` con descripción y se ofrece
 *   una tabla equivalente oculta para lectores de pantalla.
 */
@Component({
  selector: 'app-chart-card',
  templateUrl: './chart-card.html',
  styleUrl: './chart-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartCard implements OnDestroy {
  /** Tipo de gráfico. */
  readonly type = input<'bar' | 'line' | 'doughnut'>('bar');
  /** Título visible. */
  readonly title = input.required<string>();
  /** Descripción para tecnologías de asistencia. */
  readonly description = input.required<string>();
  /** Etiquetas del eje X / sectores. */
  readonly labels = input.required<string[]>();
  /** Series de datos. */
  readonly series = input.required<ChartSeries[]>();
  /** Formateador de valores en tooltips y tabla accesible. */
  readonly valueFormat = input<(v: number) => string>((v) => v.toLocaleString('es-ES'));
  /** Barras horizontales (solo `bar`). */
  readonly horizontal = input(false);

  /** Se emite al pulsar un punto/barra/sector. */
  readonly pointSelected = output<ChartPointEvent>();

  /** Id único del encabezado (para `aria-labelledby`). */
  protected readonly headingId = `chart-title-${++nextId}`;

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart;

  constructor() {
    afterNextRender(() => this.createChart());
    effect(() => {
      const labels = this.labels();
      const series = this.series();
      untracked(() => this.updateData(labels, series));
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = undefined;
  }

  private createChart(): void {
    const type = this.type();
    const format = this.valueFormat();
    const config: ChartConfiguration = {
      type,
      data: { labels: this.labels(), datasets: this.toDatasets(this.series()) },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: this.horizontal() ? 'y' : 'x',
        animation: { duration: 400 },
        interaction: { mode: type === 'line' ? 'index' : 'nearest', intersect: type !== 'line' },
        plugins: {
          legend: { display: type === 'doughnut' || this.series().length > 1, position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label ?? ''}: ${format(Number(ctx.raw))}`,
            },
          },
        },
        scales:
          type === 'doughnut'
            ? {}
            : {
                x: { grid: { display: false }, ticks: { color: '#3d434c' } },
                y: { beginAtZero: true, ticks: { color: '#3d434c' } },
              },
        onClick: (_event, elements) => {
          const el = elements[0];
          if (el) {
            this.pointSelected.emit({ label: String(this.labels()[el.index]), index: el.index });
          }
        },
      },
    };
    this.chart = new Chart(this.canvas().nativeElement, config);
  }

  private updateData(labels: string[], series: ChartSeries[]): void {
    if (!this.chart) {
      return;
    }
    this.chart.data.labels = labels;
    this.chart.data.datasets = this.toDatasets(series);
    this.chart.update();
  }

  private toDatasets(series: ChartSeries[]) {
    const doughnut = this.type() === 'doughnut';
    return series.map((s, i) => {
      const color = s.color ?? CHART_PALETTE[i % CHART_PALETTE.length];
      return {
        label: s.label,
        data: s.data,
        backgroundColor: doughnut ? CHART_PALETTE : this.type() === 'line' ? `${color}22` : color,
        borderColor: doughnut ? '#ffffff' : color,
        borderWidth: 2,
        borderRadius: this.type() === 'bar' ? 6 : 0,
        fill: this.type() === 'line',
        tension: 0.3,
        pointRadius: 2,
      };
    });
  }

  /** Filas de la tabla accesible equivalente. */
  protected tableRows(): { label: string; values: string[] }[] {
    const format = this.valueFormat();
    return this.labels().map((label, i) => ({
      label,
      values: this.series().map((s) => format(s.data[i] ?? 0)),
    }));
  }
}
