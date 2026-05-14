import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { OrganizationService, Organization } from '../../../core/services/organization.service';
import { ProviderService, ProviderResponse } from '../../../core/services/provider.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private orgService = inject(OrganizationService);
  private providerService = inject(ProviderService);
  private router = inject(Router);

  registerForm: FormGroup;
  organizations = signal<Organization[]>([]);
  
  // Estados de la UI
  isLoading = signal(false);
  isSuccess = signal(false);
  errorMessage = signal<string | null>(null);
  
  // Lógica de Caminos (Gestor vs Proveedor)
  registrationType = signal<'GESTOR' | 'PROVEEDOR'>('GESTOR');
  isVerifyingCuit = signal(false);
  verifiedProvider = signal<ProviderResponse | null>(null);

  constructor() {
    this.registerForm = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      nroDocumento: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      idRol: [2], // Rol base por defecto
      idTipoPersona: [1],
      idTipoDocumento: [1],
      
      // Campos condicionales
      idOrganizacion: [''],
      cuitSearch: [''],
      idProveedor: ['']
    });
  }

  ngOnInit() {
    this.orgService.getActiveOrganizations().subscribe({
      next: (res) => {
        if (res.success) this.organizations.set(res.data);
      },
      error: () => this.errorMessage.set('No se pudieron cargar las organizaciones.')
    });
  }

  setRegistrationType(type: 'GESTOR' | 'PROVEEDOR') {
    this.registrationType.set(type);
    this.errorMessage.set(null);
    this.verifiedProvider.set(null);
    // Limpiamos los campos condicionales al cambiar de pestaña
    this.registerForm.patchValue({ idOrganizacion: '', cuitSearch: '', idProveedor: '' });
  }

  verifyCuit() {
    const cuit = this.registerForm.get('cuitSearch')?.value;
    if (!cuit) return;

    this.isVerifyingCuit.set(true);
    this.errorMessage.set(null);

    this.providerService.verifyCuit(cuit).subscribe({
      next: (res) => {
        this.isVerifyingCuit.set(false);
        if (res.success && res.data) {
          this.verifiedProvider.set(res.data);
          this.registerForm.patchValue({ idProveedor: res.data.id });
        }
      },
      error: (err) => {
        this.isVerifyingCuit.set(false);
        this.verifiedProvider.set(null);
        this.registerForm.patchValue({ idProveedor: '' });
        this.errorMessage.set(err.error?.message || 'Error al verificar CUIT.');
      }
    });
  }

  onSubmit() {
    // Validaciones personalizadas según el tipo de registro elegido
    if (this.registrationType() === 'GESTOR' && !this.registerForm.get('idOrganizacion')?.value) {
      this.errorMessage.set('Debe seleccionar una Organización para registrarse.');
      return;
    }

    if (this.registrationType() === 'PROVEEDOR' && !this.registerForm.get('idProveedor')?.value) {
      this.errorMessage.set('Debe verificar un CUIT válido para poder registrarse como Proveedor.');
      return;
    }

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Armamos el payload
    const payload = { ...this.registerForm.value };
    
    // Eliminamos lo que el backend no necesita
    delete payload.cuitSearch;

    // 👇 LA SOLUCIÓN: Convertimos strings vacíos a null y forzamos que sean números
    payload.idOrganizacion = payload.idOrganizacion ? Number(payload.idOrganizacion) : null;
    payload.idProveedor = payload.idProveedor ? Number(payload.idProveedor) : null;

    this.authService.register(payload).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.isSuccess.set(true);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Error al procesar el registro.');
      }
    });
  }
}