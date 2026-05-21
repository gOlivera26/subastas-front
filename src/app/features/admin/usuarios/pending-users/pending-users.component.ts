import { Component, OnInit, inject, signal, computed, TemplateRef, viewChildren, Directive, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { UserService, PendingUser } from '../../../../core/services/user.service';
import { RouterLink } from '@angular/router';
import { DataTableComponent, TableColumn } from '../../../../shared/components/data-table';

@Directive({
  selector: 'ng-template[cellKey]',
  standalone: true,
})
export class CellTemplateDirective {
  @Input({ required: true }) cellKey!: string;
  constructor(public templateRef: TemplateRef<any>) {}
}

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [LucideAngularModule, DatePipe, RouterLink, DataTableComponent, CellTemplateDirective],
  templateUrl: './pending-users.component.html',
})
export class AdminUsuariosComponent implements OnInit {
  private userService = inject(UserService);

  pendingUsers = signal<PendingUser[]>([]);
  isLoading = signal(true);
  processingId = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  isApproveModalOpen = signal(false);
  selectedUserToApprove = signal<{id: string, nombre: string} | null>(null);

  columns: TableColumn[] = [
    { key: 'nombreCompleto', label: 'Usuario / Contacto' },
    { key: 'documento', label: 'Documento', width: '120px' },
    { key: 'tipoUsuario', label: 'Rol / Entidad Representada' },
    { key: 'fechaRegistro', label: 'Fecha Solicitud', width: '150px' },
    { key: 'acciones', label: 'Acción', align: 'right', width: '130px' },
  ];

  cellTemplateDirectives = viewChildren(CellTemplateDirective);
  cellTemplatesMap = computed(() => {
    const map: Record<string, TemplateRef<any>> = {};
    this.cellTemplateDirectives().forEach(d => {
      map[d.cellKey] = d.templateRef;
    });
    return map;
  });

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

  openApproveModal(userId: string, nombre: string) {
    this.selectedUserToApprove.set({ id: userId, nombre });
    this.isApproveModalOpen.set(true);
  }

  closeApproveModal() {
    this.isApproveModalOpen.set(false);
    this.selectedUserToApprove.set(null);
  }

  confirmApproval() {
    const user = this.selectedUserToApprove();
    if (!user) return;

    this.processingId.set(user.id);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.userService.approveUser(user.id).subscribe({
      next: (res) => {
        this.processingId.set(null);
        if (res.success) {
          this.successMessage.set(`Usuario ${user.nombre} aprobado correctamente.`);
          this.pendingUsers.update(users => users.filter(u => u.idUsuario !== user.id));
          this.closeApproveModal();
          setTimeout(() => this.successMessage.set(null), 3000);
        }
      },
      error: (err) => {
        this.processingId.set(null);
        this.errorMessage.set(err.error?.message || 'Error al aprobar al usuario.');
        this.closeApproveModal();
      }
    });
  }
}