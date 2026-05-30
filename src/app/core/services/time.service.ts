import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TimeService {
  private http = inject(HttpClient);
  
  // Guardamos la diferencia en milisegundos entre el servidor y la PC local
  private offset = signal<number>(0);

  /**
   * Sincroniza el reloj local con el del servidor
   */
  syncWithServer(): void {
    this.http.get<{serverTime: string}>(`${environment.apiUrl}/Cotizacion/server-time`)
      .subscribe({
        next: (res) => {
          const serverTime = new Date(res.serverTime).getTime();
          const localTime = Date.now();
          this.offset.set(serverTime - localTime);
          console.log(`[TimeService] Reloj sincronizado. Offset: ${this.offset()}ms`);
        },
        error: () => console.error('[TimeService] No se pudo sincronizar el reloj con el servidor.')
      });
  }

  /**
   * Devuelve el Timestamp exacto ajustado a la hora del servidor
   */
  now(): number {
    return Date.now() + this.offset();
  }
}