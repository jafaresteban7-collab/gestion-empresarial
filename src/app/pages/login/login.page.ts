import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonButton } from '@ionic/angular/ion-button';
import { IonCard } from '@ionic/angular/ion-card';
import { IonCardContent } from '@ionic/angular/ion-card-content';
import { IonCardHeader } from '@ionic/angular/ion-card-header';
import { IonCheckbox } from '@ionic/angular/ion-checkbox';
import { IonContent } from '@ionic/angular/ion-content';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonInput } from '@ionic/angular/ion-input';
import { IonInputPasswordToggle } from '@ionic/angular/ion-input-password-toggle';
import { IonSpinner } from '@ionic/angular/ion-spinner';
import { IonText } from '@ionic/angular/ion-text';
import { NavController } from '@ionic/angular/nav-controller';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { toUserMessage } from '../../core/utils/errors';
import { local, readJson, removeKey, writeJson } from '../../core/utils/storage';

const REMEMBER_KEY = 'ge.remember-email';

/**
 * Vista de inicio de sesión.
 * - Formulario reactivo con validación síncrona (email y longitud mínima).
 * - Two-way binding (`[(ngModel)]`) en la casilla "Recordar mi correo".
 * - Estado de carga y errores anunciados mediante `aria-live`.
 */
@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonInput,
    IonInputPasswordToggle,
    IonCheckbox,
    IonButton,
    IonSpinner,
    IonText,
    IonIcon,
  ],
  templateUrl: './login.page.html',
  styleUrl: '../auth-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly nav = inject(NavController);
  private readonly fb = inject(NonNullableFormBuilder);

  /** Ruta a la que volver tras iniciar sesión (query param `returnUrl`). */
  readonly returnUrl = input<string>();
  /** Motivo de llegada (query param `motivo`), p. ej. `expired`. */
  readonly motivo = input<string>();

  protected readonly form = this.fb.group({
    email: [readJson<string>(local(), REMEMBER_KEY) ?? '', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  /** Enlazado bidireccional con la casilla "Recordar mi correo". */
  protected remember = readJson<string>(local(), REMEMBER_KEY) !== null;
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth
      .login({ email, password })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (user) => {
          if (this.remember) {
            writeJson(local(), REMEMBER_KEY, email);
          } else {
            removeKey(local(), REMEMBER_KEY);
          }
          const fallback = user.role === 'admin' ? '/dashboard' : '/inicio';
          const target = this.returnUrl()?.startsWith('/') ? this.returnUrl()! : fallback;
          void this.nav.navigateRoot(target);
        },
        error: (err) => this.error.set(toUserMessage(err)),
      });
  }
}
