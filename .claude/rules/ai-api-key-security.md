# AI API keys — never expose

Incident: embedding `ANTHROPIC_API_KEY` in the Vite client leaked a live key from public JS.

## Hard rules

1. Never put AI secrets behind `VITE_` / `NEXT_PUBLIC_` or Vite/`define` client injection.
2. Never use `dangerouslyAllowBrowser` (or equivalents) with provider SDKs and secrets.
3. Platform keys: server-only (`api/**`, env on Vercel). Browser calls go through API routes or use safe fallbacks.
4. Owner-supplied keys: accept via HTTPS POST, store server-side / in RLS-protected tables; APIs return `hasApiKey` / `configured` only — never echo the raw key.
5. Never log full API keys.

See also `.cursor/rules/ai-api-key-security.mdc`.
