import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-admin-home',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  template: `
    <div class="mx-auto max-w-3xl py-12 text-center">
      <div class="mb-8 inline-flex size-16 items-center justify-center rounded-2xl border border-[var(--color-charcoal-grey)] bg-[var(--color-deep-slate)]">
        <lucide-icon name="settings" [size]="28" class="text-[var(--color-cyan-spark)]"></lucide-icon>
      </div>
      <h1 class="mb-3 text-[28px] font-[590] tracking-tight text-[var(--color-porcelain)]">Administración</h1>
      <p class="text-[15px] text-[var(--color-storm-cloud)]">Gestión de usuarios, seguridad y configuración del sistema.</p>

      <div class="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
        <a routerLink="/admin/usuarios/activos"
           class="group rounded-2xl border border-[var(--color-charcoal-grey)] bg-[var(--color-graphite)]/50 p-6 text-left transition-all hover:border-[var(--color-cyan-spark)]/30 hover:bg-[var(--color-deep-slate)]">
          <div class="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-[var(--color-cyan-spark)]/10">
            <lucide-icon name="users" [size]="20" class="text-[var(--color-cyan-spark)]"></lucide-icon>
          </div>
          <h3 class="text-[16px] font-[590] text-[var(--color-porcelain)] group-hover:text-[var(--color-cyan-spark)]">Usuarios Activos</h3>
          <p class="mt-1 text-[13px] text-[var(--color-storm-cloud)]">Administrá usuarios registrados en el sistema.</p>
        </a>

        <a routerLink="/admin/usuarios/pendientes"
           class="group rounded-2xl border border-[var(--color-charcoal-grey)] bg-[var(--color-graphite)]/50 p-6 text-left transition-all hover:border-[var(--color-neon-lime)]/30 hover:bg-[var(--color-deep-slate)]">
          <div class="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-[var(--color-neon-lime)]/10">
            <lucide-icon name="user-plus" [size]="20" class="text-[var(--color-neon-lime)]"></lucide-icon>
          </div>
          <h3 class="text-[16px] font-[590] text-[var(--color-porcelain)] group-hover:text-[var(--color-neon-lime)]">Aprobaciones</h3>
          <p class="mt-1 text-[13px] text-[var(--color-storm-cloud)]">Aprobá o rechazá solicitudes de registro.</p>
        </a>

        <a routerLink="/admin/seguridad"
           class="group rounded-2xl border border-[var(--color-charcoal-grey)] bg-[var(--color-graphite)]/50 p-6 text-left transition-all hover:border-[var(--color-cyan-spark)]/30 hover:bg-[var(--color-deep-slate)]">
          <div class="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-[var(--color-cyan-spark)]/10">
            <lucide-icon name="shield" [size]="20" class="text-[var(--color-cyan-spark)]"></lucide-icon>
          </div>
          <h3 class="text-[16px] font-[590] text-[var(--color-porcelain)] group-hover:text-[var(--color-cyan-spark)]">Seguridad</h3>
          <p class="mt-1 text-[13px] text-[var(--color-storm-cloud)]">Roles, módulos y usuarios por organización.</p>
        </a>
      </div>
    </div>
  `
})
export class AdminHomeComponent {}
