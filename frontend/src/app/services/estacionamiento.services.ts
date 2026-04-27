import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EstacionamientoService {
  private apiUrl = 'http://localhost'; // NGINX en puerto 80

  constructor(private http: HttpClient) { }

  validarIdentidad(identidad: string, nombre: string, matricula: string): Observable<any> {
    const body = { identidad, nombre, matricula };
    return this.http.post(`${this.apiUrl}/validar`, body);
  }

  obtenerEstado(identidad: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/estado/${identidad}`);
  }

  checkout(identidad: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/checkout/${identidad}`, {});
  }
}
