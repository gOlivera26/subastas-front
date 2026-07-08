import { Injectable, signal } from '@angular/core';

export type ConfirmationType = 'danger' | 'warning' | 'info';

export interface ConfirmationOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmationType;
}

interface ActiveConfirmation {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: ConfirmationType;
  resolve: (confirmed: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  private readonly state = signal<ActiveConfirmation | null>(null);
  readonly current = this.state.asReadonly();

  confirm(options: ConfirmationOptions): Promise<boolean> {
    const previous = this.state();
    if (previous) previous.resolve(false);

    return new Promise<boolean>((resolve) => {
      this.state.set({
        title: options.title ?? 'Confirmar acción',
        message: options.message,
        confirmText: options.confirmText ?? 'Confirmar',
        cancelText: options.cancelText ?? 'Cancelar',
        type: options.type ?? 'info',
        resolve,
      });
    });
  }

  accept() {
    this.close(true);
  }

  cancel() {
    this.close(false);
  }

  private close(confirmed: boolean) {
    const active = this.state();
    if (!active) return;
    this.state.set(null);
    active.resolve(confirmed);
  }
}
