import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonBackButton } from '@ionic/angular/ion-back-button';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonInput } from '@ionic/angular/ion-input';
import { IonSelect } from '@ionic/angular/ion-select';
import { IonSelectOption } from '@ionic/angular/ion-select-option';
import { IonSpinner } from '@ionic/angular/ion-spinner';
import { IonText } from '@ionic/angular/ion-text';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToggle } from '@ionic/angular/ion-toggle';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { finalize } from 'rxjs';
import { CATEGORIES, Category, ProductInput } from '../../core/models/product.model';
import { NotificationService } from '../../core/services/notification.service';
import { ProductService } from '../../core/services/product.service';
import { InventoryStore } from '../../core/store/inventory.store';
import { toUserMessage } from '../../core/utils/errors';
import { uniqueValueValidator } from '../../core/validators/validators';
import { LoadState } from '../../shared/components/load-state/load-state';

/**
 * Alta y edición de productos (solo Administrador).
 * El SKU se valida de forma asíncrona contra la API para garantizar que es único.
 */
@Component({
  selector: 'app-product-form',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonButton,
    IonSpinner,
    IonText,
    LoadState,
  ],
  templateUrl: './product-form.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormPage implements OnInit {
  private readonly api = inject(ProductService);
  private readonly store = inject(InventoryStore);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);

  /** Parámetro de ruta `:id` (vacío en modo alta). */
  readonly id = input<string>();
  protected readonly productId = computed(() => (this.id() ? Number(this.id()) : undefined));
  protected readonly isEdit = computed(() => this.productId() !== undefined);

  protected readonly categories = CATEGORIES;
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Two-way binding: tras guardar, mantener el formulario abierto para otro alta. */
  protected keepAdding = false;

  protected readonly form = this.fb.group({
    sku: this.fb.control('', {
      validators: [Validators.required, Validators.pattern(/^[A-Za-z]{2}-\d{3}$/)],
      asyncValidators: [uniqueValueValidator((v) => this.api.skuExists(v, this.productId()), 'skuTaken')],
    }),
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
    category: this.fb.control<Category>('Hardware', Validators.required),
    stock: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    price: [0, [Validators.required, Validators.min(0)]],
    supplier: ['', [Validators.maxLength(60)]],
  });

  protected readonly skuStatus = toSignal(this.form.controls.sku.statusChanges, {
    initialValue: this.form.controls.sku.status,
  });

  ngOnInit(): void {
    if (this.isEdit()) {
      this.loadProduct();
    }
  }

  protected loadProduct(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api
      .getById(this.productId()!)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ id: _id, updatedAt: _u, ...data }) => this.form.setValue(data),
        error: (err) => this.loadError.set(toUserMessage(err)),
      });
  }

  protected skuError(): string {
    const c = this.form.controls.sku;
    if (c.hasError('required')) return 'El SKU es obligatorio.';
    if (c.hasError('pattern')) return 'Formato: dos letras, guion y tres números (p. ej. HW-010).';
    if (c.hasError('skuTaken')) return 'Ya existe un producto con este SKU.';
    return '';
  }

  protected submit(): void {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const input: ProductInput = { ...raw, stock: Number(raw.stock), price: Number(raw.price) };
    const request = this.isEdit() ? this.api.update(this.productId()!, input) : this.api.create(input);

    this.saving.set(true);
    this.error.set(null);
    request
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (product) => {
          this.store.upsertProduct(product);
          void this.notify.toast(`Producto «${product.name}» ${this.isEdit() ? 'actualizado' : 'creado'}.`);
          if (!this.isEdit() && this.keepAdding) {
            this.form.reset();
          } else {
            void this.router.navigate(['/productos']);
          }
        },
        error: (err) => this.error.set(toUserMessage(err)),
      });
  }
}
