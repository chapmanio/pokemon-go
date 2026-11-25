# Pokémon GO companion

A generic Pokémon GO planning and reference app for family play.

## Development

```bash
npm install
npm run build
# terminal 1
npm run dev:worker
# terminal 2
npm run dev
npm test
npm run lint
```

The Vite dev server proxies `/api` to Wrangler on port 8787. Rebuild after
front-end changes so Wrangler serves the latest `dist` assets.

## Documentation

- [Domain context](CONTEXT.md)
- [Product direction](docs/product.md)
- [Feature scope](docs/features.md)
- [Data sources](docs/data-sources.md)
- [Reliability](docs/reliability.md)
- [Development process](docs/development-process.md)
- [Matt Pocock skills review](docs/matt-pocock-skills-review.md)
- [API discovery](docs/api-discovery.md)
- [Initial domain model](docs/domain-model.md)
- [Device compatibility](docs/device-compatibility.md)
- [ADR: ingestion and storage](docs/adr/0001-ingestion-and-storage.md)
- [Raid foundation slice](docs/slices/raid-foundation.md)
- [Technical direction](docs/technical-direction.md)
- [Roadmap](docs/roadmap.md)
