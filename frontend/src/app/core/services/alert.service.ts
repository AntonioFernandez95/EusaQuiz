import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertResult } from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor() { }

  /**
   * Muestra un mensaje de éxito tipo Toast
   */
  success(title: string, message: string = ''): void {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });

    Toast.fire({
      icon: 'success',
      title: title,
      text: message,
      background: '#f0fdf4',
      color: '#166534',
      iconColor: '#22c55e'
    });
  }

  /**
   * Muestra un mensaje de error tipo Toast
   */
  error(title: string, message: string = ''): void {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });

    Toast.fire({
      icon: 'error',
      title: title,
      text: message,
      background: '#fef2f2',
      color: '#991b1b',
      iconColor: '#ef4444'
    });
  }

  /**
   * Muestra una alerta informativa
   */
  info(title: string, message: string = ''): void {
    Swal.fire({
      title: title,
      text: message,
      icon: 'info',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#0077b6',
      customClass: {
        popup: 'animated fadeInDown faster'
      }
    });
  }

  /**
   * Muestra una alerta de advertencia
   */
  warning(title: string, message: string = ''): void {
    Swal.fire({
      title: title,
      text: message,
      icon: 'warning',
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#f59e0b',
    });
  }

  /**
   * Muestra un diálogo de confirmación personalizado
   */
  async confirm(
    title: string,
    text: string,
    confirmButtonText: string = 'Confirmar',
    cancelButtonText: string = 'Cancelar',
    type: 'success' | 'error' | 'warning' | 'info' | 'question' = 'question'
  ): Promise<SweetAlertResult> {
    const confirmColor = type === 'warning' || type === 'error' ? '#ef4444' : '#2d6a4f';
    
    return Swal.fire({
      title: title,
      text: text,
      icon: type,
      showCancelButton: true,
      confirmButtonColor: confirmColor,
      cancelButtonColor: '#64748b',
      confirmButtonText: confirmButtonText,
      cancelButtonText: cancelButtonText,
      reverseButtons: true,
      background: '#ffffff',
      customClass: {
        popup: 'eusa-alert-popup',
        title: 'eusa-alert-title',
        confirmButton: 'eusa-alert-confirm',
        cancelButton: 'eusa-alert-cancel'
      }
    });
  }

  /**
   * Alerta de carga (Loading)
   */
  loading(title: string = 'Procesando...'): void {
    Swal.fire({
      title: title,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  /**
   * Cierra cualquier alerta abierta
   */
  close(): void {
    Swal.close();
  }
}
