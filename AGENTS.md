<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Adding a dependency? Install with npm 10.9.0

Railway builds with `nodejs_22`, which ships **npm 10.9.0**, and the build runs
`npm ci` — which refuses to install anything when the lock file disagrees with
`package.json`.

npm 11 and npm 10 disagree about exactly one thing here. `@swc/core`, pulled in
under `next-intl`, declares `@swc/helpers` as an **optional peer**. npm 11
leaves it out of the lock; npm 10 resolves it, does not find it, and fails the
build with `Missing: @swc/helpers@0.5.23 from lock file`. Nothing is wrong with
the code — the deploy simply never starts.

So install with the same npm the builder has:

```bash
npx -y npm@10.9.0 install <package>
```

and check both before committing a lock change:

```bash
npx -y npm@10.9.0 ci --dry-run --ignore-scripts
npm ci --dry-run --ignore-scripts
```

Both must exit 0. This has broken the build twice; it costs one command to
avoid.
