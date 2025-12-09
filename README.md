# AC-Gen Project

This project is a Monorepo containing the AC-Gen application components.

## Structure

- `packages/client`: Frontend application (React + Vite)
- `packages/server`: Backend application (Express)
- `packages/shared`: Shared TypeScript types
- `data`: JSON data storage
- `storage`: File storage (images, outputs)

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Servers**
   ```bash
   # Start both client and server
   npm run start
   
   # Or individually
   npm run dev:client
   npm run dev:server
   ```

## Documentation
See `docs/` and `项目架构规划.md` for more details.
