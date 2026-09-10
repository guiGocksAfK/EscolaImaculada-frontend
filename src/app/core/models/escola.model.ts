export interface Escola {
  id: string;
  nome: string;
  endereco: string;
}

export interface ResumoEscola {
  turmas: number;
  professoras: number;
  alunosAtivos: number;
  alunosTransferidos: number;
  alunosDesistentes: number;
  alunosTotal: number;
}
