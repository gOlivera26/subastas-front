import { Component, OnInit, inject, signal, computed, TemplateRef, viewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { DataTableComponent, TableColumn } from '../../../shared/components/data-table';
import { CellTemplateDirective } from '../../../shared/directives/cell-template.directive';
import { RoleService, Role, AppPage, ModuloConPaginas, RoleModule } from '../../../core/services/role.service';
import { UserService, ActiveUser } from '../../../core/services/user.service';
import { OrganizationService, Organization } from '../../../core/services/organization.service';

@Component({
  selector: 'app-seguridad',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, DataTableComponent, CellTemplateDirective],
  templateUrl: './seguridad.component.html',
})
export class SeguridadComponent implements OnInit {
  private roleService = inject(RoleService);
  private userService = inject(UserService);
  private orgService = inject(OrganizationService);

  activeTab = signal<'roles' | 'usuarios'>('roles');
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  roles = signal<Role[]>([]);
  isRoleModalOpen = signal(false);
  isEditingRole = signal(false);
  editingRoleId = signal<number | null>(null);
  roleForm = { nombre: '', descripcion: '' };
  isSavingRole = signal(false);

  selectedRole = signal<Role | null>(null);
  rolePages = signal<AppPage[]>([]);
  roleModules = signal<RoleModule[]>([]);
  modulosConPaginas = signal<ModuloConPaginas[]>([]);
  isPagesModalOpen = signal(false);

  activeUsers = signal<ActiveUser[]>([]);
  organizations = signal<Organization[]>([]);
  isLinkModalOpen = signal(false);
  linkForm = { idUsuario: '', idOrganizacion: 0, esPrincipal: true };

  cellTemplateDirectives = viewChildren(CellTemplateDirective);
  cellTemplatesMap = computed(() => {
    const map: Record<string, TemplateRef<any>> = {};
    this.cellTemplateDirectives().forEach(d => { map[d.cellKey] = d.templateRef; });
    return map;
  });

  columns: TableColumn[] = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'acciones', label: 'Acciones', align: 'right', width: '140px' },
  ];
  isLinking = signal(false);

  ngOnInit() {
    this.loadRoles();
    this.loadOrganizations();
  }

  loadRoles() {
    this.isLoading.set(true);
    this.roleService.getAll().subscribe({
      next: (res: any) => { this.isLoading.set(false); if (res.success && res.data) this.roles.set(res.data); },
      error: () => { this.isLoading.set(false); this.errorMessage.set('Error al cargar roles.'); }
    });
    this.roleService.getModulosConPaginas().subscribe({
      next: (res: any) => { if (res.success && res.data) this.modulosConPaginas.set(res.data); }
    });
  }

  loadUsers() { this.userService.getActiveUsers(1, 100, '').subscribe({ next: (res: any) => { if (res.success && res.data) this.activeUsers.set(res.data); } }); }
  loadOrganizations() { this.orgService.getActiveOrganizations().subscribe({ next: (res: any) => { if (res.success && res.data) this.organizations.set(res.data); } }); }

  openCreateRole() { this.isEditingRole.set(false); this.editingRoleId.set(null); this.roleForm = { nombre: '', descripcion: '' }; this.isRoleModalOpen.set(true); }
  openEditRole(role: Role) { this.isEditingRole.set(true); this.editingRoleId.set(role.id); this.roleForm = { nombre: role.nombre, descripcion: role.descripcion }; this.isRoleModalOpen.set(true); }

  saveRole() {
    if (!this.roleForm.nombre) return;
    this.isSavingRole.set(true);
    const obs = this.isEditingRole() && this.editingRoleId() ? this.roleService.update(this.editingRoleId()!, this.roleForm) : this.roleService.create(this.roleForm);
    obs.subscribe({ next: (res: any) => { this.isSavingRole.set(false); if (res.success) { this.isRoleModalOpen.set(false); this.showSuccess('Rol guardado.'); this.loadRoles(); } }, error: () => { this.isSavingRole.set(false); this.errorMessage.set('Error al guardar rol.'); } });
  }

  deleteRole(role: Role) {
    if (!confirm(`¿Eliminar rol "${role.nombre}"?`)) return;
    this.roleService.delete(role.id).subscribe({ next: (res: any) => { if (res.success) { this.showSuccess('Rol eliminado.'); this.loadRoles(); } }, error: () => this.errorMessage.set('Error al eliminar rol.') });
  }

  openPagesModal(role: Role) {
    this.selectedRole.set(role);
    this.isPagesModalOpen.set(true);
    this.roleService.getPagesByRole(role.id).subscribe({
      next: (res: any) => { if (res.success && res.data) this.rolePages.set(res.data); }
    });
    this.roleService.getModules(role.id).subscribe({
      next: (res: any) => { if (res.success && res.data) this.roleModules.set(res.data); }
    });
  }

  toggleModulo(mcp: ModuloConPaginas) {
    const role = this.selectedRole(); if (!role) return;
    if (this.isModuloAssigned(mcp.idModulo)) {
      this.roleService.unassignModule(role.id, mcp.idModulo).subscribe({
        next: () => {
          this.showSuccess(`Módulo "${mcp.moduloTitulo}" quitado.`);
          this.roleModules.update(mods => mods.filter(m => m.idModulo !== mcp.idModulo));
          this.rolePages.update(pages => pages.filter(p => p.idModulo !== mcp.idModulo));
        },
        error: () => this.errorMessage.set('Error al quitar módulo.')
      });
    } else {
      this.roleService.assignModule(role.id, mcp.idModulo).subscribe({
        next: () => {
          this.showSuccess(`Módulo "${mcp.moduloTitulo}" asignado.`);
          this.roleModules.update(mods => [...mods, { idRolModulo: 0, idRol: role.id, idModulo: mcp.idModulo, moduloKeyName: '', moduloTitulo: mcp.moduloTitulo }]);
        },
        error: () => this.errorMessage.set('Error al asignar módulo.')
      });
    }
  }

  isModuloAssigned(idModulo: number): boolean {
    return this.roleModules().some(m => m.idModulo === idModulo);
  }

  assignPage(page: AppPage) {
    const role = this.selectedRole(); if (!role) return;
    this.roleService.assignPage(role.id, page.id).subscribe({
      next: () => { this.showSuccess(`"${page.titulo}" asignada.`); this.roleService.getPagesByRole(role.id).subscribe({ next: (res: any) => { if (res.success && res.data) this.rolePages.set(res.data); } }); },
      error: () => this.errorMessage.set('Error al asignar.')
    });
  }

  unassignPage(page: AppPage) {
    const role = this.selectedRole(); if (!role) return;
    this.roleService.unassignPage(role.id, page.id).subscribe({
      next: (res: any) => { if (res.success) { this.showSuccess('Desasignada.'); this.rolePages.update(pages => pages.filter(p => p.id !== page.id)); } },
      error: () => this.errorMessage.set('Error al desasignar.')
    });
  }

  isPageAssigned(page: AppPage): boolean { return this.rolePages().some(p => p.id === page.id); }

  openLinkModal() { this.loadUsers(); this.linkForm = { idUsuario: '', idOrganizacion: 0, esPrincipal: true }; this.isLinkModalOpen.set(true); }

  linkUserToOrg() {
    if (!this.linkForm.idUsuario || !this.linkForm.idOrganizacion) return;
    this.isLinking.set(true);
    this.userService.linkUser(this.linkForm.idUsuario, { tipoEntidad: 'GESTOR', idEntidad: this.linkForm.idOrganizacion }).subscribe({
      next: (res: any) => { this.isLinking.set(false); if (res.success) { this.isLinkModalOpen.set(false); this.showSuccess('Asignado.'); } },
      error: () => { this.isLinking.set(false); this.errorMessage.set('Error al asignar.'); }
    });
  }

  private showSuccess(msg: string) { this.successMessage.set(msg); setTimeout(() => this.successMessage.set(null), 3000); }
}
