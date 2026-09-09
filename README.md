# Escola Imaculada | Frontend

Frontend do **Sistema de Registro de Classe** da Escola Imaculada. A aplicação
centraliza a rotina das professoras: turmas, alunos, chamada, conteúdo,
avaliações e relatórios, com permissões diferentes para diretoras e professoras.

Consome a API REST do [back-end](../EscolaImaculada-backend) (NestJS + Prisma +
PostgreSQL). Não há mais dados mock: todas as telas trabalham contra o servidor.

## O que já funciona

- Login por CPF e senha; sessão via JWT guardada no `localStorage` e logout.
- Cadastro inicial da escola + conta da diretora (`/cadastro-inicial`).
- Guards de autenticação e de papel; menu e rotas filtrados por permissão.
- Turmas, alunos, professoras: listar, criar, editar e remover.
- Chamada do dia, visão mensal e faltas justificadas (abas em `/chamada`).
- Registro de conteúdo das aulas e avaliações descritivas por aluno.
- Relatórios (resumo por aluno, chamada mensal e registro semestral) com
  exportação em PDF via jsPDF.
- Interface em Angular Material, componentes standalone e layout responsivo.

## Stack

| Tecnologia | Uso |
| --- | --- |
| Angular 22 | Aplicação standalone, signals e rotas lazy-loaded |
| Angular Material | Componentes visuais e acessibilidade |
| TypeScript | Tipagem da aplicação e dos contratos |
| RxJS | Requisições HTTP e fluxos assíncronos |
| `jwt-decode` | Leitura das claims do JWT no cliente |
| `date-fns` | Manipulação de datas |
| jsPDF + jspdf-autotable | Exportação dos relatórios em PDF |
| Vitest | Testes unitários (`@angular/build:unit-test`) |

## Começando

Requisitos: Node.js compatível com Angular 22 e npm 11.

```bash
npm install
npm start
```

Abra `http://localhost:4200`. O front espera o back-end em
`http://localhost:3000` (veja [Ambientes](#ambientes)); suba a API e o banco
antes — no repositório do back-end:

```bash
docker compose up -d   # PostgreSQL
npm run start:dev      # API em :3000
npm run seed           # popula dados de demonstração (NÃO rodar em produção)
```

Para validar o projeto:

```bash
npm run build
npm test
```

Se a porta `4200` estiver ocupada:

```bash
npm start -- --port 4200
```

## Acesso de teste

Não há contas embutidas no front. Use uma escola nova pela tela de
**cadastro inicial**, ou rode o `npm run seed` do back-end e entre com as
contas de demonstração que ele cria:

| Perfil | CPF | Senha |
| --- | --- | --- |
| Diretora | `111.222.333-96` | `segredo123` |
| Professora | `222.333.444-05` | `imaculada2025` |

A diretora gerencia turmas, professoras e os dados da escola. A professora
acessa somente as turmas sob a responsabilidade dela.

## Ambientes

A URL da API vem de `src/environments/`:

| Arquivo | `apiUrl` | Quando |
| --- | --- | --- |
| `environment.ts` | `http://localhost:3000` | `npm start` (dev) |
| `environment.production.ts` | `/api` | `npm run build` |

No build de produção o front chama `/api/*`, então o servidor que entrega o
`dist/` precisa ter um proxy reverso roteando `/api` → back-end (removendo o
prefixo). No back-end, lembre de configurar `CORS_ORIGIN` com o domínio do
front e, se houver proxy, `TRUST_PROXY=1`.

`nomeEscolaPadrao` é só o nome exibido na tela de login quando a API não
responde ou quando a instância tem mais de uma escola cadastrada — nesse caso
`GET /escola/publica` devolve `nome: null` de propósito.

## Organização do código

```text
src/app/
  core/
    auth/        AuthService (signals), guards, interceptor e models
    services/    serviços HTTP: alunos, turmas, chamada, conteúdo,
                 avaliações, faltas-justificadas, professoras,
                 relatórios, escola
    models/      entidades e tipos do domínio
    date/        BrDateAdapter (datas pt-BR no Material)
    pdf/         geração dos relatórios em PDF
    util/        helpers
  features/
    auth/        login e cadastro inicial
    dashboard/   tela inicial com atalhos
    turmas/ alunos/ chamada/ conteudo/
    avaliacoes/ relatorios/ professoras/
  layout/main-layout/   shell autenticado, sidebar e topbar
  shared/               componentes reutilizáveis
```

Rotas em `src/app/app.routes.ts`; providers (HTTP, interceptor, locale pt-BR,
date adapter) em `src/app/app.config.ts`.

## Contrato de autenticação

```http
POST /auth/login
POST /auth/cadastro-inicial
```

```json
{ "accessToken": "<jwt>" }
```

O JWT carrega `sub`, `nome`, `papel`, `escolaId`, `exp` e `iat`, com `papel`
igual a `DIRETORA` ou `PROFESSORA`. O `authInterceptor` anexa o token só em
chamadas para a própria API e faz `logout()` automático em resposta `401`.

## Fluxo de branches

Uma branch por frente de trabalho, `main` protegida e integração via
pull request. Crie a branch a partir da base mais atual:

```bash
git switch main
git pull
git switch -c feature/nome-da-feature
```
