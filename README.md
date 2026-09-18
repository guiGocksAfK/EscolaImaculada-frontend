# Escola Imaculada — Web App

Digital class register for **Escola Imaculada**, an early childhood education
school in Brazil. The system replaces the paper attendance book and written
records: teachers log attendance, lesson content and assessments for their
classes, while the principal oversees the whole school and issues the official
reports.

Built pro bono and in real use by the school. This repository contains the
web app; the API, infrastructure, backups and security details live in
[EscolaImaculada-backend](https://github.com/guiGocksAfK/EscolaImaculada-backend).

## Features

- **Role-based experience.** The principal manages the whole school; each
  teacher only sees the classes they are responsible for. Menus and routes
  adapt to the signed-in role.
- **Attendance** in three views: daily roll call, monthly grid and excused
  absences. Past days can be filled in later.
- **Lesson records** organized by the fields of experience of the BNCC
  (Brazil's national curriculum framework) for early childhood education.
- **Narrative assessments** per student and per term.
- **Reports exported to PDF**: yearly attendance summary per student, monthly
  attendance sheet and the class's semester record, ready to print.
- **School management**: classes, students, teacher accounts and school
  details.
- **First-run setup** that creates the school and the principal's account.

## User experience

The users are teachers, often on a phone between activities, and some of the
school's computers are old. A few decisions follow from that:

- **Responsive layout** that works on phones, tablets and desktops, with
  swipeable tabs on small screens.
- **Remembers context.** The last selected class and filters are restored on
  return, scoped per user so accounts sharing a device never mix.
- **Picks the obvious default.** A teacher responsible for a single class
  lands on it directly.
- **Older browsers.** Wider browser targets and solid-color fallbacks for
  modern CSS keep the interface usable on outdated machines.
- **Brazilian conventions.** Dates in `dd/mm/yyyy`, CPF (Brazilian taxpayer
  ID) formatting and Portuguese throughout the interface.
- **Client-side PDFs.** Reports are generated in the browser with an embedded
  Unicode font, so accents always render correctly. The PDF libraries are
  loaded on demand and don't weigh on the initial load.

## Hosting

Deployed on **Vercel**, with every push to `main` going live automatically.
The API runs on a separate Oracle Cloud VM; see the
[backend README](https://github.com/guiGocksAfK/EscolaImaculada-backend#architecture-and-hosting)
for the full architecture.

## Tech stack

| Technology | Purpose |
|---|---|
| Angular 22 | Standalone components, signals and lazy-loaded routes |
| Angular Material | UI components and accessibility |
| TypeScript | Typing for the app and API contracts |
| RxJS | HTTP and async flows |
| date-fns | Date handling |
| jsPDF + jspdf-autotable | PDF report generation |
| Vitest | Unit test runner |

Fonts and icons are self-hosted, so the app makes no requests to third-party
CDNs.

## Security

- **Strict Content Security Policy** served as an HTTP header: scripts only
  from the app's own origin, no `eval`, and network access limited to the API.
- **Hardened headers**: HSTS, clickjacking protection (`frame-ancestors` and
  `X-Frame-Options`), `nosniff`, `no-referrer` and a restrictive
  Permissions-Policy.
- **Token sent only to the API.** The HTTP interceptor compares the resolved
  origin of each request, so the session token never leaks to third-party
  URLs.
- **Safe post-login redirect.** The `redirect` parameter only accepts internal
  paths, blocking open redirects.
- **No unsafe HTML rendering.** The app relies on Angular's built-in
  sanitization and never bypasses it.
- **Automatic sign-out** when the API rejects the session.

Authorization is always enforced by the API; route guards on the frontend
only shape the navigation.

## Running locally

Requirements: Node.js 24 (npm 11), and the
[backend](https://github.com/guiGocksAfK/EscolaImaculada-backend) running on
`http://localhost:3000`.

```bash
npm install
npm start               # http://localhost:4200
```

To start with demo data, run `npm run seed` in the backend repository and sign
in with one of the accounts it creates (**local development only**):

| Role | CPF | Password |
|---|---|---|
| Principal | `111.222.333-96` | `segredo123` |
| Teacher | `222.333.444-05` | `imaculada2025` |

Alternatively, use the first-run setup screen at `/cadastro-inicial` on an
empty database.

### Scripts

| Script | Description |
|---|---|
| `npm start` | Development server with hot reload. |
| `npm run build` | Production build to `dist/`. |
| `npm test` | Unit tests with Vitest. |

### Environments

The API URL comes from `src/environments/`:

| File | Used by | `apiUrl` |
|---|---|---|
| `environment.ts` | `npm start` | `http://localhost:3000` |
| `environment.production.ts` | `npm run build` | Production API URL |

Changing the production API domain also requires updating `connect-src` in the
CSP, both in `vercel.json` (production) and in the `<meta>` tag of
`src/index.html` (development).

## Project structure

```
src/app/
├── core/
│   ├── auth/        auth service (signals), guards, interceptor
│   ├── services/    HTTP services, one per API module
│   ├── models/      domain types
│   ├── date/        Brazilian date adapter for Angular Material
│   ├── pdf/         PDF report generation
│   └── util/        helpers and per-user preferences
├── features/
│   ├── auth/        login and first-run setup
│   ├── dashboard/   home screen
│   ├── chamada/     daily, monthly and excused absences
│   ├── turmas/  alunos/  professoras/
│   └── conteudo/  avaliacoes/  relatorios/
├── layout/          authenticated shell, sidebar and top bar
└── shared/          reusable components and directives
```

Feature names follow the school's domain language in Portuguese: *chamada*
(attendance), *turmas* (classes), *alunos* (students), *professoras*
(teachers), *conteúdo* (lesson content), *avaliações* (assessments) and
*relatórios* (reports).
