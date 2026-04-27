import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EstacionamientoService } from './services/estacionamiento.services';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class AppComponent {
  busqueda = '';
  resultadoBusqueda: any = null;
  cargando = false;

  // Datos de prueba
  datosPrueba: any = {
    '12345678': { identidad: '12345678', nombre: 'Juan Carlos Pérez García', matricula: 'ABC-123' },
    'ABC-123': { identidad: '12345678', nombre: 'Juan Carlos Pérez García', matricula: 'ABC-123' },
    '87654321': { identidad: '87654321', nombre: 'María González López', matricula: 'XYZ-789' },
    'XYZ-789': { identidad: '87654321', nombre: 'María González López', matricula: 'XYZ-789' }
  };

  constructor(private estacionamientoService: EstacionamientoService) { }

  setBusqueda(valor: string) {
    this.busqueda = valor;
    this.buscar();
  }

  buscar() {
    if (!this.busqueda.trim()) {
      return;
    }

    this.cargando = true;

    // Simular búsqueda con datos locales
    setTimeout(() => {
      const datos = this.datosPrueba[this.busqueda];
      
      if (datos) {
        this.resultadoBusqueda = {
          validado: true,
          usuario: datos,
          mensaje: 'Acceso autorizado'
        };
      } else {
        this.resultadoBusqueda = {
          validado: false,
          mensaje: `El DNI o matrícula "${this.busqueda}" no se encuentra autorizado`
        };
      }

      this.cargando = false;
    }, 500);
  }

  nuevaBusqueda() {
    this.busqueda = '';
    this.resultadoBusqueda = null;
  }
}
