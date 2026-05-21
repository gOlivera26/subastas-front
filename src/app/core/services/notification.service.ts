import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  toasts = signal<Toast[]>([]);

  showSuccess(message: string) {
    this.addToast(message, 'success');
  }

  showError(message: string) {
    this.addToast(message, 'error');
  }

  showInfo(message: string) {
    this.addToast(message, 'info');
  }

  showWarning(message: string) {
    this.addToast(message, 'warning');
  }

  remove(id: number) {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }

  private addToast(message: string, type: 'success' | 'error' | 'info' | 'warning') {
    const id = Date.now();
    const newToast: Toast = { id, message, type };
    this.toasts.update(current => [...current, newToast]);
    setTimeout(() => {
      this.remove(id);
    }, 4000);
  }
}
