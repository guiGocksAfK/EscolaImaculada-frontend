# Escola Imaculada | Frontend

Frontend do **Sistema de Registro de Classe** da Escola Imaculada. A aplicação
centraliza a rotina das professoras: turmas, alunos, chamada, conteúdo,
avaliações e relatórios, com permissões diferentes para diretoras e professoras.

> Estado atual: autenticação com mock funcional, navegação protegida e
> gerenciamento de turmas em desenvolvimento. Os demais módulos já possuem
> rotas e telas-base para receber suas implementações.

## O que já funciona

- Login por CPF e senha com JWT fake para desenvolvimento local.
- Sessão persistida no navegador e logout.
- Guards de autenticação e de papel de usuário.
- Navegação autenticada com menu filtrado por permissão.
- Listagem, criação, edição e remoção de turmas.
- Dados mock persistidos em `localStorage`, sem depender do back-end.
- Interface baseada em Angular Material e componentes standalone.

## Stack

| Tecnologia | Uso |
| --- | --- |
| Angular 22 | Aplicação standalone, signals e rotas lazy-loaded |
| Angular Material | Componentes visuais e acessibilidade |
| TypeScript | Tipagem da aplicação e dos contratos |
| RxJS | Requisições e fluxos assíncronos |
| `jwt-decode` | Leitura das claims do JWT no cliente |
| `date-fns` | Manipulação de datas |
| jsPDF + AutoTable | Exportação futura de relatórios |

## Começando

Requisitos: Node.js compatível com Angular 22 e npm 11.

```bash
npm install
npm start
```

Abra `http://localhost:4200`. Para validar o projeto:

```bash
npm run build
npm test
```

Se a porta `4200` estiver ocupada, o Angular pode sugerir outra porta. Para
fixá-la explicitamente:

```bash
npm start -- --port 4200
```

## Acesso de teste

O ambiente de desenvolvimento usa `environment.useMock: true`. Use qualquer
uma destas contas:

| Perfil | CPF | Senha |
| --- | --- | --- |
| Diretora | `111.111.111-11` | `123456` |
| Professora | `222.222.222-22` | `123456` |
| Professora | `333.333.333-33` | `123456` |

A diretora pode gerenciar turmas, professoras e escola. A professora acessa
somente os recursos permitidos para o seu papel.

## Organização do código

```text
src/app/
  core/
    auth/              serviço, guards, interceptor e mocks de autenticação
    models/            entidades e tipos do domínio
    services/          serviços HTTP de turmas e professoras
  features/
    auth/              login e cadastro inicial
    turmas/            listagem e formulário de turmas
    dashboard/         tela inicial com atalhos
    alunos/ chamada/ conteudo/ avaliacoes/
    faltas-justificadas/ relatorios/ professoras/ escola/
  layout/main-layout/  shell autenticado, sidebar e topbar
  shared/               componentes reutilizáveis
```

As rotas ficam em `src/app/app.routes.ts`. O registro dos providers, incluindo
os interceptors mock, fica em `src/app/app.config.ts`.

## Mock e API real

Os mocks ficam em `src/app/core/auth/mock/` e simulam login e endpoints de
turmas usando `localStorage`. Para conectar o back-end:

1. Configure `apiUrl` em `src/environments/environment.ts`.
2. Altere `useMock` para `false`.
3. Remova ou desative os interceptors mock em `app.config.ts`.

Contrato esperado do back-end:

```http
POST /auth/login
```

```json
{ "accessToken": "<jwt>" }
```

O JWT deve conter `sub`, `nome`, `papel`, `escolaId`, `exp` e `iat`, com
`papel` igual a `DIRETORA` ou `PROFESSORA`.

## Fluxo de branches

Use uma branch por parte do produto e mantenha `main` protegida:

```text
develop
  └── Estrutura-Inicial
        ├── alunos
        ├── chamada
        └── relatorios
```

Crie a próxima branch a partir da base mais atual:

```bash
git switch Estrutura-Inicial
git pull
git switch -c feature/nome-da-feature
```
