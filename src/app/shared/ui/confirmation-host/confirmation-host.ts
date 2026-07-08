import { Component, inject } from '@angular/core';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { ConfirmationModal } from '../confirmation-modal/confirmation-modal';

@Component({
  selector: 'app-confirmation-host',
  standalone: true,
  imports: [ConfirmationModal],
  template: `
    @if (confirmation.current(); as request) {
      <app-confirmation-modal
        [isOpen]="true"
        [title]="request.title"
        [message]="request.message"
        [confirmText]="request.confirmText"
        [cancelText]="request.cancelText"
        [type]="request.type"
        (confirm)="confirmation.accept()"
        (cancel)="confirmation.cancel()">
      </app-confirmation-modal>
    }
  `,
})
export class ConfirmationHost {
  confirmation = inject(ConfirmationService);
}
