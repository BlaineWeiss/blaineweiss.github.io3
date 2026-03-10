(() => {
  const canvas = document.getElementById('stone-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 100);
  camera.position.set(0, 0, 11);

  const root = new THREE.Group();
  scene.add(root);

  const astrocytes = [];
  for (let i = 0; i < 16; i++) {
    const g = new THREE.IcosahedronGeometry(0.32 + Math.random() * 0.25, 3);
    const m = new THREE.MeshStandardMaterial({ color: 0x5be6ff, emissive: 0x0d5f71, roughness: 0.2, metalness: 0.25 });
    const mesh = new THREE.Mesh(g, m);
    const angle = (i / 16) * Math.PI * 2;
    mesh.position.set(Math.cos(angle) * (2.8 + Math.random() * 1.7), Math.sin(angle * 1.7) * 1.9, (Math.random() - .5) * 2.6);
    mesh.userData.id = i;
    root.add(mesh);
    astrocytes.push(mesh);
  }

  const arteriole = new THREE.Mesh(
    new THREE.TorusKnotGeometry(2.8, 0.16, 260, 28),
    new THREE.MeshPhysicalMaterial({ color: 0xff5f7e, emissive: 0x5f1122, transmission: 0.5, transparent: true, opacity: 0.7 })
  );
  arteriole.rotation.x = Math.PI / 2.6;
  root.add(arteriole);

  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  const p1 = new THREE.PointLight(0x5be6ff, 17, 80); p1.position.set(4, 2, 6);
  const p2 = new THREE.PointLight(0xff4f80, 12, 70); p2.position.set(-5, -3, 4);
  scene.add(ambient, p1, p2);

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(2, 2);
  let hovered = null;

  const traceBase = document.getElementById('trace-base');
  const traceActive = document.getElementById('trace-active');
  const traceMeta = document.getElementById('trace-meta');

  function createTrace(seed = 0) {
    const points = [];
    for (let x = 0; x <= 440; x += 8) {
      const t = (x / 440) * Math.PI * 4;
      const y = 130 + Math.sin(t + seed) * 46 + Math.sin(t * 2.7 + seed * 0.4) * 15;
      points.push([10 + x, y]);
    }
    return points;
  }

  function pathFrom(points) {
    return points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  }

  function markSignificant(points) {
    const threshold = 165;
    const peaks = points.filter(([, y], i) => i > 0 && i < points.length - 1 && y > threshold && y > points[i - 1][1] && y > points[i + 1][1]);
    traceMeta.innerHTML = `<strong>Hover status:</strong> astrocyte ${hovered?.userData.id ?? '-'} active<br><strong>Significant hills:</strong> ${peaks.length} above threshold`;
  }

  const baseTrace = createTrace();
  traceBase.setAttribute('d', pathFrom(baseTrace));
  traceActive.setAttribute('d', pathFrom(baseTrace));

  function resize() {
    const rect = canvas.getBoundingClientRect();
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    renderer.setSize(rect.width, rect.height, false);
  }

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  });

  function animate(t) {
    raycaster.setFromCamera(mouse, camera);
    const hit = raycaster.intersectObjects(astrocytes)[0]?.object ?? null;

    if (hit !== hovered) {
      astrocytes.forEach(a => a.material.emissive.setHex(0x0d5f71));
      hovered = hit;
      if (hovered) {
        hovered.material.emissive.setHex(0x6d31ff);
        const trace = createTrace(hovered.userData.id * 0.7 + t * 0.0004);
        traceActive.setAttribute('d', pathFrom(trace));
        markSignificant(trace);
      } else {
        traceMeta.innerHTML = '<strong>Hover status:</strong> waiting for interaction...';
      }
    }

    root.rotation.y = t * 0.00024;
    root.rotation.x = Math.sin(t * 0.0002) * 0.15;
    arteriole.scale.setScalar(1 + Math.sin(t * 0.002) * 0.04);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  resize();
  addEventListener('resize', resize);
  animate(0);
})();
