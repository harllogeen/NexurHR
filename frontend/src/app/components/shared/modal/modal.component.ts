import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ModalService, ModalConfig } from '../../../services/modal.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css']
})
export class ModalComponent implements OnInit, OnDestroy {
  modal: ModalConfig | null = null;
  isVisible = false;
  isClosing = false;
  private subscription?: Subscription;
  private autoCloseTimeout?: any;

  constructor(private modalService: ModalService) {}

  ngOnInit() {
    this.subscription = this.modalService.modal$.subscribe(modal => {
      if (modal) {
        this.openModal(modal);
      } else {
        this.closeModal();
      }
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
    if (this.autoCloseTimeout) {
      clearTimeout(this.autoCloseTimeout);
    }
  }

  private openModal(modal: ModalConfig) {
    this.modal = modal;
    this.isVisible = true;
    this.isClosing = false;

    // Auto-close for success/info messages
    if (modal.autoClose && modal.autoClose > 0) {
      this.autoCloseTimeout = setTimeout(() => {
        this.confirm();
      }, modal.autoClose);
    }
  }

  private closeModal() {
    this.isClosing = true;
    setTimeout(() => {
      this.isVisible = false;
      this.modal = null;
      this.isClosing = false;
    }, 200); // Match animation duration
  }

  async confirm() {
    if (this.autoCloseTimeout) {
      clearTimeout(this.autoCloseTimeout);
    }

    if (this.modal?.onConfirm) {
      await this.modal.onConfirm();
    }
    this.modalService.close();
  }

  cancel() {
    if (this.autoCloseTimeout) {
      clearTimeout(this.autoCloseTimeout);
    }

    if (this.modal?.onCancel) {
      this.modal.onCancel();
    }
    this.modalService.close();
  }

  getIcon(): string {
    switch (this.modal?.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      case 'confirm':
        return '?';
      case 'delete':
        return '🗑';
      default:
        return 'ℹ';
    }
  }

  getIconClass(): string {
    return `modal-icon-${this.modal?.type}`;
  }

  onBackdropClick(event: MouseEvent) {
    // Only close on backdrop click for non-critical modals
    if (this.modal?.type === 'success' || this.modal?.type === 'info') {
      this.cancel();
    }
  }
}
