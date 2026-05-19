import { Component, OnInit, inject, signal, computed, TemplateRef, viewChildren, Directive, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { DatePipe, NgClass } from '@angular/common';
import { ActiveUser, UserAudit, UserService } from '../../../../core/services/user.service';
import { Role, RoleService } from '../../../../core/services/role.service';
import { Organization, OrganizationService } from '../../../../core/services/organization.service';
import { ProviderService, ProviderResponse } from '../../../../core/services/provider.service';
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
  selector: 'app-active-users',
  standalone: true,
  imports: [LucideAngularModule, ReactiveFormsModule, NgClass, DatePipe, DataTableComponent, CellTemplateDirective],
  templateUrl: './active-users.component.html'
})
export class ActiveUsersComponent implements OnInit {
  private userService = inject(UserService);
  private roleService = inject(RoleService);
  private orgService = inject(OrganizationService);
  private providerService = inject(ProviderService);

  // GRILLA Y PAGINACIÓN
  activeUsers = signal<ActiveUser[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  searchControl = new FormControl('');
  currentPage = signal(1);
  pageSize = signal(10);
  totalRows = signal(0);
  Math = Math;

  columns: TableColumn[] = [
    { key: 'estado', label: 'Estado', sortable: true, width: '100px' },
    { key: 'nombreCompleto', label: 'Usuario / Contacto', sortable: true },
    { key: 'documento', label: 'Documento', sortable: true, width: '120px' },
    { key: 'rol', label: 'Rol del Sistema', width: '120px' },
    { key: 'tipoUsuario', label: 'Tipo / Entidad' },
    { key: 'acciones', label: 'Acciones', align: 'right', width: '160px' },
  ];

  cellTemplateDirectives = viewChildren(CellTemplateDirective);
  cellTemplatesMap = computed(() => {
    const map: Record<string, TemplateRef<any>> = {};
    this.cellTemplateDirectives().forEach(d => {
      map[d.cellKey] = d.templateRef;
    });
    return map;
  });

  sortKey = signal<string>('nombreCompleto');
  sortDirection = signal<'asc' | 'desc'>('asc');

  onSort(event: { key: string; direction: 'asc' | 'desc' }) {
    this.sortKey.set(event.key);
    this.sortDirection.set(event.direction);
    this.currentPage.set(1);
    this.loadUsers();
  }

  onPageChange(event: { page: number; pageSize: number }) {
    this.currentPage.set(event.page);
    this.pageSize.set(event.pageSize);
    this.loadUsers();
  }

  // ESTADOS COMUNES PARA MODALES
  selectedUser = signal<ActiveUser | null>(null);

  // 1. MODAL ROLES
  roles = signal<Role[]>([]);
  isRoleModalOpen = signal(false);
  isUpdatingRole = signal(false);
  selectedRoleId = signal<number | ''>('');

  // 2. MODAL VINCULAR (Apretón de Manos)
  isLinkModalOpen = signal(false);
  isLinking = signal(false);
  linkType = signal<'GESTOR' | 'PROVEEDOR'>('GESTOR');
  linkErrorMessage = signal<string | null>(null);
  organizations = signal<Organization[]>([]);
  selectedOrgId = signal<number | ''>('');
  cuitSearchControl = new FormControl('');
  isVerifyingCuit = signal(false);
  verifiedProvider = signal<ProviderResponse | null>(null);

  // 3. MODAL BLANQUEAR CLAVE
  isResetModalOpen = signal(false);
  isResetting = signal(false);
  newTempPassword = signal<string | null>(null);

  // 4. MODAL DESVINCULAR
  isUnlinkModalOpen = signal(false);
  isUnlinking = signal(false);

  // 5. MODAL AUDITORÍA (Mano tocando)
  isAuditModalOpen = signal(false);
  isLoadingAudit = signal(false);
  auditData = signal<UserAudit | null>(null);

  ngOnInit() {
    this.loadUsers();
    this.loadRoles();
    this.loadOrganizations();

    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage.set(1);
      this.loadUsers();
    });
  }

  loadRoles() {
    this.roleService.getActiveRoles().subscribe({
      next: (res) => { if (res.success && res.data) this.roles.set(res.data); }
    });
  }

  loadOrganizations() {
    this.orgService.getActiveOrganizations().subscribe({
      next: (res) => { if (res.success && res.data) this.organizations.set(res.data); }
    });
  }

  loadUsers() {
    this.isLoading.set(true);
    const term = this.searchControl.value || '';
    
    this.userService.getActiveUsers(this.currentPage(), this.pageSize(), term, this.sortKey(), this.sortDirection()).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.activeUsers.set(res.data);
          this.totalRows.set(res.totalRows || 0);
        } else {
          this.activeUsers.set([]);
          this.totalRows.set(0);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.activeUsers.set([]);
        this.errorMessage.set('Error al cargar la lista de usuarios.');
      }
    });
  }

  changePage(newPage: number) {
    if (newPage < 1 || newPage > Math.ceil(this.totalRows() / this.pageSize())) return;
    this.currentPage.set(newPage);
    this.loadUsers();
  }

  // ==========================================
  // LÓGICA DE MODALES
  // ==========================================

  // --- 1. GESTIONAR ROL ---
  manageRoles(user: ActiveUser) { 
    this.selectedUser.set(user);
    this.selectedRoleId.set('');
    this.isRoleModalOpen.set(true);
  }

  closeRoleModal() {
    this.isRoleModalOpen.set(false);
    this.selectedUser.set(null);
  }

  confirmRoleUpdate() {
    const user = this.selectedUser();
    const newRole = this.selectedRoleId();
    if (!user || newRole === '') return;

    this.isUpdatingRole.set(true);
    this.userService.updateUserRole(user.idUsuario, Number(newRole)).subscribe({
      next: (res) => {
        this.isUpdatingRole.set(false);
        if (res.success) {
          this.closeRoleModal();
          this.loadUsers();
        }
      },
      error: () => this.isUpdatingRole.set(false)
    });
  }

  // --- 2. VINCULAR ENTIDAD ---
  linkEntity(user: ActiveUser) { 
    this.selectedUser.set(user);
    this.linkType.set('GESTOR');
    this.selectedOrgId.set('');
    this.cuitSearchControl.setValue('');
    this.verifiedProvider.set(null);
    this.linkErrorMessage.set(null);
    this.isLinkModalOpen.set(true);
  }

  setLinkType(type: 'GESTOR' | 'PROVEEDOR') {
    this.linkType.set(type);
    this.linkErrorMessage.set(null);
    this.selectedOrgId.set('');
    this.cuitSearchControl.setValue('');
    this.verifiedProvider.set(null);
  }

  verifyCuit() {
    const cuit = this.cuitSearchControl.value;
    if (!cuit) return;

    this.isVerifyingCuit.set(true);
    this.linkErrorMessage.set(null);

    this.providerService.verifyCuit(cuit).subscribe({
      next: (res) => {
        this.isVerifyingCuit.set(false);
        if (res.success && res.data) this.verifiedProvider.set(res.data);
      },
      error: (err) => {
        this.isVerifyingCuit.set(false);
        this.verifiedProvider.set(null);
        this.linkErrorMessage.set(err.error?.message || 'Error al verificar CUIT.');
      }
    });
  }

  confirmLink() {
    const user = this.selectedUser();
    if (!user) return;

    let idEntidad: number;
    if (this.linkType() === 'GESTOR') {
      if (this.selectedOrgId() === '') {
        this.linkErrorMessage.set('Debe seleccionar una Organización.');
        return;
      }
      idEntidad = Number(this.selectedOrgId());
    } else {
      const prov = this.verifiedProvider();
      if (!prov) {
        this.linkErrorMessage.set('Debe verificar un CUIT válido.');
        return;
      }
      idEntidad = prov.id;
    }

    this.isLinking.set(true);
    this.linkErrorMessage.set(null);

    this.userService.linkUser(user.idUsuario, { tipoEntidad: this.linkType(), idEntidad }).subscribe({
      next: (res) => {
        this.isLinking.set(false);
        if (res.success) {
          this.closeLinkModal();
          this.loadUsers();
        }
      },
      error: (err) => {
        this.isLinking.set(false);
        this.linkErrorMessage.set(err.error?.message || 'Error al vincular la entidad.');
      }
    });
  }

  closeLinkModal() {
    this.isLinkModalOpen.set(false);
    this.selectedUser.set(null);
  }

  // --- 3. BLANQUEAR CLAVE ---
  openResetModal(user: ActiveUser) {
    this.selectedUser.set(user);
    this.newTempPassword.set(null);
    this.isResetModalOpen.set(true);
  }

  confirmResetPassword() {
    const user = this.selectedUser();
    if (!user) return;

    this.isResetting.set(true);
    this.userService.resetPassword(user.idUsuario).subscribe({
      next: (res) => {
        this.isResetting.set(false);
        if (res.success && res.data) this.newTempPassword.set(res.data);
      },
      error: () => this.isResetting.set(false)
    });
  }

  closeResetModal() {
    this.isResetModalOpen.set(false);
    this.selectedUser.set(null);
    this.newTempPassword.set(null);
  }

  // --- 4. DESVINCULAR ---
  openUnlinkModal(user: ActiveUser) {
    this.selectedUser.set(user);
    this.isUnlinkModalOpen.set(true);
  }

  confirmUnlink() {
    const user = this.selectedUser();
    if (!user) return;

    this.isUnlinking.set(true);
    this.userService.unlinkUser(user.idUsuario).subscribe({
      next: (res) => {
        this.isUnlinking.set(false);
        if (res.success) {
          this.closeUnlinkModal();
          this.loadUsers();
        }
      },
      error: () => this.isUnlinking.set(false)
    });
  }

  closeUnlinkModal() {
    this.isUnlinkModalOpen.set(false);
    this.selectedUser.set(null);
  }

  // --- 5. VER ACCESOS ---
  viewAccessLogs(user: ActiveUser) { 
    this.selectedUser.set(user);
    this.isAuditModalOpen.set(true);
    this.isLoadingAudit.set(true);
    this.auditData.set(null);

    this.userService.getUserAudit(user.idUsuario).subscribe({
      next: (res) => {
        this.isLoadingAudit.set(false);
        if (res.success && res.data) {
          this.auditData.set(res.data);
        }
      },
      error: () => {
        this.isLoadingAudit.set(false);
      }
    });
  }

  closeAuditModal() {
    this.isAuditModalOpen.set(false);
    this.selectedUser.set(null);
    this.auditData.set(null);
  }
}