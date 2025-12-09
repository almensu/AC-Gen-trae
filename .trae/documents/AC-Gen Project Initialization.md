# AC-Gen Project Initialization Plan

Based on the provided architecture document (`项目架构规划.md`), I will initialize the Monorepo project structure.

## 1. Project Root & Monorepo Setup
- Initialize `package.json` with **npm workspaces** configuration.
- Create root `tsconfig.json` for base TypeScript configuration.
- Create `.gitignore`.

## 2. Directory Structure Creation
Create the following directory structure as specified:
```
AC-Gen/
├── packages/
│   ├── client/
│   ├── server/
│   └── shared/
├── data/           (for JSON storage)
├── storage/        (for file assets)
│   ├── products/
│   ├── decorations/
│   └── outputs/
└── docs/
```

## 3. Shared Package Setup (`packages/shared`)
- Initialize `package.json`.
- Create `tsconfig.json`.
- Implement `types.ts` with the core data models defined in Section 3.2 of the architecture doc (ProductAsset, DecorationAsset, Project, etc.).

## 4. Backend Setup (`packages/server`)
- Initialize `package.json` with dependencies: `express`, `multer`, `sharp`, `cors`, `dotenv`.
- Create `tsconfig.json`.
- Create basic server entry point (`src/index.ts`).
- Setup directory structure: `routes`, `services`, `utils`.

## 5. Frontend Setup (`packages/client`)
- Initialize Vite project with React + TypeScript.
- Install dependencies: `antd`, `zustand`, `fabric`, `axios`, `sass`.
- Setup directory structure: `components`, `hooks`, `stores`, `utils`.
- Configure proxy to talk to the backend.

## 6. Data Initialization
- Create initial empty JSON files in `data/`:
  - `products.json`
  - `decorations.json`
  - `projects.json`

## 7. Verification
- Verify that both client and server can start.
- Verify that client can import types from shared package.
