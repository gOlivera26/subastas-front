import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-licitaciones-home',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  template: `
    <div class="mx-auto max-w-3xl py-12 text-center">
      <div class="mb-8 inline-flex size-16 items-center justify-center rounded-2xl border border-[var(--color-charcoal-grey)] bg-[var(--color-deep-slate)]">
        <lucide-icon name="gavel" [size]="28" class="text-[var(--color-neon-lime)]"></lucide-icon>
      </div>
      <h1 class="mb-3 text-[28px] font-[590] tracking-tight text-[var(--color-porcelain)]">Licitaciones y Subastas</h1>
      <p class="text-[15px] text-[var(--color-storm-cloud)]">Configuración y ejecución de procesos de compra.</p>

      <div class="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
        <a routerLink="/licitaciones/subasta" class="group rounded-2xl border border-[var(--color-charcoal-grey)] bg-[var(--color-graphite)]/50 p-6 text-left transition-all hover:border-[var(--color-cyan-spark)]/30 hover:bg-[var(--color-deep-slate)]">
          <div class="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-[var(--color-cyan-spark)]/10"><lucide-icon name="gavel" [size]="20" class="text-[var(--color-cyan-spark)]"></lucide-icon></div>
          <h3 class="text-[16px] font-[590] text-[var(--color-porcelain)] group-hover:text-[var(--color-cyan-spark)]">Subastas</h3>
          <p class="mt-1 text-[13px] text-[var(--color-storm-cloud)]">Listado y gestión de subastas y licitaciones.</p>
        </a>
        <a routerLink="/licitaciones/nota-pedido" class="group rounded-2xl border border-[var(--color-charcoal-grey)] bg-[var(--color-graphite)]/50 p-6 text-left transition-all hover:border-[var(--color-neon-lime)]/30 hover:bg-[var(--color-deep-slate)]">
          <div class="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-[var(--color-neon-lime)]/10"><lucide-icon name="file-text" [size]="20" class="text-[var(--color-neon-lime)]"></lucide-icon></div>
          <h3 class="text-[16px] font-[590] text-[var(--color-porcelain)] group-hover:text-[var(--color-neon-lime)]">Nota de Pedido</h3>
          <p class="mt-1 text-[13px] text-[var(--color-storm-cloud)]">Crear una nueva reserva o provisión.</p>
        </a>
      </div>
    </div>
  `
})
export class LicitacionesHomeComponent {}
