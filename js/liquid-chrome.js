// =========================================================
// Liquid Chrome — fondo animado del hero
// Versión sin React del componente LiquidChrome de React Bits,
// con la paleta de la marca (negro, bordó y dorado).
// =========================================================
(() => {
  const OPTIONS = {
    speed: 0.3,        // velocidad de la animación
    amplitude: 0.3,    // cuánto se "deforma" el líquido
    frequencyX: 3,
    frequencyY: 2,
    interactive: true, // ondas que siguen al mouse
    resolution: 0.6,   // calidad (1 = máxima). Más bajo = más liviano
    // Paleta en RGB 0→1 (equivale a las variables de styles.css)
    colors: {
      dark:      [0.05, 0.043, 0.06], // --c-bg     #0d0b0f
      wine:      [0.35, 0.094, 0.137],// --c-wine   #5a1823
      gold:      [0.79, 0.64, 0.30],  // --c-gold   #c9a44c
      goldLight: [0.90, 0.79, 0.49],  // --c-gold-light #e6c97c
    },
  };

  const canvas = document.getElementById('liquid-bg');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false });
  if (!gl) { canvas.remove(); return; } // sin WebGL queda el fondo con degradados del CSS

  const vertex = `
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
      vUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }`;

  const fragment = `
    precision highp float;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse;
    uniform float uAmplitude;
    uniform float uFrequencyX;
    uniform float uFrequencyY;
    uniform vec3 uDark;
    uniform vec3 uWine;
    uniform vec3 uGold;
    uniform vec3 uGoldLight;
    varying vec2 vUv;

    vec3 renderImage(vec2 uvCoord) {
      vec2 fragCoord = uvCoord * uResolution;
      vec2 uv = (2.0 * fragCoord - uResolution) / min(uResolution.x, uResolution.y);

      for (float i = 1.0; i < 10.0; i++) {
        uv.x += uAmplitude / i * cos(i * uFrequencyX * uv.y + uTime + uMouse.x * 3.14159);
        uv.y += uAmplitude / i * cos(i * uFrequencyY * uv.x + uTime + uMouse.y * 3.14159);
      }

      // onda alrededor del mouse
      vec2 diff = uvCoord - uMouse;
      float dist = length(diff);
      float falloff = exp(-dist * 20.0);
      float ripple = sin(10.0 * dist - uTime * 2.0) * 0.03;
      uv += (diff / (dist + 0.0001)) * ripple * falloff;

      // Original: color = base / abs(sin(...)). Acá se convierte ese brillo
      // en un degradado negro → bordó → dorado, como metal líquido.
      float t = 1.0 - abs(sin(uTime - uv.y - uv.x));
      vec3 col = uDark;
      col += uWine * pow(t, 2.2) * 0.9;
      col += uGold * pow(t, 9.0) * 0.9;
      col += uGoldLight * pow(t, 48.0) * 0.6;
      return col;
    }

    void main() {
      vec3 col = vec3(0.0);
      for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
          vec2 offset = vec2(float(i), float(j)) * (1.0 / min(uResolution.x, uResolution.y));
          col += renderImage(vUv + offset);
        }
      }
      gl_FragColor = vec4(col / 9.0, 1.0);
    }`;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  gl.useProgram(program);

  // Triángulo que cubre toda la pantalla
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const u = name => gl.getUniformLocation(program, name);
  const uTime = u('uTime'), uRes = u('uResolution'), uMouse = u('uMouse');
  gl.uniform1f(u('uAmplitude'), OPTIONS.amplitude);
  gl.uniform1f(u('uFrequencyX'), OPTIONS.frequencyX);
  gl.uniform1f(u('uFrequencyY'), OPTIONS.frequencyY);
  gl.uniform3fv(u('uDark'), OPTIONS.colors.dark);
  gl.uniform3fv(u('uWine'), OPTIONS.colors.wine);
  gl.uniform3fv(u('uGold'), OPTIONS.colors.gold);
  gl.uniform3fv(u('uGoldLight'), OPTIONS.colors.goldLight);
  gl.uniform2f(uMouse, 0.5, 0.5);

  function resize() {
    const scale = Math.min(window.devicePixelRatio || 1, 1) * OPTIONS.resolution;
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * scale));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  // Mouse (suavizado para que la onda no salte)
  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  if (OPTIONS.interactive) {
    const hero = canvas.parentElement;
    hero.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      mouse.tx = (e.clientX - r.left) / r.width;
      mouse.ty = 1 - (e.clientY - r.top) / r.height;
    });
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = true, raf = 0, start = performance.now();

  function frame(now) {
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uTime, (now - start) * 0.001 * OPTIONS.speed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = visible && !reduced ? requestAnimationFrame(frame) : 0;
  }

  // Pausar cuando el hero no se ve o la pestaña está oculta (ahorra batería)
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && !document.hidden;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }).observe(canvas);
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  });

  raf = requestAnimationFrame(frame);
})();
