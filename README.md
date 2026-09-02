# Escola Imaculada — Frontend

Front-end do **Sistema de Registro de Classe** (chamada, conteúdo, avaliação
descritiva e faltas justificadas) para uma escola de educação infantil em
Curitiba. Inspirado no RCO (Registro de Classe Online) do Paraná.

## Stack

- **Angular 22** (standalone components, signals, zoneless)
- **Angular Material** (MIT) — componentes de UI
- **date-fns** — datas
- **jsPDF + jspdf-autotable** — exportação de relatórios em PDF
- **jwt-decode** — leitura das claims do JWT no cliente
- Fontes self-hosted (`@fontsource/roboto`, `material-icons`) — funciona offline

## Papéis

- **Diretora**: acesso total; cadastra escola, professoras e turmas.
- **Professora**: acessa apenas a(s) turma(s) que leciona.

Login por **CPF + senha**. Sem autocadastro e sem recuperação automática de
senha (redefinição manual no banco).

## Rodando

```bash
npm install
npm start
```

App em `http://localhost:4200`. A URL da API fica em
`src/environments/environment.ts` (`apiUrl`, padrão `http://localhost:3000`).

```bash
npm run build    # build de produção em dist/
npm test         # testes unitários (Vitest)
```

## Estrutura

```
src/app/
  core/
    auth/        AuthService, guards (authGuard / roleGuard), interceptor, models
    models/      entidades do domínio (Escola, Usuario, Turma, Aluno, ...)
  layout/
    main-layout/ casca autenticada: sidebar + topbar
  features/
    auth/        login, cadastro-inicial
    dashboard/   tela inicial com atalhos
    turmas/ alunos/ chamada/ conteudo/ avaliacoes/
    faltas-justificadas/ relatorios/ professoras/ escola/
  app.routes.ts  rotas com lazy-load e guards por papel
  app.config.ts  providers (router, http + interceptor, Material)
```

Os módulos de feature além de `login`, `dashboard` e `main-layout` ainda são
stubs ("em construção") — a estrutura, rotas, auth e navegação já estão prontas.

## Back-end

Repositório separado. Stack prevista: NestJS + Prisma + PostgreSQL. Contrato
esperado pelo front:

- `POST /auth/login` → `{ accessToken: string }`
- JWT com claims: `sub`, `nome`, `papel` (`DIRETORA` | `PROFESSORA`),
  `escolaId`, `exp`, `iat`
