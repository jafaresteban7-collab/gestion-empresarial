import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonBackButton } from '@ionic/angular/ion-back-button';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonCard } from '@ionic/angular/ion-card';
import { IonCardContent } from '@ionic/angular/ion-card-content';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonInput } from '@ionic/angular/ion-input';
import { IonInputPasswordToggle } from '@ionic/angular/ion-input-password-toggle';
import { IonSelect } from '@ionic/angular/ion-select';
import { IonSelectOption } from '@ionic/angular/ion-select-option';
import { IonSpinner } from '@ionic/angular/ion-spinner';
import { IonText } from '@ionic/angular/ion-text';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { DEPARTMENTS } from '../../core/models/user.model';
import { NotificationService } from '../../core/services/notification.service';
import { toUserMessage } from '../../core/utils/errors';
import { fieldsMatch, strongPassword, uniqueValueValidator } from '../../core/validators/validators';

/**
 * Alta de usuario estándar.
 * Incluye validación asíncrona contra la API: comprueba, mientras se escribe,
 * si el correo electrónico ya está registrado en la base de datos.
 */
@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonInput,
    IonInputPasswordToggle,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonSpinner,
    IonText,
    IonIcon,
  ],
  templateUrl: './register.page.html',
  styleUrl: '../auth-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly departments = DEPARTMENTS;

  protected readonly form = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(60)]],
      email: this.fb.control('', {
        validators: [Validators.required, Validators.email],
        asyncValidators: [uniqueValueValidator((v) => this.auth.emailExists(v), 'emailTaken')],
      }),
      department: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8), strongPassword]],
      confirm: ['', Validators.required],
    },
    { validators: fieldsMatch('password', 'confirm') },
  );

  /** Estado del control de email (VALID, INVALID, PENDING…) como señal. */
  protected readonly emailStatus = toSignal(this.form.controls.email.statusChanges, {
    initialValue: this.form.controls.email.status,
  });

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Texto de error del correo según la validación que falle. */
  protected emailError(): string {
    const c = this.form.controls.email;
    if (c.hasError('required')) return 'El correo es obligatorio.';
    if (c.hasError('email')) return 'Formato de correo no válido.';
    if (c.hasError('emailTaken')) return 'Este correo ya está registrado.';
    return '';
  }

  /** Texto de error de la contraseña. */
  protected passwordError(): string {
    const c = this.form.controls.password;
    if (c.hasError('required')) return 'La contraseña es obligatoria.';
    if (c.hasError('minlength')) return 'Mínimo 8 caracteres.';
    if (c.hasError('weakPassword')) return 'Debe incluir mayúscula, minúscula, número y símbolo.';
    return '';
  }

  protected submit(): void {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      return;
    }
    const { confirm: _confirm, ...data } = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.auth
      .register(data)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          void this.notify.toast('Cuenta creada. Ya puede iniciar sesión.');
          void this.router.navigate(['/login']);
        },
        error: (err) => this.error.set(toUserMessage(err)),
      });
  }
}
