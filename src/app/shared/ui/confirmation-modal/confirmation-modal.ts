import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

export type ConfirmType = 'danger' | 'warning' | 'info';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './confirmation-modal.html',
})
export class ConfirmationModal {
  @Input() title = 'Confirmar acción';
  @Input() message = '¿Estás seguro de realizar esta acción?';
  @Input() confirmText = 'Confirmar';
  @Input() type: ConfirmType = 'info';
  @Input() isOpen = false;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm() { this.confirm.emit(); }
  onCancel() { this.cancel.emit(); }
}
