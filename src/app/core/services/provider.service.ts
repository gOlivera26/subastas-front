import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OperationResponse } from '../models/operation-response.model';
import { environment } from '../../../environments/environment';

export interface ProviderResponse {
  id: number;
  razonSocial: string;
  cuit: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProviderService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Provider`;

  verifyCuit(cuit: string): Observable<OperationResponse<ProviderResponse>> {
    return this.http.get<OperationResponse<ProviderResponse>>(`${this.apiUrl}/verify/${cuit}`);
  }
}