import { ChangeDetectionStrategy, Component, ElementRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonMenuButton } from '@ionic/angular/ion-menu-button';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { AuthService } from '../../core/auth/auth.service';

/**
 * Manual de usuario integrado (ayuda contextual).
 * Cada página enlaza aquí con un fragmento (`/ayuda#productos`) y la vista
 * desplaza y enfoca automáticamente la sección correspondiente.
 */
@Component({
  selector: 'app-help',
  imports: [IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent],
  templateUrl: './help.page.html',
  styleUrl: './help.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpPage {
  protected readonly auth = inject(AuthService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    // La página puede quedar en caché: se escucha cada cambio de fragmento
    this.route.fragment.pipe(takeUntilDestroyed()).subscribe((fragment) => {
      if (fragment) {
        setTimeout(() => this.goTo(fragment), 150);
      }
    });
  }

  /** Desplaza y lleva el foco a una sección del manual. */
  protected goTo(id: string, event?: Event): void {
    event?.preventDefault();
    const section = (this.host.nativeElement as HTMLElement).querySelector<HTMLElement>(`#ayuda-${id}`);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      section.focus({ preventScroll: true });
    }
  }
}
