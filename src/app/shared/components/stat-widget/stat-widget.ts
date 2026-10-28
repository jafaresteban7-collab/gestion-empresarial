import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { IonIcon } from '@ionic/angular/ion-icon';

/** Tono de color del widget. */
export type StatTone = 'primary' | 'success' | 'warning' | 'danger';

/**
 * Widget estadístico (KPI) reutilizable.
 *
 * Muestra un indicador con su icono y la variación respecto al periodo
 * anterior. Si es `interactive`, se comporta como un botón conmutador
 * (`aria-pressed`) y notifica al padre mediante el evento `toggled`, lo que
 * permite usarlo como filtro del cuadro de mando.
 */
@Component({
  selector: 'app-stat-widget',
  imports: [IonIcon, NgTemplateOutlet],
  templateUrl: './stat-widget.html',
  styleUrl: './stat-widget.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatWidget {
  /** Nombre del indicador. */
  readonly label = input.required<string>();
  /** Valor ya formateado. */
  readonly value = input.required<string>();
  /** Icono de Ionicons. */
  readonly icon = input('trending-up-outline');
  /** Variación porcentual respecto al periodo anterior (opcional). */
  readonly trend = input<number | null>(null);
  /** Texto auxiliar bajo el valor. */
  readonly hint = input<string>('');
  /** Color del widget. */
  readonly tone = input<StatTone>('primary');
  /** Si es `true` el widget es pulsable y conmutable. */
  readonly interactive = input(false);
  /** Estado activo (cuando es interactivo). */
  readonly active = input(false);

  /** Se emite al pulsar el widget interactivo, con el nuevo estado. */
  readonly toggled = output<boolean>();

  protected readonly trendText = computed(() => {
    const t = this.trend();
    if (t === null || !Number.isFinite(t)) return '';
    const sign = t > 0 ? '+' : '';
    return `${sign}${t.toFixed(1)} %`;
  });

  protected readonly trendIcon = computed(() => {
    const t = this.trend() ?? 0;
    return t > 0 ? 'arrow-up-outline' : t < 0 ? 'arrow-down-outline' : 'remove-outline';
  });

  protected readonly trendWord = computed(() => {
    const t = this.trend() ?? 0;
    return t > 0 ? 'Aumento' : t < 0 ? 'Descenso' : 'Sin cambios';
  });

  protected toggle(): void {
    if (this.interactive()) {
      this.toggled.emit(!this.active());
    }
  }
}
