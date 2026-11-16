## What & why

<!-- One or two sentences. Link the issue if there is one. -->

## Checklist

- [ ] `pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm test:program` pass locally
- [ ] Program changes: new paths have LiteSVM tests for the happy path **and** the attack
- [ ] Account layout / seed changes are called out (they break existing clients)
- [ ] Anything mocked is labelled as mocked in the README and the UI
- [ ] No keypairs, seeds or `.env` files committed
