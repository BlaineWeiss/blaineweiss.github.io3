(function () {
  const canvas = document.getElementById('ray-canvas');
  if (!canvas) return;

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#0a1630');
      grad.addColorStop(1, '#123f63');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);
    return;
  }

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) return;

  const vSrc = 'attribute vec2 a;varying vec2 v;void main(){v=a*0.5+0.5;gl_Position=vec4(a,0.,1.);}';
  const fSrc = `
  precision mediump float;
  varying vec2 v;
  uniform vec2 r;
  uniform float t;

  vec2 n(vec2 p){return vec2(cos(p.y*2.0+t*.5),sin(p.x*2.0+t*.4))*0.18;}

  void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-r)/min(r.x,r.y);
    vec3 ro=vec3(0.0,0.1,-2.7);
    vec3 rd=normalize(vec3(uv,1.8));

    float pulse=sin(t*.7)*.15;
    vec3 c1=vec3(-0.7+pulse,0.15,1.4);
    vec3 c2=vec3(0.95,-0.1,1.7);
    float d1=length((ro+rd*2.2)-c1)-0.65;
    float d2=length((ro+rd*2.2)-c2)-0.5;

    float glow=0.06/(0.01+abs(d1))+0.05/(0.01+abs(d2));
    vec3 base=mix(vec3(0.02,0.05,0.14),vec3(0.05,0.28,0.36),v.y+0.12*sin(t*0.2));
    vec3 col=base + glow*vec3(0.3,0.7,1.0);

    vec2 p=v+n(v*2.);
    float grid=abs(fract(p.x*9.)-.5)+abs(fract(p.y*6.)-.5);
    col+=smoothstep(0.18,0.0,grid)*0.08;

    gl_FragColor=vec4(col,1.0);
  }`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vSrc));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fSrc));
  gl.linkProgram(program);
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uR = gl.getUniformLocation(program, 'r');
  const uT = gl.getUniformLocation(program, 't');

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  let raf;
  function draw(ts) {
    gl.uniform2f(uR, canvas.width, canvas.height);
    gl.uniform1f(uT, ts * 0.001);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(draw);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else raf = requestAnimationFrame(draw);
  });

  resize();
  window.addEventListener('resize', resize);
  raf = requestAnimationFrame(draw);
})();
