# MB Virtual Lab

Three interactive DNA-extraction practicals based only on the latest two supplied study pages: organic phenol/chloroform extraction, inorganic salting out, and silica membrane binding. Earlier routes, including magnetic beads, have been removed.

## Run locally

```sh
npm install
npm run dev
```

Open the local address printed by Vite. To build the production version, run `npm run build`.

## Workbench controls

- Use **+** and **-** to zoom the bench, and **Fit** to show the whole bench.
- When zoomed in, scroll the bench or swipe on a touch screen to reach the equipment.
- **Instructions** and **Hands** open or close the side panels. The hands panel opens automatically when an item is picked up.
- The **Full screen** control enlarges the app when supported by the browser.
- Complete an experiment to save its report and continue in the free lab.

## Source

- `src/App.tsx` and `src/components/Workbench.tsx`: lab layout and zoom controls.
- `src/engine.ts` and `src/store.ts`: guided hints, simulation state and error handling.
- `src/data/experiment1.ts`, `src/data/experiment2.ts` and `src/data/experiment3.ts`: method-specific steps.
- `src/components/modals/Instruments.tsx`: centrifuge and instrument interactions.

The simulations use illustrative teaching settings, not validated wet-lab protocols or real measurements.

## Checks

Run `npx tsc --noEmit -p tsconfig.json` and `npx tsx --test tests/lab.test.ts`. The optional browser walkthrough in `tests/browser.mjs` requires a running development server at `http://localhost:5173` and an installed Playwright Chromium browser.
## Current study sequence

The common steps are lysis buffer, DNase protection (chelating agent or heating), RNase plus Proteinase K, method-specific separation, 100% ethanol and centrifugation, a required 70% ethanol wash, then resuspension in 1x TE or DNase-free water.

The shared sequence is defined in `src/data/sharedProtocol.ts`. Each interactive step identifies the relevant part of the latest notes. Volumes, mixing counts, times and spin settings are explicitly teaching presets, not validated lab instructions. The silica recovery arrow is a labelled schematic transition because recovery conditions are not given in the source; a dry spin is not presented as an elution mechanism.

The enlarged workbench, zoom, fullscreen controls and post-experiment free lab remain available. UV measurement and storage are optional free-lab actions, not extra required stages.
