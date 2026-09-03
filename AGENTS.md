# AGENTS.md

Guidance for AI agents and humans working in this repository.

## Running tests (memory)

This machine has many CPU cores. Jest defaults to a large worker pool; with `ts-jest` each worker compiles TypeScript and may load heavy deps (`discord.js`, LangChain, Google APIs, etc.). That combination has caused **OOM / swap thrashing** and killed the agent or shell mid-run.

**Do this:**

```bash
npx jest --maxWorkers=2 --forceExit
# or, when debugging / low memory:
npx jest --runInBand --forceExit
```

**Avoid:**

- Full-suite runs with default workers (`npx jest` / `npm test` without caps) on high-core hosts
- Chaining a focused suite and then a full suite in one heavy command when memory is already tight
- Ignoring Jest warnings like `worker process has failed to exit gracefully` — treat them as a leak/hang signal and prefer `--forceExit` + fewer workers

**Prefer for verification during implementation:**

```bash
npx jest --testPathPatterns='<relevant>' --maxWorkers=2 --forceExit
```

Only run the full suite with `--maxWorkers=2` (or `--runInBand`) when needed for final checks.
