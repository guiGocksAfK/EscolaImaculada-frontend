import { Directive, OnInit, inject } from '@angular/core';
import { MatTabGroup } from '@angular/material/tabs';

/**
 * `<mat-tab-group appAbasArrastaveis>` — troca as setinhas de paginação por
 * rolagem horizontal: a barra de abas passa a rolar com o dedo. Só isso;
 * a aba ativa continua mudando por toque no rótulo.
 *
 * (o resto do visual — esconder as setas e liberar o overflow-x da barra —
 *  fica no styles.scss, na classe `.abas-arrastaveis`.)
 */
@Directive({
  selector: 'mat-tab-group[appAbasArrastaveis]',
  host: { class: 'abas-arrastaveis' },
})
export class AbasArrastaveis implements OnInit {
  private readonly grupo = inject(MatTabGroup);

  ngOnInit(): void {
    this.grupo.disablePagination = true;
  }
}
