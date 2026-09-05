function makeScenario(name, road) {
  const a = [];
  const add = (type, x, y, opts = {}) => a.push(new TrafficAgent(type, x, y, opts));

  switch (name) {
    case 'village':
      add('AUTO', -85, 150, { speed: 0.95, behavior: 'sine' });
      add('BIKE', 75, 60, { speed: 1.35, behavior: 'wander' });
      add('CATTLE', 150, -10, { speedY: 0.02, speedX: -0.72, behavior: 'cattle', activeAt: 1500, width: 34, height: 34 });
      add('PUSHCART', -45, -110, { speed: 0.45, behavior: 'sine' });
      break;

    case 'intersection':
      add('AUTO', -105, 115, { speed: 0.85, behavior: 'sine' });
      add('BIKE', 105, 95, { speed: 1.35, behavior: 'wander' });
      add('PEDESTRIAN', 120, 12, { speedY: 0.0, speedX: -0.95, behavior: 'cross', activeAt: 1200, width: 20, height: 20 });
      add('CAR', -90, -70, { speed: 1.4, behavior: 'merge', speedX: 0.95 });
      break;

    case 'highway':
      add('TRUCK', 0, 145, { speed: 0.62, behavior: 'forward', width: 28, height: 48 });
      add('CAR', 120, 45, { speed: 1.9, behavior: 'forward' });
      add('CAR', -125, 5, { speed: 1.75, behavior: 'merge', speedX: 1.05 });
      add('BIKE', 70, -95, { speed: 1.85, behavior: 'wander' });
      break;

    case 'market':
      add('AUTO', -105, 145, { speed: 0.9, behavior: 'sine' });
      add('BIKE', 75, 105, { speed: 1.25, behavior: 'wander' });
      add('PEDESTRIAN', 125, 45, { speedY: 0.0, speedX: -0.7, behavior: 'cross', activeAt: 900, width: 20, height: 20 });
      add('PUSHCART', -55, -5, { speed: 0.3, behavior: 'sine' });
      add('PEDESTRIAN', -125, -50, { speedY: 0.0, speedX: 0.62, behavior: 'cross', activeAt: 1300, width: 20, height: 20 });
      add('AUTO', 95, -120, { speed: 0.9, behavior: 'sine' });
      break;

    case 'cattle':
      // Keep this scenario focused on the required sudden-cattle event. A
      // distant two-wheeler provides mixed-traffic context without creating a
      // second dominant conflict that can obscure the replanning demonstration.
      add('BIKE', -155, -55, { speed: 1.25, behavior: 'wander' });
      add('CATTLE', 170, 35, { speedY: 0.0, speedX: -1.35, behavior: 'cattle', activeAt: 900, width: 34, height: 34 });
      break;
  }

  return a;
}
