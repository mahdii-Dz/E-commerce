# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an e-commerce storefront built with **Next.js 16** (App Router) and **React 19**. The client proxies API calls to a separate Express backend. All work happens inside the `client/` directory.

## Commands

```bash
cd client
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

### Route Groups
- `app/(pages)/(user)/` — Customer-facing pages (home, products, cart, checkout)
- `app/(pages)/(admin)/` — Admin dashboard pages
- Route groups share layouts but have different wrappers (NavBar/Footer vs DashBoardSideBar)

### State Management
- **React Query** (`@tanstack/react-query`) for server state — configured in `app/providers.jsx`
- **Context API** (`GlobalContext`) in `app/context/Context.jsx` for cart, products, and promotions
- Cart persists to `localStorage`

### Data Fetching
- Next.js API routes (`app/api/`) proxy to an Express backend via `lib/proxy.js`
- The backend URL is configured via `BACKEND_URL` environment variable
- `useFetchAllProducts` hook auto-disables fetching on admin routes to avoid redundant requests

### Styling
- **Tailwind CSS v4** with CSS-first configuration (`app/globals.css`)
- **shadcn/ui** component style (New York) — components in `components/ui/`
- `cn()` utility from `lib/utils.js` merges Tailwind classes using `clsx` + `tailwind-merge`
- Design tokens: primary `#FA3145`, secondary `#646464`, background `#f8f8f8`

### Key Libraries
- `@base-ui/react` — base UI primitives
- `@radix-ui/react-select` — select dropdowns
- `recharts` — admin dashboard charts
- `axios` — HTTP client
- `styled-components` — CSS-in-JS (legacy)
- `lucide-react` — icons

### Images
- Cloudinary for image hosting (configured in `next.config.mjs`)
- Remote pattern: `res.cloudinary.com/dvkftnjci/**`

### External Integrations
- Facebook Pixel (`components/FacebookPixel.jsx`)
- Algeria wilaya data (`lib/wilayaData.js`)
- Google Analytics/fpixel (`lib/fpixel.js`)

## Environment Variables

Required in `client/.env.local`:
- `BACKEND_URL` — Express backend URL (e.g., `http://localhost:5000`)
