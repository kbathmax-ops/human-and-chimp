# Human versus chimpanzee: research and simulator revision

Research reviewed 8 September 2026. This is a mechanics-based thought experiment, not an empirical fight predictor.

## What the evidence supports

| Topic | Research finding | Consequence for the simulator |
|---|---|---|
| Muscle performance | O’Neill et al. modeled approximately 1.35× dynamic force and power in equal-sized chimp muscle. This does not measure total-body fighting strength. | Apply a burst parameter to dynamic chimp actions, not a blanket bonus to all traits. |
| Body mass | Gombe longitudinal data reported a 39 kg median for adult males. This is population-specific. | Offer editable chimp mass; treat the 50 kg default and 60 kg larger male as scenarios. |
| Human reference | CDC data for US men aged 20+ give 175 cm and 90.3 kg averages. A 6′3″ person is 190.5 cm. | Separate the population reference from the tall-man scenario; do not infer athletic ability from height. |
| Biting | Biomechanical research shows that force depends on loading, bite location, and jaw constraints. | Avoid a universal PSI claim; bites require a clinch and their damage remains an assumption. |

Sources: [O’Neill et al., PNAS, 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5514706/), [Pusey et al., AJPA, 2005](https://experts.umn.edu/en/publications/influence-of-ecological-and-social-factors-on-body-mass-of-wild-c/), [CDC body measurements](https://www.cdc.gov/nchs/fastats/body-measurements.htm), [Ledogar et al., PeerJ, 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4975005/).

## What changed

The previous engine chose an exchange winner from one heavily weighted score and almost always inflicted damage. Its outcome percentages were products of authored balance settings. Running many trials verified that code; it did not validate those settings scientifically.

The new engine tracks separation, readiness, contact phase, energy expenditure, condition, and time. A fighter must be in range; attacks can miss; clinches create bite opportunities; breaking contact consumes energy. A spear loses its long-range advantage inside a clinch. A rifle needs readiness and separation instead of receiving a global power bonus. Encounters may end with withdrawal, separation, or no decisive result at the step limit.

The arena uses the same distance and event state as the engine. Character size changes with the scenario, and the display adds range, contact phase, simulated time, stamina, and event-specific movement. The journal records non-damaging actions as well as hits.

## Assumptions that remain

- Body mass is converted into a size proxy using a ⅔ exponent. This is a geometric simplification, not a measured muscle-mass or whole-body strength conversion. Body fat and individual muscle distribution are not modeled.
- Skill transfer, grip advantage, reach, attack selection, accuracy, damage, and fatigue rates have no human–chimp combat calibration.
- The 1.20×, 1.35×, and 1.50× burst choices are sensitivity scenarios, not a scientific confidence interval. Individual capability also varies by an assumed ±10% per run.
- Agitation increases activity and energy cost; it does not grant extra muscle strength or durability. The “alpha” name is retained only as a larger-male preset label.
- Condition points and simulated seconds are game abstractions. They do not estimate medical injury severity or actual encounter duration.
- The juvenile is an illustrative developmental scenario. The Gombe adult-mass reference should not be applied to juveniles.

The studies reviewed do not establish credible fight-win odds for a 6′3″ man, an MMA fighter, or an armed person. Greater mechanical detail makes the simulation easier to inspect, not scientifically predictive.

## Verification

36,000 runs covered five human presets, four chimp presets, three starting distances, and two readiness settings. Checks covered health and stamina bounds, damage accounting, increasing time, bite and weapon ranges, deterministic replay, and non-decisive outcomes. Another 8,000 runs checked directional sensitivity to human mass and weapon readiness/distance. The production build and local route also passed. Browser interaction/visual QA and the optional WebMCP surface were not tested in this pass.
