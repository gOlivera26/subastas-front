import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { UserService, PendingUser } from '../../../../core/services/user.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [LucideAngularModule, DatePipe, RouterLink],
  templateUrl: './pending-users.component.html',
})
export class AdminUsuariosComponent implements OnInit {
  private userService = inject(UserService);

  pendingUsers = signal<PendingUser[]>([]);
  isLoading = signal(true);
  processingId = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.loadPendingUsers();
  }

  loadPendingUsers() {
    this.isLoading.set(true);
    this.userService.getPendingUsers().subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.pendingUsers.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set('Error al cargar la lista de usuarios pendientes.');
        console.error(err);
      }
    });
  }

  approveUser(userId: string, nombre: string) {
    this.processingId.set(userId);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.userService.approveUser(userId).subscribe({
      next: (res) => {
        this.processingId.set(null);
        if (res.success) {
          this.successMessage.set(`Usuario ${nombre} aprobado correctamente.`);
          // Removemos al usuario de la lista visualmente
          this.pendingUsers.update(users => users.filter(u => u.idUsuario !== userId));
          
          setTimeout(() => this.successMessage.set(null), 3000);
        }
      },
      error: (err) => {
        this.processingId.set(null);
        this.errorMessage.set(err.error?.message || 'Error al aprobar al usuario.');
      }
    });
  }
}