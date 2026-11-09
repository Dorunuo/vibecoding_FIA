# Week 06 Group Assignment Workflow Example — Campus Experience

This is a **planning example**, not an additional assignment. The [Week 06 Group Assignment](Week_06_Group_Assignment.md) controls the required work, AI-use boundaries, files, deadline and submission route. You do **not** need to build a campus model or game. Use the example to see how a large idea can become a sequence of small decisions, working artifacts, checks and revisions.

## The example in one minute

The campus example began with casual photos of buildings and campus and a physical 沙盘模型, without a measured site plan. The team first identified visible landmarks and their relative positions. An early building was modeled in Blender; a later browser experience used a shared model-relative layout and authored Three.js geometry for a day tour and a fictional night game. The team built a walkable version, added place-based interactions, inspected screenshots and gameplay, and made a separate scripted demonstration and MP4. The interactive game, live demo and recording were labeled separately. The source repository, generated builds and presentation demo were also kept distinct.

**OpenAI Codex** was the AI coding harness used to coordinate this work. The recorded primary model in this Codex chat was **GPT-6 Sol** (`gpt-6-sol`). Other capable AI coding harnesses can follow the same workflow. The important steps are to inspect the available evidence, keep a bounded goal, test the actual result and revise it based on what the tests show. A polished final video does not reveal the planning, failed attempts or checks that produced it.

## One-day concept scope

A **small place-based concept demo** can be completed in one day by one person working with AI, with **no more than eight hours of total work**. That bounded version means a few organized reference photos, an approximate layout, one recognizable walkable area, one interaction, a short demonstration and a final check. The more polished day-and-night campus experience grew through later revisions; the eight-hour bound does not describe that entire development history.

| Concept-demo task | Suggested maximum time |
| --- | ---: |
| Brief and reference inventory | 1 hour |
| Model-relative layout and simple visual plan | 1 hour |
| Walkable first version | 2 hours |
| One interaction and visual/audio assets | 2 hours |
| Demonstration, testing and one revision | 1 hour |
| Final packaging and source check | 1 hour |
| **Total** | **8 hours** |

## Optional source code

The browser experience source is publicly available at [greenquark/gbu-campus](https://github.com/greenquark/gbu-campus). Interested students can use **Code → Download ZIP** or `git clone` to obtain a copy. Students who cannot access or download it can request access or a shared source archive from the instructor. Reading the source is optional. The separate classroom demo and MP4 are not part of that repository.

## Workflow — Set a bounded goal

Decide whether the visitor should take a guided tour, explore freely or play a game. Make one recognizable area work before enlarging the world.

**Useful working artifact:** a short brief stating the intended visitor experience, the area to build, one interaction and the limits of the first version.

## Workflow — Inventory evidence and constraints

Sort scale-model photos into overview, side and close-up views. Record which photo supports each building placement; mark hidden sides and unknown dimensions. Use separate photos for façade details. With no plan or reliable north direction, use model-relative positions rather than claim geographic accuracy.

**Useful working artifact:** a two-column ledger: **what the references establish** and **what is inferred or still needs checking**.

**Example AI study prompt:**

> From the reference materials I provide, list the inputs, known constraints, inferred details and missing evidence. Cite the supplied file or passage behind each claim. Say “unknown” when the materials do not answer a question. Do not claim that a scale-model photo is a measured site plan or that a finished video proves how every shot was made.

## Workflow — Make one shared plan

Build an approximate landmark map and use it for buildings, walking routes, collision, the game map and objectives. If those systems use different layouts, players can see a path that they cannot actually walk.

**Useful working artifact:** one annotated map showing landmarks, routes, approximate positions and uncertain areas.

## Workflow — Test a small version before detailed production

Make a simple walkable blockout before detailed materials, characters and effects. Check that a visitor can reach the intended landmarks.

**Useful working artifact:** a playable first version and a short list of routes or interactions to test.

## Workflow — Produce assets with traceable handoffs

Keep original references, editable source, generated images, runtime assets and builds separate. For each asset, record its purpose and whether it is source evidence, an original creation or an interpretation.

**Useful working artifact:** an asset list with each file's source, purpose, status and location in the project.

## Workflow — Assemble, inspect and revise

A scripted demo, real play and an MP4 served different purposes. The team tested the interactive route with real controls and checked that the recording actually played through with sound.

**Useful working artifact:** a tested build, a short demonstration and notes on one specific problem to revise.

## Workflow — Verify the finished work and explain your limits

Check model-to-reference resemblance, route reachability, interactions, browser errors, narrow-screen readability, audio shutdown and actual playback. State which devices or scenarios were not tested. Confirm GitHub against the current remote branch; a built file or separate demo is not automatically in the source repository.

**Useful working artifact:** a short verification record saying what was checked, what worked and what remains uncertain.

## A reusable planning pattern

For an ambitious assignment, keep the chain visible:

| Stage | Question | Working output | Check before moving on |
| --- | --- | --- | --- |
| Brief | What are we making, for whom and within what limits? | One-page direction | Can a teammate explain the goal? |
| Evidence | What do we know, infer or invent? | Source ledger | Can each important claim be traced? |
| Plan | How do the parts fit together? | Landmark map and route plan | Is the layout coherent and feasible? |
| Small test | What is the cheapest useful version? | Walkable blockout | Can someone reach the intended places? |
| Production | Which assets and tasks depend on others? | Asset list and working build | Are sources, roles and versions clear? |
| Revision | What specifically failed or worked? | One targeted change | Did the change improve the result? |
| Delivery | Does the actual final file work? | Verified build and recording | Did we open and inspect what we delivered? |

The value of a sophisticated workflow is not the number of tools or prompts. It is the way each decision produces something inspectable, and each check determines the next revision.

## Next steps beyond the concept demo

This demo is a starting point. A more polished place-based experience needs better 3D models, supported by more viewpoints or measurements, cleaner geometry, richer materials and closer comparison with the real place. A more sophisticated game also needs deeper location-specific mechanics, clearer progression, better challenge balance and repeated playtesting.
