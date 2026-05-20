import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './toast-container.html',
})
export class ToastContainer {
  notificationService = inject(NotificationService);
}
