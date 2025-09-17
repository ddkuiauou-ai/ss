This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API Integration

The app fetches live deals from an external API.

- Base URL: defaults to `/api` (Next.js rewrite)
- Deals path: defaults to `/deals`

You can override via env vars (client-safe):

```
NEXT_PUBLIC_API_BASE=/api
NEXT_PUBLIC_DEALS_PATH=/deals
```

Make sure your API allows CORS from your dev origin (e.g. `http://localhost:3000`). If the API is unreachable or returns an unexpected shape, the app falls back to sample data with a small "오프라인 모드(샘플 표시)" indicator.

## CORS vs Proxy (Production)

Recommended: use a reverse proxy so the browser calls the same origin and avoids CORS entirely.

- Next.js rewrite (Node runtime/Vercel):
  - Set `API_PROXY_TARGET` to your backend base URL (no trailing slash), e.g. `https://api.example.com`
  - Set `NEXT_PUBLIC_API_BASE=/api`
  - Browser calls `https://app.example.com/api/...` and Next proxies to `API_PROXY_TARGET`.

- Vercel `vercel.json` alternative:
  ```json
  {"rewrites":[{"source":"/api/:path*","destination":"https://api.example.com/:path*"}]}
  ```

- Nginx reverse proxy:
  ```nginx
  location /api/ {
    proxy_pass https://api.example.com/;
    proxy_set_header Host $host;
    proxy_http_version 1.1;
  }
  ```

If you must call a different origin directly, enable CORS on the backend (example: FastAPI):

```py
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
  CORSMiddleware,
  allow_origins=["https://app.example.com"],
  allow_methods=["*"],
  allow_headers=["*"],
  allow_credentials=True,
)
```

Notes:
- Prefer a strict `allow_origins` list in prod (don’t use `*` with credentials).
- If using cookies, set `SameSite=None; Secure` and protect endpoints from CSRF.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
