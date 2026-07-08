import { Component, OnInit, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { UserService, PendingUser } from '../../../../core/services/user.service';
import { RouterLink } from '@angular/router';
import { SmartTableComponent } from '../../../../shared/ui/smart-table/smart-table';
import { TableAction, TableColumn } from '../../../../shared/ui/smart-table/table.models';

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [LucideAngularModule, DatePipe, RouterLink, SmartTableComponent],
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
    { key: 'nombreCompleto', header: 'Usuario / Contacto', type: 'custom', sortable: true },
    { key: 'documento', header: 'Documento', type: 'custom', sortable: true },
    { key: 'tipoUsuario', header: 'Rol / Entidad Representada', type: 'custom' },
    { key: 'fechaRegistro', header: 'Fecha Solicitud', type: 'custom', sortable: true },
  ];

  actions: TableAction[] = [
    { action: 'approve', icon: 'check-circle', tooltip: 'Aprobar usuario', color: 'text-[var(--color-neon-lime)] hover:text-[var(--color-neon-lime)]' },
  ];

  nombreCompletoTpl = viewChild<TemplateRef<any>>('nombreCompletoTpl');
  documentoTpl = viewChild<TemplateRef<any>>('documentoTpl');
  tipoUsuarioTpl = viewChild<TemplateRef<any>>('tipoUsuarioTpl');
  fechaRegistroTpl = viewChild<TemplateRef<any>>('fechaRegistroTpl');

  customTemplates = computed(() => {
    const templates: Record<string, TemplateRef<any>> = {};
    const nombreCompleto = this.nombreCompletoTpl();
    const documento = this.documentoTpl();
    const tipoUsuario = this.tipoUsuarioTpl();
    const fechaRegistro = this.fechaRegistroTpl();

    if (nombreCompleto) templates['nombreCompleto'] = nombreCompleto;
    if (documento) templates['documento'] = documento;
    if (tipoUsuario) templates['tipoUsuario'] = tipoUsuario;
    if (fechaRegistro) templates['fechaRegistro'] = fechaRegistro;

    return templates;
  });

  handleTableAction(event: { action: string; row: PendingUser }) {
    if (event.action === 'approve' && this.processingId() !== event.row.idUsuario) {
      this.openApproveModal(event.row.idUsuario, event.row.nombreCompleto);
    }
  }

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