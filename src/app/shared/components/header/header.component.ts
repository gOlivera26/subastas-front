import { Component, HostListener, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { NgClass } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileResponse } from '../../../core/models/auth.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, NgClass, ReactiveFormsModule],
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit {
  authService = inject(AuthService);
  private fb = inject(FormBuilder);
  
  isMobileMenuOpen = signal(false);
  isScrolled = signal(false);
  isUserMenuOpen = signal(false); 
  isProfileModalOpen = signal(false);
  isPasswordModalOpen = signal(false);
  isDarkMode = signal(true);

  user = computed(() => this.authService.currentUser());

  profileData = signal<ProfileResponse | null>(null);
  isLoadingProfile = signal(false);

  passwordForm: FormGroup;
  isSubmittingPassword = signal(false);
  passwordError = signal<string | null>(null);
  passwordSuccess = signal<string | null>(null);

  isEditingProfile = signal(false);
  isSubmittingProfile = signal(false);
  profileForm: FormGroup;

  constructor() {
    this.passwordForm = this.fb.group({
      passwordActual: ['', Validators.required],
      nuevaPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmarPassword: ['', Validators.required]
    }, { validators: this.passwordsMatchValidator })

  this.profileForm = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      telefono: ['']
    });
  }

  ngOnInit() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.isDarkMode.set(true);
      document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
      this.isDarkMode.set(false);
      document.documentElement.classList.remove('dark');
    } else {
      this.isDarkMode.set(document.documentElement.classList.contains('dark'));
    }
  }

  toggleTheme() {
    this.isDarkMode.update(v => !v);
    if (this.isDarkMode()) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }

  passwordsMatchValidator(g: FormGroup) {
    return g.get('nuevaPassword')?.value === g.get('confirmarPassword')?.value
      ? null : { mismatch: true };
  }

  toggleMenu() { this.isMobileMenuOpen.update(v => !v); }
  closeMenu() { this.isMobileMenuOpen.set(false); }
  toggleUserMenu() { this.isUserMenuOpen.update(v => !v); }
  
  openProfile() { 
    this.isProfileModalOpen.set(true); 
    this.isUserMenuOpen.set(false); 
    this.closeMenu(); 
    this.isEditingProfile.set(false);

    this.isLoadingProfile.set(true);
    this.authService.getProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.profileData.set(res.data);
          this.profileForm.patchValue({
            nombre: res.data.nombre,
            apellido: res.data.apellido,
            telefono: res.data.telefono === 'No especificado' ? '' : res.data.telefono
          });
        }
        this.isLoadingProfile.set(false);
      },
      error: () => this.isLoadingProfile.set(false)
    });
  }

 saveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSubmittingProfile.set(true);
    const { nombre, apellido, telefono } = this.profileForm.value;

    this.authService.updateProfile(nombre, apellido, telefono).subscribe({
      next: (res) => {
        this.isSubmittingProfile.set(false);
        if (res.success && res.data) {
          this.profileData.set(res.data);
          this.authService.updateProfileCache(`${res.data.nombre} ${res.data.apellido}`);
          this.isEditingProfile.set(false);
        }
      },
      error: (err) => {
        this.isSubmittingProfile.set(false);
        console.error(err);
      }
    });
  }
  
  toggleEditProfile() {
    this.isEditingProfile.update(v => !v);
  }

  closeProfile() { 
    this.isProfileModalOpen.set(false); 
  }

  openPassword() { 
    this.isPasswordModalOpen.set(true); 
    this.isUserMenuOpen.set(false); 
    this.closeMenu(); 
    this.passwordForm.reset();
    this.passwordError.set(null);
    this.passwordSuccess.set(null);
  }
  
  closePassword() { 
    this.isPasswordModalOpen.set(false); 
  }

  changePasswordSubmit() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isSubmittingPassword.set(true);
    this.passwordError.set(null);
    this.passwordSuccess.set(null);

    const { passwordActual, nuevaPassword } = this.passwordForm.value;

    this.authService.changePassword(passwordActual, nuevaPassword).subscribe({
      next: (res) => {
        this.isSubmittingPassword.set(false);
        if (res.success) {
          this.passwordSuccess.set('Contraseña actualizada correctamente.');
          this.passwordForm.reset();
          // Cerramos el modal después de 2 segundos
          setTimeout(() => this.closePassword(), 2000);
        }
      },
      error: (err) => {
        this.isSubmittingPassword.set(false);
        this.passwordError.set(err.error?.message || 'Error al cambiar la contraseña.');
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const targetElement = event.target as HTMLElement;
    if (!targetElement.closest('#user-menu-button') && !targetElement.closest('#user-dropdown')) {
      this.isUserMenuOpen.set(false);
    }
  }

  logout() {
    this.authService.logout();
    this.closeMenu();
    this.isUserMenuOpen.set(false);
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled.set(window.scrollY > 20);
  }
}