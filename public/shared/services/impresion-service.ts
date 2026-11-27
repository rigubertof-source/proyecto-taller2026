import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ImpresionService {
  imprimirHtml(html: string): void {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(html);
    doc.close();

    const lanzar = () => {
      const win = iframe.contentWindow!;
      win.onafterprint = () => iframe.remove();
      win.focus();
      win.print();
    };

    // espera a que carguen todas las imágenes antes de imprimir
    const pendientes = Array.from(doc.images).filter(img => !img.complete);
    if (pendientes.length === 0) {
      lanzar();
    } else {
      Promise.all(
        pendientes.map(img => new Promise<void>(res => {
          img.onload = () => res();
          img.onerror = () => res();
        }))
      ).then(lanzar);
    }
  }
}
