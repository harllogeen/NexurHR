import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ModalConfig {
  type: 'success' | 'error' | 'warning' | 'info' | 'confirm' | 'delete';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  autoClose?: number; // milliseconds
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalSubject = new BehaviorSubject<ModalConfig | null>(null);
  public modal$ = this.modalSubject.asObservable();

  /**
   * Show a success alert
   */
  success(title: string, message: string, autoClose: number = 3000) {
    this.show({
      type: 'success',
      title,
      message,
      confirmText: 'OK',
      showCancel: false,
      autoClose
    });
  }

  /**
   * Show an error alert
   */
  error(title: string, message: string) {
    this.show({
      type: 'error',
      title,
      message,
      confirmText: 'OK',
      showCancel: false
    });
  }

  /**
   * Show a warning alert
   */
  warning(title: string, message: string) {
    this.show({
      type: 'warning',
      title,
      message,
      confirmText: 'OK',
      showCancel: false
    });
  }

  /**
   * Show an info alert
   */
  info(title: string, message: string, autoClose?: number) {
    this.show({
      type: 'info',
      title,
      message,
      confirmText: 'OK',
      showCancel: false,
      autoClose
    });
  }

  /**
   * Show a confirmation dialog
   */
  confirm(
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    confirmText: string = 'Confirm',
    cancelText: string = 'Cancel'
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.show({
        type: 'confirm',
        title,
        message,
        confirmText,
        cancelText,
        showCancel: true,
        onConfirm: async () => {
          await onConfirm();
          resolve(true);
        },
        onCancel: () => {
          resolve(false);
        }
      });
    });
  }

  /**
   * Show a delete confirmation dialog
   */
  confirmDelete(
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    itemName?: string
  ): Promise<boolean> {
    const fullMessage = itemName 
      ? `${message}\n\nDeleting: ${itemName}`
      : message;

    return new Promise((resolve) => {
      this.show({
        type: 'delete',
        title,
        message: fullMessage,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        showCancel: true,
        onConfirm: async () => {
          await onConfirm();
          resolve(true);
        },
        onCancel: () => {
          resolve(false);
        }
      });
    });
  }

  /**
   * Show a custom modal
   */
  show(config: ModalConfig) {
    this.modalSubject.next(config);
  }

  /**
   * Close the modal
   */
  close() {
    this.modalSubject.next(null);
  }
}
