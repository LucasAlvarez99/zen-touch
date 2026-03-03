// ─── CONFIGURATION ───────────────────────────────────
const WHATSAPP_NUMBER = "5491125925851"; // ← CAMBIAR POR TU NÚMERO
const PRECIO_KM = 3000;

// ← CAMBIAR POR LA DIRECCIÓN DE TU CONSULTORIO
const DIRECCION_CONSULTORIO = "lisandro de la torre 4649, CABA, Argentina";

const SERVICIOS = {
  "Masaje Relajante Sueco": 20000,
  "Masaje Descontracturante": 24000,
  "Drenaje Linfático": 30000,
  "Masaje Deportivo": 36000,
  "Shiatsu": 42000,
  "Masaje con Piedras Calientes": 50000,
  "Masaje Tailandés Completo": 58000,
};

// ─── PALABRAS CENSURADAS ──────────────────────────────
const PALABRAS_BLOQUEADAS = [
  "sexual","sexo","erótico","erótica","erotico","erotica","tantrico","tántrico",
  "desnudo","desnuda","feliz final","happy ending","sensual","íntimo","intimo",
  "cuerpo a cuerpo","masaje adulto","escorts","prepago","prostitu",
  "toco","tocame","tocarme","placer","orgasmo","vagina","pene","tetas","culo",
  "paja","mamada","chupar","coger","follar","sexting","nudes","fotos",
  "videollamada","cam","masajista sexy","masajista linda","señorita","chica",
];

function censurar(texto) {
  const t = texto.toLowerCase();
  return PALABRAS_BLOQUEADAS.some(p => t.includes(p));
}

// ─── CURSOR PERSONALIZADO ────────────────────────────
const cursor = document.getElementById('cursor');
const cursorRing = document.getElementById('cursorRing');
let mx = 0, my = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  cursor.style.left = mx + 'px';
  cursor.style.top  = my + 'px';
});

function animateCursorRing() {
  rx += (mx - rx) * 0.12;
  ry += (my - ry) * 0.12;
  cursorRing.style.left = rx + 'px';
  cursorRing.style.top  = ry + 'px';
  requestAnimationFrame(animateCursorRing);
}
animateCursorRing();

// ─── DISTANCIA (Nominatim + Haversine) ───────────────
let kmCalculado = 0;

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function geocodificar(dir) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(dir)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'es', 'User-Agent': 'ZenTouchMasajes/1.0' } });
  const data = await res.json();
  if (!data.length) throw new Error('Dirección no encontrada');
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

function onAddressInput() {
  const val = document.getElementById('clienteDir').value.trim();
  document.getElementById('btnCalcular').disabled = val.length < 6;
  if (!val) {
    kmCalculado = 0;
    document.getElementById('distanciaResult').style.display = 'none';
    calcularPrecio();
  }
}

async function calcularDistancia() {
  const dirCliente = document.getElementById('clienteDir').value.trim();
  if (!dirCliente) return;

  const btn = document.getElementById('btnCalcular');
  const btnText = document.getElementById('calcBtnText');
  const spinner = document.getElementById('calcSpinner');
  const result = document.getElementById('distanciaResult');

  btn.disabled = true;
  btnText.textContent = '...';
  spinner.style.display = 'inline-block';
  result.style.display = 'none';
  kmCalculado = 0;
  calcularPrecio();

  try {
    const dirCompleta = dirCliente.toLowerCase().includes('argentina')
      ? dirCliente : dirCliente + ', Argentina';

    const [origen, destino] = await Promise.all([
      geocodificar(DIRECCION_CONSULTORIO),
      geocodificar(dirCompleta)
    ]);

    // Línea recta × 1.3 para estimar recorrido urbano real
    const lineal = haversineKm(origen.lat, origen.lon, destino.lat, destino.lon);
    kmCalculado = Math.round(lineal * 1.3);
    if (kmCalculado < 1) kmCalculado = 1;

    const costo = kmCalculado * PRECIO_KM;
    result.className = 'distancia-result ok';
    result.innerHTML = `
      <span class="distancia-km">📍 ${kmCalculado} km estimados</span>
      Adicional por traslado: <strong>$${costo.toLocaleString('es-AR')}</strong>
      <br><small style="opacity:.6">Distancia aproximada consultorio → tu dirección</small>
    `;
    result.style.display = 'block';
    calcularPrecio();

  } catch {
    result.className = 'distancia-result error';
    result.innerHTML = `⚠️ No encontramos esa dirección. Intentá con calle y número, ciudad.`;
    result.style.display = 'block';
    kmCalculado = 0;
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Calcular';
    spinner.style.display = 'none';
  }
}

// ─── TOGGLE DOMICILIO ─────────────────────────────────
function toggleKm() {
  const esDomicilio = document.getElementById('domicilio').checked;
  document.getElementById('kmField').classList.toggle('visible', esDomicilio);
  if (!esDomicilio) {
    document.getElementById('clienteDir').value = '';
    document.getElementById('distanciaResult').style.display = 'none';
    document.getElementById('btnCalcular').disabled = true;
    kmCalculado = 0;
  }
  calcularPrecio();
}

// ─── CALCULAR PRECIO ─────────────────────────────────
function calcularPrecio() {
  const masaje = document.getElementById('masaje').value;
  const preview = document.getElementById('pricePreview');
  const amount  = document.getElementById('priceAmount');
  const label   = document.getElementById('priceLabel');

  if (!masaje) { preview.classList.remove('visible'); return; }

  const precio = SERVICIOS[masaje] || 0;
  const extra  = (document.getElementById('domicilio').checked && kmCalculado > 0)
    ? kmCalculado * PRECIO_KM : 0;
  const total  = precio + extra;

  amount.textContent = '$' + total.toLocaleString('es-AR');
  label.textContent  = extra > 0
    ? `Masaje $${precio.toLocaleString('es-AR')} + traslado (${kmCalculado} km) $${extra.toLocaleString('es-AR')}:`
    : 'Total estimado:';
  preview.classList.add('visible');
}

// ─── ENVIAR WHATSAPP ──────────────────────────────────
function enviarWhatsapp() {
  const nombre     = document.getElementById('nombre').value.trim();
  const masaje     = document.getElementById('masaje').value;
  const modalidad  = document.getElementById('domicilio').checked ? 'Domicilio' : 'Consultorio';
  const dirCliente = document.getElementById('clienteDir').value.trim();
  const comentarios= document.getElementById('comentarios').value.trim();

  if (!nombre) { alert('Por favor ingresá tu nombre.'); return; }
  if (!masaje)  { alert('Por favor seleccioná un tipo de masaje.'); return; }
  if (modalidad === 'Domicilio' && !dirCliente) { alert('Por favor ingresá tu dirección.'); return; }
  if (modalidad === 'Domicilio' && kmCalculado === 0) { alert('Por favor calculá la distancia antes de enviar.'); return; }

  if (censurar(nombre) || censurar(comentarios) || censurar(dirCliente)) {
    alert('⚠️ Tu mensaje contiene términos incompatibles con nuestro servicio terapéutico. Solo atendemos consultas terapéuticas y de bienestar.');
    return;
  }

  const precio = SERVICIOS[masaje] || 0;
  const extra  = modalidad === 'Domicilio' && kmCalculado > 0 ? kmCalculado * PRECIO_KM : 0;
  const total  = precio + extra;

  let msg = `¡Hola! Quisiera reservar una sesión.\n\n`;
  msg += `👤 *Nombre:* ${nombre}\n`;
  msg += `💆 *Masaje:* ${masaje}\n`;
  msg += `📍 *Modalidad:* ${modalidad}`;
  if (modalidad === 'Domicilio') {
    msg += `\n🏠 *Dirección:* ${dirCliente}`;
    msg += `\n📏 *Distancia:* ${kmCalculado} km estimados`;
  }
  msg += `\n💰 *Total:* $${total.toLocaleString('es-AR')}`;
  if (extra > 0) msg += ` (inc. $${extra.toLocaleString('es-AR')} traslado)`;
  if (comentarios) msg += `\n\n📋 *Información adicional:*\n${comentarios}`;
  msg += `\n\n¿Qué días y horarios tenés disponibles?`;

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ─── RESEÑAS ─────────────────────────────────────────
let selectedStars = 0;

function setStars(val) {
  selectedStars = val;
  document.querySelectorAll('.star-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i < val);
  });
}

function actualizarContador() {
  const total = document.getElementById('reviewsContainer').querySelectorAll('.review-card').length;
  document.getElementById('reviewCount').textContent = String(total).padStart(2, '0');
}

function publicarResena() {
  const nombre  = document.getElementById('reviewName').value.trim();
  const texto   = document.getElementById('reviewText').value.trim();
  const masaje  = document.getElementById('reviewMasaje').value.trim();
  const errorEl = document.getElementById('reviewError');

  errorEl.style.display = 'none';

  if (!nombre || !texto) {
    errorEl.textContent = 'Completá tu nombre y tu reseña.';
    errorEl.style.display = 'block'; return;
  }
  if (selectedStars === 0) {
    errorEl.textContent = 'Seleccioná una calificación con estrellas.';
    errorEl.style.display = 'block'; return;
  }
  if (censurar(nombre) || censurar(texto)) {
    errorEl.textContent = '⚠️ Tu reseña contiene términos inapropiados.';
    errorEl.style.display = 'block'; return;
  }

  const stars   = '★'.repeat(selectedStars) + '☆'.repeat(5 - selectedStars);
  const mes     = new Date().toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
  const inicial = nombre.charAt(0).toUpperCase();

  const card = document.createElement('div');
  card.className = 'review-card';
  card.style.animation = 'revealUp 0.5s ease both';
  card.innerHTML = `
    <div class="review-top">
      <span class="review-stars-big">${stars}</span>
      <span class="review-date-tag">${mes.charAt(0).toUpperCase() + mes.slice(1)}</span>
    </div>
    <p class="review-body">${texto}</p>
    <div class="review-author-row">
      <div class="review-initial">${inicial}</div>
      <span class="review-author-name">${nombre}${masaje ? ' · ' + masaje : ''}</span>
    </div>
  `;

  document.getElementById('reviewsContainer').appendChild(card);
  actualizarContador();

  document.getElementById('reviewName').value  = '';
  document.getElementById('reviewText').value  = '';
  document.getElementById('reviewMasaje').value = '';
  selectedStars = 0;
  document.querySelectorAll('.star-btn').forEach(b => b.classList.remove('active'));
  errorEl.style.display = 'none';
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ─── SCROLL FADE IN ──────────────────────────────────
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// Init
setStars(0);
