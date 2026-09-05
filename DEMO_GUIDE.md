# INDRA — 3-minute SIH Demo Guide

## 1. Start
Open `index.html`. If needed, double-click `start_server.bat` and open `http://localhost:8000`.

## 2. Open Scenario 5 — Sudden Cattle Crossing
Explain:

> “The ego vehicle is driving without relying on a fixed lane. The simulated perception layer observes heterogeneous road users. When the cattle enters the forward corridor, the planner increases the predicted risk and selects a safer local trajectory.”

Point at:
- yellow sensing rays
- red/orange/green risk zones
- candidate trajectories
- selected cyan path
- `REPLANNING` / path change
- `Replans` metric

## 3. Open Scenario 4 — Dense Market
Point out:
- auto-rickshaw
- bike
- pedestrians
- pushcart
- multiple simultaneous obstacles

Say:

> “The same planning loop is reused for dense mixed traffic. The system evaluates LEFT, CENTER and RIGHT trajectories continuously rather than assuming lane discipline.”

## 4. Open the other scenarios
Show the five required cases:

1. Unmarked village road
2. Busy unsignalized intersection
3. Highway merge
4. Dense market
5. Sudden cattle crossing

## 5. Be honest about sensing
Say:

> “This is our rapid browser proof-of-concept. The current perception is simulated geometry-based sensing. The production architecture maps these interfaces to RoadRunner and MATLAB/Simulink camera, LiDAR and radar models with sensor fusion.”

Do not claim that this prototype contains physical sensors or production-grade autonomy.
