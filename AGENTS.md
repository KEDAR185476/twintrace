<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# TwinTrace – architecture rules

- All twin state lives in the Zustand store `src/twin/store.ts`; `applyEvent(state, event)` is the only state transition — keeps the twin explainable and replayable.
- Synthetic data comes from the seeded generator `src/twin/generator.ts` with a fixed shift start — the same data renders on server and browser, so nothing mismatches.
- Alerts and analytics are rule-based functions (e.g. `src/twin/alerts.ts`) that return their evidence — no learned models. Never use the word "AI" anywhere.
- The shared layout (sidebar + header) is `src/components/twin/AppShell.tsx`, rendered in `__root.tsx`.
- Fonts are bundled via @fontsource and all screens are preloaded after first load — the app must make no external requests and work offline.
- Demo Mode (`src/components/twin/DemoMode.tsx`) drives screens through the same store and controls a user would; the Simulation screen listens to `useDemo().simCommand`.
