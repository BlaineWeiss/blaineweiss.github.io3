 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/assets/tools.js b/assets/tools.js
index 62d472f6fe8e06afded80f980edf1a7ceb204add..e0b645750a63fbbe0e9054b83098c70c6f8030ef 100644
--- a/assets/tools.js
+++ b/assets/tools.js
@@ -1,111 +1,194 @@
 (() => {
   const canvas = document.getElementById('stone-canvas');
   if (!canvas || typeof THREE === 'undefined') return;
 
   const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
   renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
+
   const scene = new THREE.Scene();
-  const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 100);
-  camera.position.set(0, 0, 11);
+  scene.fog = new THREE.FogExp2(0x040814, 0.055);
+
+  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
+  camera.position.set(0, 1.2, 12.5);
 
   const root = new THREE.Group();
   scene.add(root);
 
-  const astrocytes = [];
-  for (let i = 0; i < 16; i++) {
-    const g = new THREE.IcosahedronGeometry(0.32 + Math.random() * 0.25, 3);
-    const m = new THREE.MeshStandardMaterial({ color: 0x5be6ff, emissive: 0x0d5f71, roughness: 0.2, metalness: 0.25 });
-    const mesh = new THREE.Mesh(g, m);
-    const angle = (i / 16) * Math.PI * 2;
-    mesh.position.set(Math.cos(angle) * (2.8 + Math.random() * 1.7), Math.sin(angle * 1.7) * 1.9, (Math.random() - .5) * 2.6);
-    mesh.userData.id = i;
-    root.add(mesh);
-    astrocytes.push(mesh);
+  const starsGeometry = new THREE.BufferGeometry();
+  const starsCount = 700;
+  const starPos = new Float32Array(starsCount * 3);
+  for (let i = 0; i < starsCount; i++) {
+    const i3 = i * 3;
+    starPos[i3] = (Math.random() - 0.5) * 36;
+    starPos[i3 + 1] = (Math.random() - 0.5) * 20;
+    starPos[i3 + 2] = (Math.random() - 0.5) * 24;
   }
+  starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
+  const stars = new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: 0x85a8ff, size: 0.04, transparent: true, opacity: 0.65 }));
+  scene.add(stars);
 
   const arteriole = new THREE.Mesh(
-    new THREE.TorusKnotGeometry(2.8, 0.16, 260, 28),
-    new THREE.MeshPhysicalMaterial({ color: 0xff5f7e, emissive: 0x5f1122, transmission: 0.5, transparent: true, opacity: 0.7 })
+    new THREE.TubeGeometry(
+      new THREE.CatmullRomCurve3([
+        new THREE.Vector3(-4, -1.3, -1.4),
+        new THREE.Vector3(-2, -0.2, 1.2),
+        new THREE.Vector3(0, -0.6, -0.8),
+        new THREE.Vector3(2.4, 0.8, 0.9),
+        new THREE.Vector3(4, 0.1, -1.1)
+      ]),
+      220,
+      0.45,
+      28,
+      false
+    ),
+    new THREE.MeshPhysicalMaterial({
+      color: 0xff6a97,
+      emissive: 0x5d152b,
+      roughness: 0.18,
+      metalness: 0.46,
+      transmission: 0.62,
+      transparent: true,
+      opacity: 0.88
+    })
   );
-  arteriole.rotation.x = Math.PI / 2.6;
   root.add(arteriole);
 
-  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
-  const p1 = new THREE.PointLight(0x5be6ff, 17, 80); p1.position.set(4, 2, 6);
-  const p2 = new THREE.PointLight(0xff4f80, 12, 70); p2.position.set(-5, -3, 4);
-  scene.add(ambient, p1, p2);
+  const astrocytes = [];
+  const astroMaterial = () => new THREE.MeshStandardMaterial({ color: 0x67f0ff, emissive: 0x124f61, metalness: 0.35, roughness: 0.22 });
+
+  for (let i = 0; i < 18; i++) {
+    const cell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.31 + Math.random() * 0.18, 4), astroMaterial());
+    const angle = (i / 18) * Math.PI * 2;
+    const ring = 3 + Math.sin(i * 0.8) * 1.3 + Math.random() * 0.6;
+    cell.position.set(Math.cos(angle) * ring, Math.sin(angle * 1.7) * 1.5, (Math.random() - 0.5) * 3.8);
+    cell.userData.id = i + 1;
+
+    const endfoot = new THREE.Mesh(
+      new THREE.SphereGeometry(0.11, 20, 20),
+      new THREE.MeshBasicMaterial({ color: 0x9bffc4, transparent: true, opacity: 0.92 })
+    );
+    endfoot.position.copy(cell.position).multiplyScalar(0.7);
+    endfoot.position.y -= 0.16;
+    endfoot.userData.linked = cell;
+
+    root.add(cell, endfoot);
+    astrocytes.push({ cell, endfoot });
+  }
+
+  const rayGlow = new THREE.Mesh(
+    new THREE.CylinderGeometry(0.08, 2.6, 9.5, 28, 1, true),
+    new THREE.MeshBasicMaterial({ color: 0x6fb7ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
+  );
+  rayGlow.position.y = 0.5;
+  rayGlow.rotation.z = Math.PI / 2.8;
+  root.add(rayGlow);
+
+  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
+  const blue = new THREE.PointLight(0x67f0ff, 21, 60); blue.position.set(4, 4, 5);
+  const magenta = new THREE.PointLight(0xa57dff, 16, 60); magenta.position.set(-5, -2, 6);
+  const pink = new THREE.PointLight(0xff5f8f, 12, 50); pink.position.set(0, -4, 2);
+  scene.add(blue, magenta, pink);
 
   const raycaster = new THREE.Raycaster();
   const mouse = new THREE.Vector2(2, 2);
   let hovered = null;
 
   const traceBase = document.getElementById('trace-base');
   const traceActive = document.getElementById('trace-active');
   const traceMeta = document.getElementById('trace-meta');
+  const hillMarkers = document.getElementById('hill-markers');
 
-  function createTrace(seed = 0) {
+  function createTrace(seed = 0, phase = 0) {
     const points = [];
     for (let x = 0; x <= 440; x += 8) {
       const t = (x / 440) * Math.PI * 4;
-      const y = 130 + Math.sin(t + seed) * 46 + Math.sin(t * 2.7 + seed * 0.4) * 15;
+      const y = 122
+        + Math.sin(t + seed + phase) * 48
+        + Math.sin(t * 2.3 + seed * 0.6 + phase * 1.8) * 18
+        + Math.sin(t * 3.7 + seed * 0.3) * 8;
       points.push([10 + x, y]);
     }
     return points;
   }
 
-  function pathFrom(points) {
-    return points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
+  function toPath(points) {
+    return points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
   }
 
-  function markSignificant(points) {
-    const threshold = 165;
+  function updateMarkers(points) {
+    const threshold = 160;
+    hillMarkers.innerHTML = '';
     const peaks = points.filter(([, y], i) => i > 0 && i < points.length - 1 && y > threshold && y > points[i - 1][1] && y > points[i + 1][1]);
-    traceMeta.innerHTML = `<strong>Hover status:</strong> astrocyte ${hovered?.userData.id ?? '-'} active<br><strong>Significant hills:</strong> ${peaks.length} above threshold`;
+
+    peaks.forEach(([x, y]) => {
+      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
+      marker.setAttribute('cx', x.toFixed(1));
+      marker.setAttribute('cy', y.toFixed(1));
+      marker.setAttribute('r', '4.2');
+      marker.setAttribute('fill', '#9bffc4');
+      marker.setAttribute('opacity', '0.9');
+      hillMarkers.appendChild(marker);
+    });
+
+    traceMeta.innerHTML = `<strong>Hover status:</strong> astrocyte ${hovered?.userData.id ?? '-'} linked to arteriole<br><strong>Significant hills:</strong> ${peaks.length} above threshold`;
   }
 
-  const baseTrace = createTrace();
-  traceBase.setAttribute('d', pathFrom(baseTrace));
-  traceActive.setAttribute('d', pathFrom(baseTrace));
+  const initial = createTrace(0, 0);
+  traceBase.setAttribute('d', toPath(initial));
+  traceActive.setAttribute('d', toPath(initial));
 
   function resize() {
     const rect = canvas.getBoundingClientRect();
     camera.aspect = rect.width / rect.height;
     camera.updateProjectionMatrix();
     renderer.setSize(rect.width, rect.height, false);
   }
 
-  canvas.addEventListener('mousemove', (e) => {
-    const r = canvas.getBoundingClientRect();
-    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
-    mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
+  canvas.addEventListener('mousemove', (event) => {
+    const bounds = canvas.getBoundingClientRect();
+    mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
+    mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
   });
 
-  function animate(t) {
+  canvas.addEventListener('mouseleave', () => {
+    mouse.set(2, 2);
+    hovered = null;
+    traceMeta.innerHTML = '<strong>Hover status:</strong> waiting for interaction...';
+    hillMarkers.innerHTML = '';
+  });
+
+  function animate(time = 0) {
+    const phase = time * 0.0014;
+
     raycaster.setFromCamera(mouse, camera);
-    const hit = raycaster.intersectObjects(astrocytes)[0]?.object ?? null;
-
-    if (hit !== hovered) {
-      astrocytes.forEach(a => a.material.emissive.setHex(0x0d5f71));
-      hovered = hit;
-      if (hovered) {
-        hovered.material.emissive.setHex(0x6d31ff);
-        const trace = createTrace(hovered.userData.id * 0.7 + t * 0.0004);
-        traceActive.setAttribute('d', pathFrom(trace));
-        markSignificant(trace);
-      } else {
-        traceMeta.innerHTML = '<strong>Hover status:</strong> waiting for interaction...';
-      }
+    const hits = raycaster.intersectObjects(astrocytes.map((a) => a.cell));
+    hovered = hits[0]?.object ?? null;
+
+    astrocytes.forEach(({ cell, endfoot }) => {
+      const active = hovered === cell;
+      cell.material.emissive.setHex(active ? 0x6b34ff : 0x124f61);
+      endfoot.material.color.setHex(active ? 0xb4ffe6 : 0x9bffc4);
+      endfoot.material.opacity = active ? 1 : 0.78;
+      cell.scale.setScalar(active ? 1.14 : 1 + Math.sin(phase + cell.userData.id) * 0.03);
+    });
+
+    if (hovered) {
+      const trace = createTrace(hovered.userData.id * 0.55, phase);
+      traceActive.setAttribute('d', toPath(trace));
+      updateMarkers(trace);
     }
 
-    root.rotation.y = t * 0.00024;
-    root.rotation.x = Math.sin(t * 0.0002) * 0.15;
-    arteriole.scale.setScalar(1 + Math.sin(t * 0.002) * 0.04);
+    root.rotation.y = phase * 0.32;
+    root.rotation.x = Math.sin(phase * 0.4) * 0.13;
+    arteriole.material.emissiveIntensity = 0.58 + Math.sin(phase * 2.2) * 0.15;
+    rayGlow.material.opacity = 0.08 + Math.sin(phase * 1.8) * 0.05;
+    stars.rotation.y = phase * 0.05;
 
     renderer.render(scene, camera);
     requestAnimationFrame(animate);
   }
 
   resize();
-  addEventListener('resize', resize);
-  animate(0);
+  window.addEventListener('resize', resize);
+  animate();
 })();
 
EOF
)
