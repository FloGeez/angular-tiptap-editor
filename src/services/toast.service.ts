import { Injectable, signal } from "@angular/core";

export interface Toast {
  id: number;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

@Injectable({
  providedIn: "root",
})
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  private nextId = 0;

  readonly toasts = this._toasts.asReadonly();

  show(message: string, type: Toast["type"] = "info", duration = 3000) {
    const id = this.nextId++;
    const toast: Toast = { id, message, type };

    this._toasts.update(toasts => [...toasts, toast]);

    setTimeout(() => this.dismiss(id), duration);
  }

  dismiss(id: number) {
    this._toasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  info(message: string) {
    this.show(message, "info");
  }

  success(message: string) {
    this.show(message, "success");
  }

  warning(message: string) {
    this.show(message, "warning");
  }

  error(message: string) {
    this.show(message, "error");
  }
}
