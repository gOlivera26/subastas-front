import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './modal.html',
  host: { '[attr.title]': 'null' }
})
export class Modal {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() subtitle = '';
  @Input() maxWidthClass = 'max-w-md';
  @Output() close = new EventEmitter<void>();

  readonly modalId = 'app-modal-' + Math.random().toString(36).slice(2, 10);

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('backdrop-layer')) {
      this.close.emit();
    }
  }
}

