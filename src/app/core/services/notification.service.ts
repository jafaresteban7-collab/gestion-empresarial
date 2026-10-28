import { Injectable, inject } from '@angular/core';
import { AlertController } from '@ionic/angular/alert-controller';
import { ToastController } from '@ionic/angular/toast-controller';

/** Servicio de avisos al usuario (toasts accesibles y diálogos de confirmación). */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly toasts = inject(ToastController);
  private readonly alerts = inject(AlertController);

  /** Muestra un aviso breve. Ionic lo anuncia a los lectores de pantalla (role="status"). */
  async toast(message: string, color: 'success' | 'danger' | 'medium' = 'success'): Promise<void> {
    const toast = await this.toasts.create({
      message,
      color,
      duration: 3500,
      position: 'bottom',
      buttons: [{ text: 'Cerrar', role: 'cancel' }],
    });
    await toast.present();
  }

  /** Pide confirmación antes de una acción destructiva. */
  async confirm(header: string, message: string, confirmText = 'Eliminar'): Promise<boolean> {
    const alert = await this.alerts.create({
      header,
      message,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: confirmText, role: 'confirm', cssClass: 'alert-danger' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }
}
