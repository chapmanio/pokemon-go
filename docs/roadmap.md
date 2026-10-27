# Roadmap

## Phase 0: discovery

- Choose the application stack and deployment approach.
- Inspect representative payloads from the selected sources.
- Define normalised domain models and source adapters.
- Agree the first raid vertical slice and its acceptance criteria.
- Complete the readiness gate in `docs/development-process.md`.

## Phase 1: foundation

- Create app shell and five primary routes.
- Add source adapters, caching and health status.
- Add normalised Pokémon, move, raid and event models.
- Add global search and shared freshness indicators.

## Phase 2: core reference and raids

- Build the Pokémon GO Pokédex.
- Add current/upcoming raids.
- Add raid detail pages, counters and generic estimates.
- Add configurable “Our group” estimates and Party Play heuristic.

## Phase 3: current-play tools

- Add event calendar and event details.
- Add Team GO Rocket lineups and counter guidance.
- Add egg pools.

## Phase 4: deeper guidance

- Add evolution and power-up planning.
- Add richer raid alternatives and explanations.
- Add source disagreement and change history.

## Completion rule

Each phase is complete when its data is cached, validated, usable from the app UI and displays its freshness state.
