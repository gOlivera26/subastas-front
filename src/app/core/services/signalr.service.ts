import { Injectable, inject, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';

export interface OfertaEnVivo {
  idCotizacion: number;
  idCotizacionDetalle?: number;
  idRenglon?: number;
  monto: number;
  idProveedor: number;
  fecha: string;
  usuario: string;
}

export interface MensajeEnVivo {
  idMensaje?: number;
  usuario: string;
  contenido: string;
  fecIng: string;
}

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private connection: signalR.HubConnection | null = null;
  ofertas = signal<OfertaEnVivo[]>([]);
  mensajes = signal<MensajeEnVivo[]>([]);
  usuarioEscribiendo = signal<string | null>(null);
  connected = signal(false);
  error = signal<string | null>(null);

  get hubUrl(): string {
    const base = environment.apiUrl.replace(/\/api\/?$/, '');
    return `${base}/signalr/subastas`;
  }

  async connect(token: string): Promise<void> {
    if (this.connection) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build();

    this.connection.on('OfertaRecibida', (oferta: OfertaEnVivo) => {
      this.ofertas.update(arr => [...arr.slice(-49), oferta]);
    });

    this.connection.on('MensajeRecibido', (msg: MensajeEnVivo) => {
      this.mensajes.update(arr => [...arr, msg]);
    });

    this.connection.on('UsuarioEscribiendo', (usuario: string) => {
      this.usuarioEscribiendo.set(usuario);
      setTimeout(() => { if (this.usuarioEscribiendo() === usuario) this.usuarioEscribiendo.set(null); }, 3000);
    });

    this.connection.onreconnected(() => this.connected.set(true));
    this.connection.onreconnecting(() => this.connected.set(false));
    this.connection.onclose(() => this.connected.set(false));

    try {
      await this.connection.start();
      this.connected.set(true);
      this.error.set(null);
    } catch (err: any) {
      this.error.set(err.message || 'Error al conectar SignalR');
      this.connection = null;
    }
  }

  async joinSubasta(idCotizacion: number): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('UnirseSubasta', idCotizacion);
    }
  }

  async leaveSubasta(idCotizacion: number): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('SalirSubasta', idCotizacion);
    }
  }

  async enviarOferta(
    idCotizacion: number,
    idCotizacionDetalle: number | null,
    idRenglon: number | null,
    monto: number,
    idProveedor: number
  ): Promise<boolean> {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) return false;
    return await this.connection.invoke<boolean>(
      'EnviarOferta', idCotizacion, idCotizacionDetalle, idRenglon, monto, idProveedor
    );
  }

  clearOfertas(): void { this.ofertas.set([]); }

  async joinChat(idCotizacion: number): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('UnirseMensajes', idCotizacion);
    }
  }

  async leaveChat(idCotizacion: number): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('SalirMensajes', idCotizacion);
    }
  }

  async typingChat(idCotizacion: number): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('Escribiendo', idCotizacion);
    }
  }

  clearMensajes(): void { this.mensajes.set([]); this.usuarioEscribiendo.set(null); }

  disconnect(): void {
    this.connection?.stop();
    this.connection = null;
    this.connected.set(false);
  }
}
