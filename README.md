RWID Community is a community-focused social learning platform built with Next.js, Tailwind CSS v4, and shadcn/ui.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Run the development server (Turbopack by default):

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
npm start
```

## Key Tech

- Next.js 16 (App Router), React 19, Tailwind CSS v4
- shadcn/ui components
- Mock data in JSON under `src/data`

## Branding

- Primary color: `#66b132` (RWID brand)

## Project Structure

- `src/app`: routes and layout
- `src/components`: shared UI and layout components
- `src/data`: mock JSON data (users, posts, courses, communities)

## Notes

- React Compiler can be enabled in `next.config.ts` under `experimental.reactCompiler`.
