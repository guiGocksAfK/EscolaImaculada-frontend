import { HttpErrorResponse } from '@angular/common/http';

/**
 * Mensagem para mostrar dentro do formulário quando um salvamento falha.
 *
 * O formulário continua aberto com tudo o que foi digitado (ver
 * ReautenticacaoService e os diálogos de cadastro), então a mensagem diz isso
 * com todas as letras — quem acabou de escrever uma avaliação longa precisa
 * saber que não perdeu nada antes de qualquer outra coisa.
 */
export function mensagemErroAoSalvar(err: unknown): string {
  const status = err instanceof HttpErrorResponse ? err.status : -1;
  const daApi = err instanceof HttpErrorResponse ? textoEscritoPelaApi(err) : null;

  switch (status) {
    case 0:
      return 'Sem conexão com o servidor. Confira a internet e tente de novo — o que você escreveu continua aqui.';
    case 400:
      return daApi ?? 'Confira os campos e tente de novo.';
    case 401:
      return 'Sua sessão expirou. Clique em salvar de novo para entrar e concluir — o que você escreveu continua aqui.';
    case 403:
      return 'Você não tem permissão para esta ação.';
    case 404:
      return 'Este registro não existe mais — pode ter sido excluído por outra pessoa.';
    case 409:
      return daApi ?? 'Já existe um registro que conflita com este.';
    default:
      return 'Não foi possível salvar. Tente de novo — o que você escreveu continua aqui.';
  }
}

/**
 * Só aproveita a mensagem da API quando ela vem como texto único — essas são
 * as escritas à mão no backend, em português (ex.: "Já existe usuário com
 * esse CPF"). Lista é saída crua do class-validator, técnica demais para a
 * tela, e nesse caso fica a mensagem genérica.
 */
function textoEscritoPelaApi(err: HttpErrorResponse): string | null {
  const msg = (err.error as { message?: unknown } | null)?.message;
  return typeof msg === 'string' && msg.trim() ? msg : null;
}
