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
  // Sexual explícito
  "sexual","sexo","sex","erótico","erótica","erotico","erotica","xxx","porn","porno",
  "tantrico","tántrico","desnudo","desnuda","desnudate","encuerada","encuerado",
  "feliz final","happy ending","sensual","íntimo","intimo","intimidad",
  "cuerpo a cuerpo","masaje adulto","masaje erotico","masaje erótico",
  "escort","escorts","prepago","prostituta","prostituto","prostitu","puta","puto",
  "servicio completo","servicio especial","servicio privado",

  // Partes del cuerpo
  "vagina","pene","tetas","teta","culo","cola","nalgas","pechos","senos",
  "pezones","clitoris","clítoris","miembro","bulto","paquete",

  // Actos sexuales
  "paja","mamada","chupar","chupame","chupalo","coger","follar",
  "penetrar","penetracion","penetración","acabar","venirse",
  "orgasmo","correrse","eyacular","sexting","nudes","pack",
  "fotos hot","fotos desnuda","fotos desnudo","videollamada hot",
  "cam","webcam","onlyfans","only fans",

  // Frases típicas desubicadas
  "cuanto cobras","cuánto cobrás","precio por hora",
  "haces final feliz","haces feliz final",
  "mandame foto","mandame fotos","manda fotos",
  "estas sola","estás sola","estas disponible",
  "estas buena","estás buena","que rica",
  "que cuerpo","que lindo cuerpo",
  "quiero verte","quiero tocarte","tocame","tocarte","tocar",
  "placer","morbo","fantasia","fantasía",
  "masajista sexy","masajista linda","señorita","chica sexy",
  "bebota","mamacita","bombon","bombón",

  // Abreviaciones comunes
  "q rico","rico bb","bb","baby","bby","hot","caliente"
];

function censurar(texto) {
  let t = texto.toLowerCase();
  return PALABRAS_BLOQUEADAS.some(p => t.includes(p));
}

// ─── GEOCODIFICACIÓN + DISTANCIA ─────────────────────
// Usa OpenStreetMap Nominatim (gratuito, sin API key)
// Distancia en línea recta × 1.3 para estimar recorrido urbano real

let kmCalculado = 0;

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodificar(direccion) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(direccion)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'es', 'User-Agent': 'ZenTouchMasajes/1.0' }
  });
  const data = await res.json();
  if (!data.length) throw new Error('No se encontró la dirección');
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
  btnText.textContent = 'Calculando...';
  spinner.style.display = 'inline-block';
  result.style.display = 'none';
  kmCalculado = 0;
  calcularPrecio();

  try {
    const dirClienteCompleta = dirCliente.toLowerCase().includes('argentina')
      ? dirCliente
      : dirCliente + ', Argentina';

    const [origen, destino] = await Promise.all([
      geocodificar(DIRECCION_CONSULTORIO),
      geocodificar(dirClienteCompleta)
    ]);

    // Distancia en línea recta × 1.3 (factor corrección urbana)
    const distanciaLineal = haversineKm(origen.lat, origen.lon, destino.lat, destino.lon);
    const distanciaEstimada = distanciaLineal * 1.3;

    // Redondeo estándar: .5 sube, .4 baja
    kmCalculado = Math.round(distanciaEstimada);
    if (kmCalculado < 1) kmCalculado = 1;

    const costoTraslado = kmCalculado * PRECIO_KM;

    result.className = 'distancia-result ok';
    result.innerHTML = `
      <span class="distancia-km">📍 ${kmCalculado} km estimados</span>
      Adicional por traslado: <strong>$${costoTraslado.toLocaleString('es-AR')}</strong>
      <br><small style="opacity:0.7">Distancia aproximada desde el consultorio hasta tu dirección</small>
    `;
    result.style.display = 'block';
    calcularPrecio();

  } catch (err) {
    result.className = 'distancia-result error';
    result.innerHTML = `⚠️ No pudimos encontrar esa dirección. Intentá ser más específico (ej: "Av. Rivadavia 3400, CABA").`;
    result.style.display = 'block';
    kmCalculado = 0;
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Calcular distancia';
    spinner.style.display = 'none';
  }
}

// ─── TOGGLE DOMICILIO FIELD ──────────────────────────
function toggleKm() {
  const es_domicilio = document.getElementById('domicilio').checked;
  const kmField = document.getElementById('kmField');
  kmField.classList.toggle('visible', es_domicilio);
  if (!es_domicilio) {
    document.getElementById('clienteDir').value = '';
    document.getElementById('distanciaResult').style.display = 'none';
    document.getElementById('btnCalcular').disabled = true;
    kmCalculado = 0;
  }
  calcularPrecio();
}

// ─── CALCULAR PRECIO ─────────────────────────────────
function calcularPrecio() {
  const select = document.getElementById('masaje');
  const masaje = select.value;
  const preview = document.getElementById('pricePreview');
  const amount = document.getElementById('priceAmount');
  const label = document.getElementById('priceLabel');

  if (!masaje) { preview.classList.remove('visible'); return; }

  let precio = SERVICIOS[masaje] || 0;
  let extra = 0;

  if (document.getElementById('domicilio').checked && kmCalculado > 0) {
    extra = kmCalculado * PRECIO_KM;
  }

  const total = precio + extra;
  amount.textContent = '$' + total.toLocaleString('es-AR');
  label.textContent = extra > 0
    ? `Masaje $${precio.toLocaleString('es-AR')} + traslado (${kmCalculado} km) $${extra.toLocaleString('es-AR')}:`
    : 'Total:';
  preview.classList.add('visible');
}

// ─── ENVIAR WHATSAPP ──────────────────────────────────
function enviarWhatsapp() {
  const nombre = document.getElementById('nombre').value.trim();
  const masaje = document.getElementById('masaje').value;
  const modalidad = document.getElementById('domicilio').checked ? 'Domicilio' : 'Consultorio';
  const dirCliente = document.getElementById('clienteDir').value.trim();
  const comentarios = document.getElementById('comentarios').value.trim();

  if (!nombre) { alert('Por favor ingresá tu nombre.'); return; }
  if (!masaje) { alert('Por favor seleccioná un tipo de masaje.'); return; }
  if (modalidad === 'Domicilio' && !dirCliente) {
    alert('Por favor ingresá tu dirección para el servicio a domicilio.');
    return;
  }
  if (modalidad === 'Domicilio' && kmCalculado === 0) {
    alert('Por favor calculá la distancia antes de enviar.');
    return;
  }

  if (censurar(nombre) || censurar(comentarios) || censurar(dirCliente)) {
    alert('⚠️ Tu mensaje contiene términos que no son compatibles con nuestro servicio terapéutico profesional. Solo atendemos solicitudes terapéuticas y de bienestar.');
    return;
  }

  let precio = SERVICIOS[masaje] || 0;
  let extra = modalidad === 'Domicilio' && kmCalculado > 0 ? kmCalculado * PRECIO_KM : 0;
  const total = precio + extra;

  let msg = `¡Hola! Quisiera reservar una sesión de masaje.\n\n`;
  msg += `👤 *Nombre:* ${nombre}\n`;
  msg += `💆 *Masaje:* ${masaje}\n`;
  msg += `📍 *Modalidad:* ${modalidad}`;
  if (modalidad === 'Domicilio') {
    msg += `\n🏠 *Dirección:* ${dirCliente}`;
    msg += `\n📏 *Distancia estimada:* ${kmCalculado} km`;
  }
  msg += `\n💰 *Total estimado:* $${total.toLocaleString('es-AR')}`;
  if (extra > 0) msg += ` (incluye $${extra.toLocaleString('es-AR')} de traslado)`;
  msg += `\n`;
  if (comentarios) msg += `\n📋 *Información adicional:*\n${comentarios}`;
  msg += `\n\n¿Qué días y horarios tenés disponibles?`;

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

// ─── RESEÑAS ──────────────────────────────────────────
let selectedStars = 0;

function setStars(val) {
  selectedStars = val;
  document.querySelectorAll('.star-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i < val);
  });
}

function publicarReseña() {
  const nombre = document.getElementById('reviewName').value.trim();
  const texto = document.getElementById('reviewText').value.trim();
  const errorEl = document.getElementById('reviewError');

  errorEl.style.display = 'none';

  if (!nombre || !texto) {
    errorEl.textContent = 'Por favor completá tu nombre y tu reseña.';
    errorEl.style.display = 'block';
    return;
  }
  if (selectedStars === 0) {
    errorEl.textContent = 'Por favor seleccioná una calificación con estrellas.';
    errorEl.style.display = 'block';
    return;
  }
  if (censurar(nombre) || censurar(texto)) {
    errorEl.textContent = '⚠️ Tu reseña contiene términos inapropiados. Por favor revisá el contenido.';
    errorEl.style.display = 'block';
    return;
  }

  const stars = '★'.repeat(selectedStars) + '☆'.repeat(5 - selectedStars);
  const mes = new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const inicial = nombre.charAt(0).toUpperCase();

  const card = document.createElement('div');
  card.className = 'review-card';
  card.style.animation = 'fadeUp 0.5s ease both';
  card.innerHTML = `
    <span class="review-quote-mark">"</span>
    <p class="review-text">${texto}</p>
    <div class="review-author">
      <div class="review-avatar">${inicial}</div>
      <div>
        <div class="review-name">${nombre}</div>
        <div class="review-stars">${stars}</div>
        <div class="review-date">${mes.charAt(0).toUpperCase() + mes.slice(1)}</div>
      </div>
    </div>
  `;

  document.getElementById('reviewsContainer').appendChild(card);

  document.getElementById('reviewName').value = '';
  document.getElementById('reviewText').value = '';
  selectedStars = 0;
  document.querySelectorAll('.star-btn').forEach(b => b.classList.remove('active'));

  errorEl.style.display = 'none';
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ─── FADE IN ON SCROLL ────────────────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// Init
setStars(0);