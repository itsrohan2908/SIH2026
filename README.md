# INDRA — Adaptive Risk-Aware Path Planning for Unstructured Indian Roads

A browser-based proof-of-concept developed as a rapid prototype for SIH Problem Statement 26037.

## What is implemented

- Unmarked road corridor without fixed lane-following logic
- Mixed Indian road users: cars, auto-rickshaws, motorcycles, buses, trucks, pedestrians, cattle and pushcarts
- Geometry-based artificial/simulated sensing
- Short-horizon motion estimation
- Object-type-aware risk scoring
- Three candidate lateral trajectories: LEFT / CENTER / RIGHT
- Cost-based path selection
- Dynamic replanning with path-change hysteresis
- Bounded steering/heading response to avoid oscillatory control
- Controlled slowing only under risk; full braking only when no safe candidate path exists
- Five SIH scenarios
- Live planner/perception/test dashboard

## Five scenarios

1. Unmarked Village Road
2. Busy Unsignalized Intersection
3. Highway Merge
4. Dense Market
5. Sudden Cattle Crossing

## Run

### Easiest
Open `index.html` in Chrome or Edge.

### Recommended
Double-click `start_server.bat` on Windows. It starts a small local HTTP server and opens the application.

## Demo order

1. Start with Scenario 5 — Sudden Cattle Crossing.
2. Show the vehicle cruising on the corridor.
3. Let the crossing cattle enter the planned corridor.
4. Point out the risk change, path costs, selected path and replan count.
5. Then show Scenario 4 — Dense Market.
6. Use the other three scenarios as validation evidence.

## Technical honesty for SIH

This is a proof-of-concept using simulated/artificial sensing. The current prototype is NOT a physical camera/LiDAR/radar implementation. The SIH target architecture can later be migrated to RoadRunner + MATLAB/Simulink with sensor models, tracking/fusion and higher-fidelity vehicle dynamics.

The project is an adaptation/extension of the MIT-licensed educational self-driving-car simulator by Radu Mariescu-Istodor. Preserve the original license/attribution when redistributing the code.

## FINAL3 planner safety update
The planner evaluates the full future swept trajectory of LEFT/CENTER/RIGHT candidate corridors rather than only a target point. It predicts object motion over a longer horizon, inflates clearance for object class and closing speed, penalizes prolonged parallel following of moving objects, checks road-edge feasibility, uses a fixed road-anchored target, and falls back to yield/stop only when no feasible corridor exists.


## Predictive safety behavior
The final planner time-aligns the predicted ego trajectory and each obstacle trajectory. It evaluates a full swept corridor, rejects paths that remain in an obstacle trajectory for multiple samples, and uses an immediate stop when no feasible corridor exists. The UI also renders projected trajectories for visible road users.

## Final predictive-planning behavior
- Predicts ego and every visible obstacle at the same future timestamps.
- Evaluates full candidate trajectories rather than only endpoint positions.
- Rejects paths that enter an inflated predicted obstacle corridor.
- Penalizes and rejects prolonged obstacle-following / trajectory shadowing.
- Keeps LEFT/CENTER/RIGHT targets anchored to the road.
- Uses bounded steering and early risk-based speed reduction.
- If no feasible corridor exists, the vehicle stops and waits for a safe gap.
- Visible predicted road-user trajectories are rendered for demonstration.

## UI update

The prototype interface is responsive across laptop, tablet, mobile portrait, and mobile landscape layouts. The dashboard prioritizes live decision state, scenario context, perception, planner telemetry, safety results, and the visual legend for SIH demonstrations.
