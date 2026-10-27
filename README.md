# Zephvion CRM

An end-to-end CRM for growing businesses, by [Zephvion](https://zephvion.com): leads, clients, deals, follow-ups, and GST-ready quotes & invoices in one structured system.

**Live demo:** <https://dilipkumarkesavalu.github.io/zephvion-crm/> (runs in your browser on sample data, nothing to sign up for)

Built with React, TypeScript, Tailwind CSS (shadcn/ui) and Supabase, on top of the open-source [Atomic CRM](https://github.com/marmelab/atomic-crm) by Marmelab (MIT).

## Features

- **Dashboard**: pipeline value, revenue collected this financial year, outstanding and overdue invoices, win rate, monthly revenue chart and pipeline by stage.
- **Contacts & companies**: client profiles with notes, tags, tasks and activity history; CSV import and export.
- **Deals**: Kanban pipeline from Lead → Discovery → Proposal → Negotiation → Won / Lost.
- **Quotes & invoices**:
  - line items with HSN/SAC, quantity, rate and GST (0/5/12/18/28%)
  - CGST + SGST within the state, IGST across states, picked from the client's state
  - automatic numbering (`QT-2026-0001`, `INV-2026-0001`) and amount in words (Indian system)
  - quote → invoice conversion, paid / overdue tracking
  - branded A4 PDF via the browser's "Save as PDF"
- **Team & access**: users, admin roles, SSO (Google, Azure, Keycloak, Auth0).
- **Light & dark themes** in Zephvion's brand colours, responsive down to mobile.

## Quick start (demo mode, no backend)

Requires Node 24.

```sh
npm install
npm run dev:demo
```

Open <http://localhost:5174>. The demo runs on realistic sample data stored in the browser; it resets on reload.

## Full stack (Supabase)

Requires Node 24, Docker and Make.

```sh
make install   # dependencies + local Supabase
make start     # Supabase + Vite dev server on http://localhost:5173
```

The database schema lives in `supabase/schemas/` and migrations in `supabase/migrations/` (including `add_invoices`).

Before issuing real invoices, replace the sample issuer details (address, GSTIN, PAN, bank account) in
`src/components/zephvion-crm/invoices/sellerDetails.ts`.

## Project structure

```
src/
├── App.tsx                     # entry point
└── components/
    ├── zephvion-crm/           # CRM application code
    │   ├── dashboard/          # KPI tiles, revenue & pipeline charts
    │   ├── invoices/           # quotes & invoices (GST, numbering, PDF)
    │   ├── deals/ contacts/ companies/ tasks/ notes/ ...
    │   ├── layout/             # sidebar + top bar layout
    │   └── providers/          # Supabase and demo (FakeRest) data providers
    ├── admin/                  # shadcn-admin-kit components
    └── ui/                     # shadcn/ui components
supabase/                       # schema, migrations, edge functions
```

## Development

```sh
npm run typecheck
npm run lint
npm run test:unit:app
```

See [AGENTS.md](./AGENTS.md) for architecture notes and the developer documentation in [`doc/`](./doc/) (inherited from Atomic CRM).

## License

MIT. Zephvion CRM is based on [Atomic CRM](https://github.com/marmelab/atomic-crm), © Francois Zaninotto, Marmelab; see [LICENSE.md](./LICENSE.md).
