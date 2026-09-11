# human & chimp

A React + Three.js human/chimp simulator with original faceted Blender characters, a full-screen grassland, 360° orbit controls, smooth zoom, vintage typography, and research notes.

## Run

Requires Node.js 22.12+ or 24.

```sh
npm ci
npm run dev
npm run build
npm test
```

Drag to orbit, scroll or pinch to zoom. Arrow keys rotate the focused arena; +/− zoom; R resets. Wide, Side, Top and Close select camera presets. Customize contains scenario settings; Research contains source findings and limitations; Journal explains each exchange.

## Blender source

Open `blender/Human-and-Chimp.blend`. Both models have named rigid joint pivots for head, shoulders, elbows, hands, hips, knees, and the chimp jaw. Meshes and flat-shaded materials are editable. This is a hierarchical rigid rig, not a skinned armature. `public/models/human.glb` and `chimp.glb` are the exported game assets.

To regenerate using Blender 5.2:

```sh
blender --background --factory-startup --python blender/build_characters.py -- "$PWD"
```

The script also renders `blender/character-study.png`. Keep the GLB files and bundled fonts alongside the React source; the complete ZIP includes them.

## Positions and injury cues

Standing exchanges can enter a clinch, become a takedown, persist on the ground, switch control, and recover to standing. Pulls, bites, bite-and-pull tears, forearm frames, covering and defensive strikes use distinct events. Injury is represented by muted surface marks, with no blood particles, exposed tissue or dismemberment. Positions and attack frequencies remain illustrative assumptions. The development-only `/tests/pose-check.html` lets reviewers inspect the standing, clinch and both ground-control poses.

## Combat animation

Exchanges now have anticipation, contact, recoil and recovery, with alternating lead arms, circling footwork, evasive movement and brief dust cues. Arm joints aim toward the opponent during strikes and grips. Takedowns blend into ground positions. One shared playback clock keeps condition changes, narration and animation aligned at contact; pause, speed changes and seeded replays retain that timing. These are authored animations, not a physical collision solver.

Run `npm test` for playback timing checks and the existing 2,000 seeded simulation checks.

Unarmed humans can now attempt front kicks while standing with enough room and energy. Kicks can miss and use extra stamina; their frequency and damage are game assumptions. Exchanges play roughly one-third faster. Bite-and-pull tears use a jaw close, body tug and stretching, jagged surface marks without gore.

## Research and interpretation

The default unarmed mode now targets roughly 5% human wins as an explicit arcade difficulty. A seeded 5% draw chooses the desired winner, then searches up to 256 complete encounters for a matching outcome. Pressure mode boosts chimp combat effectiveness relative to the selected human and increases clinches, takedowns and ground control. For a rare human-win draw, the search may use a lower-pressure encounter after 64 attempts. HP, positions and verdicts are never rewritten; on search exhaustion the last valid encounter is used. The Research panel discloses this selection. Weapon encounters bypass the filter and effectiveness boost. These choices are game design, not measured animal behavior or survival odds.

This is an illustrative scenario model, not a validated fight predictor. The 1.35× comparison concerns equal-sized muscle in a 2017 biomechanical model; it does not mean a chimp is 1.35× stronger than every human. Mass, readiness, contact distance, fatigue and individual variation affect the simulation. Damage, attack probabilities and outcomes remain design assumptions. No measured real-world win odds are displayed.

See RESEARCH.md and the in-app Research panel for sources.

## GitHub and Vercel

This directory is the complete deployment source. It contains no credentials. Use the Vite framework preset, `npm run build`, and output directory `dist`; these settings are recorded in vercel.json.

Push this repository to GitHub, import it into Vercel, and use main as the production branch. Subsequent pushes will deploy automatically once the Git integration is connected.

## Assets

Characters are original Blender geometry; the landscape is procedural Three.js geometry. Fraunces (italic display) and DM Sans are bundled locally under the SIL Open Font License; see public font license files. No third-party character model or screenshot is redistributed.

## Verification

Production build passes with Vite 8.2.2; npm audit reports zero vulnerabilities. The automated test covers 2,000 seeded encounters, deterministic replay, condition and stamina bounds, contact requirements, ground control and all new attack/defense events. Browser checks cover model loading, title and Customize changes, camera presets, and dedicated clinch/ground pose fixtures. Characters are deliberately stylized.
