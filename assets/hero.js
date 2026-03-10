(() => {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 9);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const group = new THREE.Group();
  scene.add(group);

  const geometry = new THREE.IcosahedronGeometry(2.2, 12);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x5be6ff,
    transmission: .94,
    roughness: .2,
    thickness: .5,
    metalness: .05,
    transparent: true,
    opacity: .35
  });

  const orb = new THREE.Mesh(geometry, material);
  group.add(orb);

  const points = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', geometry.getAttribute('position')),
    new THREE.PointsMaterial({ color: 0x9b7bff, size: 0.05 })
  );
  group.add(points);

  const light1 = new THREE.PointLight(0x5be6ff, 12, 40);
  light1.position.set(4, 3, 5);
  const light2 = new THREE.PointLight(0x9b7bff, 10, 40);
  light2.position.set(-3, -2, 4);
  scene.add(light1, light2);

  const animate = (t) => {
    group.rotation.y = t * 0.00023;
    group.rotation.x = Math.sin(t * 0.00012) * .2;
    orb.scale.setScalar(1 + Math.sin(t * 0.0015) * .025);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };
  animate(0);

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
})();
