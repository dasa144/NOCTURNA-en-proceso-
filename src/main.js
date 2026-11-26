
import './style.css'
import { io } from 'socket.io-client'

const socket = io()

document.querySelector('#app').innerHTML = `
  <button id="como-jugar" class="boton-reglas-superior">
    Cómo jugar <span>✦</span>
  </button>

  <main class="inicio" id="inicio">
    <p class="subtitulo">EL JUEGO DE LA SOSPECHA</p>
    <h1>NOCTURNA</h1>
    <p class="frase">Esta noche, cualquiera puede ser el asesino.</p>
    <div class="acciones">
      <button id="crear-sala">Crear partida</button>
      <button id="unirse-sala">Unirse a una partida</button>
    </div>
    <p id="mensaje" aria-live="polite"></p>
  </main>

  <section class="reglas" id="reglas" hidden>
    <p class="subtitulo">CONOCE TU DESTINO</p>
    <h2>Cómo jugar</h2>
    <p class="reglas-intro">
      Todos esconden algo. Descubre quién miente antes
      de que la noche se cobre otra víctima.
    </p>
    <h3 class="titulo-seccion">LOS ROLES</h3>
    <div class="roles-grid">
      <article class="tarjeta-rol rol-mafia">
        <div class="logo-rol">♠</div>
        <h3>MAFIA</h3>
        <p>Actúa durante la noche y elimina a un jugador sin revelar su identidad.</p>
        <span class="etiqueta-rol">EL ASESINO</span>
      </article>
      <article class="tarjeta-rol rol-doctor">
        <div class="logo-rol">✚</div>
        <h3>DOCTOR</h3>
        <p>Protege a una persona durante la noche. También puede protegerse a sí mismo.</p>
        <span class="etiqueta-rol">EL PROTECTOR</span>
      </article>
      <article class="tarjeta-rol rol-detective">
        <div class="logo-rol">⌕</div>
        <h3>DETECTIVE</h3>
        <p>Investiga a una persona por ronda y recibe el resultado de forma privada.</p>
        <span class="etiqueta-rol">EL INVESTIGADOR</span>
      </article>
      <article class="tarjeta-rol rol-civil">
        <div class="logo-rol">◈</div>
        <h3>CIVIL / INOCENTE</h3>
        <p>Debate, analiza las sospechas y vota para ayudar a descubrir al culpable.</p>
        <span class="etiqueta-rol">LA INVESTIGACIÓN</span>
      </article>
    </div>
    <h3 class="titulo-seccion">EL DESARROLLO DE LA PARTIDA</h3>
    <article class="regla"><span class="numero-regla">I</span><div><h3>La noche</h3><p>La Mafia elige a quién eliminar, el Doctor a quién proteger y el Detective a quién investigar. Todo en secreto y con un minuto de tiempo.</p></div></article>
    <article class="regla"><span class="numero-regla">II</span><div><h3>El amanecer</h3><p>Se anuncia quién ha muerto y se revela su carta. Si el Doctor protegió a la víctima, nadie muere.</p></div></article>
    <article class="regla"><span class="numero-regla">III</span><div><h3>El debate</h3><p>Los vivos hablan, comparten sospechas y tratan de descubrir quién es la Mafia.</p></div></article>
    <article class="regla"><span class="numero-regla">IV</span><div><h3>La votación</h3><p>Cada vivo vota a quién expulsar; los votos se ven. El más votado sale y se revela su carta. Si hay empate, no sale nadie. Después vuelve a caer la noche.</p></div></article>
    <h3 class="titulo-seccion">CÓMO SE GANA</h3>
    <article class="regla"><span class="numero-regla">◈</span><div><h3>El pueblo</h3><p>Gana cuando no queda nadie de la Mafia.</p></div></article>
    <article class="regla"><span class="numero-regla">♠</span><div><h3>La Mafia</h3><p>Gana cuando son tantos como el resto de jugadores vivos.</p></div></article>
    <p class="aviso-reglas">Los muertos y expulsados pueden seguir mirando, pero ya no actúan ni votan.</p>
    <button id="volver-inicio" class="boton-volver">← Volver al menú</button>
  </section>

  <section id="crear-partida" class="reglas" hidden>
    <p class="subtitulo">PREPARA LA NOCHE</p>
    <h2>Crear partida</h2>
    <p class="reglas-intro">Reúne a tus jugadores. La noche está a punto de comenzar.</p>
    <form id="form-crear-partida" class="form-partida">
      <label for="nombre-jugador">Tu nombre de jugador</label>
      <input id="nombre-jugador" name="nombre-jugador" type="text" maxlength="20" placeholder="¿Cómo te llamarán?" autocomplete="nickname" required />
      <label for="nombre-sala">Nombre de la sala</label>
      <input id="nombre-sala" name="nombre-sala" type="text" maxlength="30" placeholder="La última noche..." required />
      <label for="numero-jugadores">Número de jugadores</label>
      <select id="numero-jugadores" name="numero-jugadores">
        ${Array.from({ length: 11 }, (_, i) =>
          `<option value="${i + 5}" ${i + 5 === 8 ? 'selected' : ''}>${i + 5} jugadores</option>`
        ).join('')}
      </select>
      <p class="ayuda-formulario">La partida admite entre 5 y 15 jugadores.</p>
      <button type="submit" class="boton-volver">Crear sala</button>
    </form>
    <button id="cancelar-crear" class="boton-secundario">← Volver al menú</button>
  </section>

  <section id="resumen-partida" class="reglas" hidden>
    <p class="subtitulo">LA NOCHE COMIENZA</p>
    <h2 id="resumen-nombre"></h2>
    <p class="reglas-intro">Comprueba la configuración de tu partida.</p>
    <div class="resumen-partida">
      <p><strong>Anfitrión:</strong> <span id="resumen-anfitrion"></span></p>
      <p><strong>Jugadores máximos:</strong> <span id="resumen-jugadores"></span></p>
      <p class="aviso-reglas">El código real de invitación se generará al crear la sala.</p>
    </div>
    <p id="mensaje-resumen" role="status" aria-live="polite"></p>
    <button id="ir-espera" class="boton-volver">Crear sala e ir a la espera</button>
    <button id="volver-configuracion" class="boton-secundario">← Volver a la configuración</button>
    <button id="volver-menu-resumen" class="boton-secundario">Volver al menú</button>
  </section>

  <section id="unirse-partida" class="reglas" hidden>
    <p class="subtitulo">UNA INVITACIÓN A LA OSCURIDAD</p>
    <h2>Unirse a una partida</h2>
    <p class="reglas-intro">Introduce los datos de la invitación para reunirte con los demás jugadores.</p>
    <form id="form-unirse-partida" class="form-partida">
      <label for="nombre-visitante">Tu nombre de jugador</label>
      <input id="nombre-visitante" name="nombre-visitante" type="text" maxlength="20" placeholder="¿Cómo te llamarán?" autocomplete="nickname" required />
      <label for="codigo-invitacion">Código de invitación</label>
      <input id="codigo-invitacion" name="codigo-invitacion" type="text" maxlength="12" placeholder="Ej. NOC-7K4P" autocomplete="off" autocapitalize="characters" spellcheck="false" required />
      <p class="ayuda-formulario">Pide el código al anfitrión de la partida.</p>
      <p id="mensaje-unirse" role="status" aria-live="polite"></p>
      <button type="submit" class="boton-volver">Unirse a la sala</button>
    </form>
    <button id="cancelar-unirse" class="boton-secundario">← Volver al menú</button>
  </section>

  <section id="sala-espera" class="reglas" hidden>
    <p class="subtitulo">LA NOCHE COMIENZA</p>
    <h2 id="espera-nombre-sala">Sala de espera</h2>
    <p class="reglas-intro">Reúne a tus jugadores antes de que comience la noche.</p>
    <div class="resumen-partida">
      <p><strong>Código de invitación</strong></p>
      <div class="codigo-invitacion">
        <span id="espera-codigo">CONECTANDO...</span>
        <button type="button" id="copiar-codigo" class="boton-secundario">Copiar código</button>
      </div>
      <p id="mensaje-copiar" aria-live="polite"></p>
      <p><strong>Anfitrión:</strong> <span id="espera-anfitrion"></span></p>
      <p><strong>Jugadores:</strong> <span id="espera-conteo">0</span> / <span id="espera-maximo"></span></p>
    </div>
    <h3 class="titulo-seccion">JUGADORES EN LA SALA</h3>
    <div id="lista-espera" class="lista-espera"></div>
    <p id="mensaje-espera" class="aviso-reglas" role="status" aria-live="polite"></p>
    <button id="comenzar-partida" class="boton-volver">Comenzar partida</button>
    <button id="volver-configuracion-espera" class="boton-secundario">← Volver a la configuración</button>
    <button id="salir-espera" class="boton-secundario">Volver al menú</button>
  </section>

  <section id="partida-en-preparacion" class="pantalla-mesa" hidden>
    <header class="mesa-cabecera">
      <p class="subtitulo">EL DESTINO ESTÁ SELLADO</p>
      <h2 id="mesa-nombre-sala"></h2>
      <p id="mesa-estado" class="mesa-estado" aria-live="polite">Barajando las cartas…</p>
    </header>
    <div class="mesa-contenedor">
      <div id="mesa" class="mesa" aria-label="Mesa de juego"></div>
    </div>
    <div id="mi-rol" class="mi-rol" hidden>
      <button type="button" id="mi-rol-ver" class="mi-rol-carta" aria-label="Ver tu carta en grande">
        <img id="mi-rol-imagen" alt="" draggable="false" />
      </button>
      <div class="mi-rol-info">
        <p class="subtitulo">TU CARTA</p>
        <h3 id="mi-rol-nombre"></h3>
        <p id="mi-rol-texto"></p>
        <p id="mi-rol-companeros" class="mi-rol-companeros" hidden></p>
        <p id="mi-rol-aviso" class="aviso-reglas"></p>
      </div>
    </div>
    <div id="panel-fase" class="panel-fase" hidden>
      <p id="fase-subtitulo" class="subtitulo"></p>
      <h3 id="fase-titulo"></h3>
      <p id="fase-texto"></p>
      <div id="fase-objetivos" class="fase-objetivos"></div>
      <button type="button" id="fase-confirmar" class="boton-volver" hidden>Confirmar</button>
      <p id="fase-resultado" class="fase-resultado" role="status" aria-live="polite" hidden></p>
      <p id="fase-reloj" class="fase-reloj" aria-live="off"></p>
      <button type="button" id="fase-saltar" class="boton-secundario" hidden>Pasar ya a la votación</button>
      <p id="fase-notas" class="fase-notas" hidden></p>
      <div id="fase-final" class="fase-final" hidden>
        <button type="button" id="volver-sala" class="boton-volver">Volver a la sala</button>
      </div>
    </div>
    <button id="salir-partida" class="boton-secundario">Salir de la partida</button>
    <div id="carta-grande" class="carta-grande" hidden>
      <img id="carta-grande-imagen" alt="" draggable="false" />
      <p>Toca en cualquier sitio para cerrar</p>
    </div>
  </section>
`

const $ = selector => document.querySelector(selector)

const mensaje = $('#mensaje')
const inicio = $('#inicio')
const reglas = $('#reglas')
const crearPartida = $('#crear-partida')
const resumenPartida = $('#resumen-partida')
const unirsePartida = $('#unirse-partida')
const salaEspera = $('#sala-espera')
const partidaPreparada = $('#partida-en-preparacion')
const botonReglas = $('#como-jugar')
const formulario = $('#form-crear-partida')
const formularioUnirse = $('#form-unirse-partida')
const mensajeUnirse = $('#mensaje-unirse')

let ultimaConfiguracion = null
let codigoSala = ''
let estadoSala = null
let nombreJugador = ''
let soyAnfitrion = false
let creandoSala = false
let uniendoseSala = false

function mostrarPantalla(pantalla) {
  const pantallas = [
    inicio, reglas, crearPartida, resumenPartida,
    unirsePartida, salaEspera, partidaPreparada
  ]

  pantallas.forEach(elemento => {
    elemento.hidden = elemento !== pantalla
  })

  botonReglas.hidden = pantalla !== inicio
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function escaparHTML(texto) {
  const elemento = document.createElement('span')
  elemento.textContent = String(texto ?? '')
  return elemento.innerHTML
}

function limpiarSalaLocal() {
  codigoSala = ''
  estadoSala = null
  nombreJugador = ''
  soyAnfitrion = false
  ultimaConfiguracion = null
  creandoSala = false
  uniendoseSala = false
}

function salirDeSala() {
  if (codigoSala) socket.emit('salir-sala')
  borrarSesion()
  limpiarSalaLocal()
}

// Se guarda la sala y tu clave para volver a tu sitio si se corta la
// conexión (p. ej. si se bloquea el móvil) o si recargas la página.
const CLAVE_SESION = 'nocturna-sesion'

function guardarSesion(codigo, clave) {
  if (!clave) return
  try {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ codigo, clave }))
  } catch {}
}

function leerSesion() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SESION)) || null
  } catch {
    return null
  }
}

function borrarSesion() {
  try {
    localStorage.removeItem(CLAVE_SESION)
  } catch {}
}

function mostrarSala() {
  if (!estadoSala) return

  $('#espera-nombre-sala').textContent = estadoSala.nombre
  $('#espera-codigo').textContent = estadoSala.codigo
  $('#espera-anfitrion').textContent = estadoSala.anfitrion
  $('#espera-maximo').textContent = estadoSala.maximoJugadores
  $('#espera-conteo').textContent = estadoSala.jugadores.length

  soyAnfitrion = estadoSala.jugadores.some(
    jugador => jugador.nombre === nombreJugador && jugador.anfitrion
  )

  $('#lista-espera').innerHTML = estadoSala.jugadores.map(jugador => `
    <article class="regla">
      <span class="numero-regla">${jugador.anfitrion ? '♛' : '◈'}</span>
      <div>
        <h3>${escaparHTML(jugador.nombre)}</h3>
        <p>${jugador.anfitrion ? 'Anfitrión' : 'Jugador' }${jugador.nombre === nombreJugador ? ' · Tú' : ''}</p>
      </div>
    </article>
  `).join('')

  const botonComenzar = $('#comenzar-partida')
  botonComenzar.disabled = !soyAnfitrion || !estadoSala.puedeEmpezar || estadoSala.iniciada

  if (!soyAnfitrion) {
    $('#mensaje-espera').textContent = 'Esperando a que el anfitrión inicie la partida.'
  } else if (!estadoSala.puedeEmpezar) {
    $('#mensaje-espera').textContent =
      `Necesitáis al menos ${estadoSala.minimoJugadores} jugadores para comenzar.`
  } else {
    $('#mensaje-espera').textContent = 'Todos preparados. Puedes comenzar la partida.'
  }
}

function mostrarErrorSala(texto) {
  $('#mensaje-resumen').textContent = texto
  $('#mensaje-espera').textContent = texto
  mensajeUnirse.textContent = texto
}

socket.on('connect', () => {
  mensaje.textContent = ''
  const sesion = leerSesion()
  if (!sesion) return

  socket.emit('volver-partida', sesion, respuesta => {
    if (respuesta?.ok) {
      codigoSala = sesion.codigo
      nombreJugador = respuesta.nombre
      if (respuesta.enEspera) {
        // Si la partida acabó mientras no estabas, vuelves a la sala.
        const seAcabo = Boolean(partida)
        if (seAcabo) cerrarMesa()
        mostrarPantalla(salaEspera)
        if (estadoSala) mostrarSala()
        if (seAcabo) $('#mensaje-espera').textContent = 'La partida terminó mientras estabas desconectado.'
      }
      return
    }

    // Ya no hay sitio al que volver.
    borrarSesion()
    const estabaDentro = Boolean(partida) || !salaEspera.hidden
    if (!estabaDentro) return
    cerrarMesa()
    limpiarSalaLocal()
    mostrarPantalla(inicio)
    mensaje.textContent = 'Se perdió la conexión y ya no puedes volver a esa sala.'
  })
})

socket.on('disconnect', () => {
  const aviso = 'Se ha cortado la conexión. Reconectando…'
  if (partida) $('#mesa-estado').textContent = aviso
  else if (!salaEspera.hidden) $('#mensaje-espera').textContent = aviso
})

socket.on('connect_error', () => {
  mensaje.textContent = 'No se puede conectar con el servidor. Comprueba que está iniciado.'
})

socket.on('estado-sala', sala => {
  if (codigoSala && sala.codigo !== codigoSala) return
  if (!codigoSala && !creandoSala && !uniendoseSala) return

  estadoSala = sala
  codigoSala = sala.codigo
  $('#mensaje-copiar').textContent = ''
  mostrarSala()
})

// ── La mesa: reparto de cartas ─────────────────────────────

const ROLES = {
  mafia: {
    nombre: 'Mafia',
    articulo: 'la Mafia',
    texto: 'Actúa durante la noche y elimina a un jugador sin revelar tu identidad.'
  },
  doctor: {
    nombre: 'Doctor',
    articulo: 'el Doctor',
    texto: 'Protege a una persona durante la noche. También puedes protegerte a ti mismo.'
  },
  detective: {
    nombre: 'Detective',
    articulo: 'el Detective',
    texto: 'Investiga a una persona por ronda y recibe el resultado en privado.'
  },
  civil: {
    nombre: 'Civil',
    articulo: 'Civil',
    texto: 'Debate, analiza las sospechas y vota para descubrir al culpable.'
  }
}

const REVERSO = '/cartas/reverso.webp'

let partida = null
let temporizadoresMesa = []

// El reparto se anima siempre, aunque el sistema tenga las animaciones
// reducidas: es parte del juego, no un adorno.
function esperar(ms) {
  return new Promise(resolve => {
    temporizadoresMesa.push(setTimeout(resolve, ms))
  })
}

function cancelarAnimacionesMesa() {
  temporizadoresMesa.forEach(clearTimeout)
  temporizadoresMesa = []
}

// Posición de cada asiento alrededor de la mesa ovalada.
// Tu asiento siempre queda abajo, en el centro: es tu punto de vista.
function geometriaMesa() {
  const mesa = $('#mesa')
  const ancho = mesa.clientWidth
  const alto = mesa.clientHeight
  const total = partida.jugadores.length
  // Óvalo por el que se reparten los asientos (algo dentro del borde).
  const radioX = (ancho / 2) * 0.76
  const radioY = (alto / 2) * 0.7

  // Recorremos el óvalo en pasos pequeños, empezando abajo, para poder
  // repartir los asientos a la misma distancia unos de otros.
  const pasos = 720
  const puntos = []
  let perimetro = 0
  for (let i = 0; i <= pasos; i++) {
    const angulo = Math.PI / 2 + (i * 2 * Math.PI) / pasos
    const punto = { x: Math.cos(angulo) * radioX, y: Math.sin(angulo) * radioY }
    if (i > 0) {
      const anterior = puntos[i - 1]
      perimetro += Math.hypot(punto.x - anterior.x, punto.y - anterior.y)
    }
    puntos.push({ ...punto, recorrido: perimetro })
  }

  // Tamaño de carta según el hueco que hay entre asientos.
  const anchoCarta = Math.max(30, Math.min(ancho * 0.15, (perimetro / total) * 0.62, 130))

  const asientos = partida.jugadores.map((nombre, indice) => {
    const relativo = (indice - partida.tuIndice + total) % total
    const objetivo = (relativo * perimetro) / total
    const punto = puntos.find(p => p.recorrido >= objetivo) || puntos[0]
    const soyYo = relativo === 0
    const esCompanero = partida.companerosMafia.includes(indice)
    return {
      indice,
      nombre,
      soyYo,
      // Rol que este jugador puede ver en ese asiento (null = boca abajo).
      rolVisible: soyYo ? partida.tuRol : (esCompanero ? 'mafia' : null),
      x: punto.x,
      y: punto.y
    }
  })

  return { anchoCarta, asientos }
}

function colocarCarta(carta, x, y, giro, escala = 1) {
  carta.style.transform =
    `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${giro}deg) scale(${escala})`
}

function crearCarta(asiento) {
  const rol = asiento.rolVisible
  const carta = document.createElement('div')
  carta.className = 'carta'
  const descripcion = asiento.soyYo
    ? `Tu carta: ${rol && ROLES[rol].nombre}`
    : `Carta de ${escaparHTML(asiento.nombre)}: ${rol && ROLES[rol].nombre}`
  carta.innerHTML = `
    <div class="carta-interior">
      <img class="carta-cara carta-reverso" src="${REVERSO}" alt="" draggable="false" />
      ${rol
        ? `<img class="carta-cara carta-frente" src="/cartas/${rol}.webp" alt="${descripcion}" draggable="false" />`
        : ''}
    </div>
  `
  return carta
}

function dibujarMesa() {
  const mesa = $('#mesa')
  const { anchoCarta, asientos } = geometriaMesa()
  mesa.style.setProperty('--ancho-carta', `${anchoCarta}px`)

  mesa.innerHTML = '<div class="tapete"></div>'

  partida.asientos = asientos.map(asiento => {
    const etiqueta = document.createElement('div')
    etiqueta.className = 'asiento' + (asiento.soyYo ? ' asiento-propio' : '')
    etiqueta.innerHTML = `<span>${escaparHTML(asiento.nombre)}${asiento.soyYo ? ' · Tú' : ''}</span>`
    colocarEtiqueta(etiqueta, asiento, anchoCarta)
    mesa.appendChild(etiqueta)
    return { ...asiento, etiqueta }
  })

  // Montón desordenado en el centro. La primera carta del montón
  // es la que se reparte primero (la de arriba).
  partida.cartas = partida.asientos.map((asiento, i) => {
    const carta = crearCarta(asiento)
    carta.style.zIndex = String(100 - i)
    const elemento = { carta, asiento, giroFinal: (Math.random() - 0.5) * 8 }
    desordenarEnMonton(elemento, anchoCarta)
    mesa.appendChild(carta)
    return elemento
  })
}

// Coloca una carta en un sitio al azar del montón del centro.
function desordenarEnMonton({ carta }, anchoCarta) {
  colocarCarta(
    carta,
    (Math.random() - 0.5) * anchoCarta * 1.5,
    (Math.random() - 0.5) * anchoCarta * 1.2,
    (Math.random() - 0.5) * 170
  )
}

function unirNombres(nombres) {
  if (nombres.length <= 1) return nombres.join('')
  return `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`
}

// Tu carta se ve más grande que las demás.
const ESCALA_PROPIA = 1.5

function moverCartaAsiento({ carta, asiento, giroFinal }) {
  colocarCarta(carta, asiento.x, asiento.y, giroFinal, asiento.soyYo ? ESCALA_PROPIA : 1)
}

// El nombre va justo por debajo de la carta (la tuya es más alta).
function colocarEtiqueta(etiqueta, asiento, anchoCarta) {
  const escala = asiento.soyYo ? ESCALA_PROPIA : 1
  const mitadAlto = (anchoCarta * 4 / 3 / 2) * escala
  etiqueta.style.transform =
    `translate(-50%, 0) translate(${asiento.x}px, ${asiento.y + mitadAlto - 6}px)`
}

function abrirCartaGrande() {
  if (!partida?.repartido) return
  $('#carta-grande-imagen').src = `/cartas/${partida.tuRol}.webp`
  $('#carta-grande-imagen').alt = `Tu carta: ${ROLES[partida.tuRol].nombre}`
  $('#carta-grande').hidden = false
}

$('#carta-grande').addEventListener('click', () => {
  $('#carta-grande').hidden = true
})

document.addEventListener('keydown', evento => {
  if (evento.key === 'Escape') $('#carta-grande').hidden = true
})

$('#mi-rol-ver').addEventListener('click', abrirCartaGrande)

async function repartirCartas() {
  const id = partida.id
  $('#mesa-estado').textContent = 'Barajando las cartas…'
  await esperar(900)

  // Se remueve el montón un par de veces, como si alguien barajara.
  const anchoCarta = $('#mesa').querySelector('.carta')?.offsetWidth || 60
  for (let vuelta = 0; vuelta < 3; vuelta++) {
    if (!partida || partida.id !== id) return
    partida.cartas.forEach(elemento => desordenarEnMonton(elemento, anchoCarta))
    await esperar(650)
  }
  await esperar(500)

  $('#mesa-estado').textContent = 'Repartiendo…'

  for (const elemento of partida.cartas) {
    if (!partida || partida.id !== id) return
    elemento.carta.classList.add('en-movimiento')
    elemento.carta.style.zIndex = '200'
    moverCartaAsiento(elemento)
    await esperar(520)
    elemento.carta.style.zIndex = elemento.asiento.soyYo ? '150' : '50'
    elemento.asiento.etiqueta.classList.add('visible')
  }

  await esperar(700)
  if (!partida || partida.id !== id) return

  // Primero se gira la tuya y, si eres Mafia, después las de tus compañeros.
  const mia = partida.cartas.find(c => c.asiento.soyYo)
  mia.carta.classList.add('boca-arriba', 'carta-propia')
  mia.carta.title = 'Toca para verla en grande'
  mia.carta.addEventListener('click', abrirCartaGrande)

  const companeros = partida.cartas.filter(c => !c.asiento.soyYo && c.asiento.rolVisible)
  if (companeros.length) {
    await esperar(900)
    if (!partida || partida.id !== id) return
    companeros.forEach(c => {
      c.carta.classList.add('boca-arriba', 'carta-aliada')
      c.asiento.etiqueta.classList.add('asiento-aliado')
    })
  }
  partida.repartido = true

  await esperar(700)
  if (!partida || partida.id !== id) return

  mostrarMiRol()

  // Unos segundos para leer tu carta y, después, cae la noche.
  await esperar(4000)
  if (!partida || partida.id !== id) return
  partida.listo = true
  socket.emit('reparto-visto')
  if (partida.nochePendiente) empezarNoche(partida.nochePendiente)
}

// El recuadro con tu carta y lo que hace tu rol.
function mostrarMiRol() {
  const rol = ROLES[partida.tuRol]
  $('#mesa-estado').textContent = `Eres ${rol.articulo}.`
  $('#mi-rol-nombre').textContent = rol.nombre
  $('#mi-rol-texto').textContent = rol.texto
  $('#mi-rol-imagen').src = `/cartas/${partida.tuRol}.webp`
  $('#mi-rol-imagen').alt = `Tu carta: ${rol.nombre}`

  const nombresCompaneros = partida.companerosMafia.map(indice => partida.jugadores[indice])
  $('#mi-rol-companeros').hidden = partida.tuRol !== 'mafia'
  $('#mi-rol-companeros').textContent = nombresCompaneros.length
    ? `Tus compañeros de la Mafia: ${unirNombres(nombresCompaneros)}. Solo vosotros os conocéis.`
    : 'Eres la única Mafia de la mesa. Nadie más conoce tu secreto.'
  $('#mi-rol-aviso').textContent = nombresCompaneros.length
    ? 'Solo tu equipo puede ver tu carta. Que nadie os descubra.'
    : 'Solo tú puedes ver tu carta. Que nadie te descubra.'
  $('#mi-rol').hidden = false
}

// ── Noche, día y votación ──────────────────────────────────
// Las tres fases usan el mismo panel debajo de la mesa: un título,
// un texto, una lista de nombres para elegir y una cuenta atrás.

const ACCION_NOCHE = {
  mafia: {
    titulo: 'Elegid a vuestra víctima',
    texto: 'Elige a quién eliminar esta noche. Si no os ponéis de acuerdo, morirá el más votado.',
    boton: 'Eliminar a'
  },
  doctor: {
    titulo: '¿A quién proteges?',
    texto: 'Si la Mafia ataca a esa persona esta noche, la salvarás. Puedes protegerte a ti mismo.',
    boton: 'Proteger a'
  },
  detective: {
    titulo: '¿A quién investigas?',
    texto: 'Descubrirás en secreto si esa persona es de la Mafia.',
    boton: 'Investigar a'
  }
}

let relojFase = null

function pararReloj() {
  clearInterval(relojFase)
  relojFase = null
  $('#fase-reloj').textContent = ''
}

function ponerReloj(duracion, texto) {
  pararReloj()
  const fin = Date.now() + duracion
  const pintar = () => {
    const segundos = Math.max(0, Math.ceil((fin - Date.now()) / 1000))
    $('#fase-reloj').textContent = `${texto} ${segundos} s`
    if (segundos === 0) pararReloj()
  }
  pintar()
  relojFase = setInterval(pintar, 250)
}

function asientoDe(indice) {
  return partida.asientos.find(a => a.indice === indice)
}

function nombreDe(indice) {
  const nombre = partida.jugadores[indice]
  return indice === partida.tuIndice ? `${nombre} (tú)` : nombre
}

const sigoVivo = () => partida.vivos?.[partida.tuIndice] !== false

// Resalta en la mesa el asiento elegido.
function marcarAsiento(indice, clase) {
  partida.asientos.forEach(a => a.etiqueta.classList.remove(clase))
  if (indice !== null && indice !== undefined) asientoDe(indice)?.etiqueta.classList.add(clase)
}

// Votos que lleva cada asiento, encima de su nombre.
function pintarVotosMesa(votos) {
  const cuenta = {}
  Object.values(votos || {}).forEach(objetivo => {
    if (objetivo !== -1) cuenta[objetivo] = (cuenta[objetivo] || 0) + 1
  })
  partida.asientos.forEach(asiento => {
    const n = cuenta[asiento.indice]
    if (n) asiento.etiqueta.dataset.votos = n === 1 ? '1 voto' : `${n} votos`
    else delete asiento.etiqueta.dataset.votos
  })
}

function textoTitulo(titulo, texto) {
  $('#fase-titulo').textContent = titulo
  $('#fase-texto').textContent = texto
}

function limpiarPanel() {
  partida.eleccion = null
  marcarAsiento(null, 'asiento-elegido')
  $('#fase-objetivos').innerHTML = ''
  $('#fase-confirmar').hidden = true
  $('#fase-saltar').hidden = true
  $('#fase-final').hidden = true
  $('#fase-resultado').hidden = true
  $('#fase-resultado').textContent = ''
  $('#fase-resultado').classList.remove('es-mafia')
}

function mostrarResultado(texto, esMafia = false) {
  const resultado = $('#fase-resultado')
  resultado.textContent = texto
  resultado.classList.toggle('es-mafia', esMafia)
  resultado.hidden = false
}

// El Detective lleva apuntado lo que ha ido descubriendo.
function pintarNotas() {
  const notas = $('#fase-notas')
  const lista = partida.investigaciones || []
  notas.hidden = partida.tuRol !== 'detective' || !lista.length
  notas.innerHTML = lista.length
    ? `<strong>Tus investigaciones:</strong> ${lista.map(({ indice, esMafia }) =>
      `${escaparHTML(partida.jugadores[indice])} — <span class="${esMafia ? 'nota-mafia' : ''}">${esMafia ? 'Mafia' : 'no es Mafia'}</span>`
    ).join(' · ')}`
    : ''
}

function mostrarPanel() {
  pintarNotas()
  $('#panel-fase').hidden = false
  $('#panel-fase').scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

function pintarObjetivos() {
  const eleccion = partida.eleccion
  if (!eleccion) return

  const nombresQue = indice => Object.entries(eleccion.anotaciones || {})
    .filter(([, objetivo]) => objetivo === indice)
    .map(([quien]) => partida.jugadores[quien])

  const boton = (indice, etiqueta) => {
    const marcado = eleccion.seleccion === indice
    const quienes = nombresQue(indice)
    const icono = eleccion.tipo === 'noche' ? '☠' : '✋'
    return `
      <button type="button" class="objetivo${marcado ? ' marcado' : ''}${indice === -1 ? ' objetivo-nadie' : ''}"
        data-indice="${indice}" ${eleccion.confirmado ? 'disabled' : ''} aria-pressed="${marcado}">
        <span>${escaparHTML(etiqueta)}</span>
        ${quienes.length ? `<small>${icono} ${escaparHTML(unirNombres(quienes))}</small>` : ''}
      </button>`
  }

  $('#fase-objetivos').innerHTML =
    eleccion.objetivos.map(indice => boton(indice, nombreDe(indice))).join('') +
    (eleccion.tipo === 'votacion' ? boton(-1, 'No votar a nadie') : '')

  const confirmar = $('#fase-confirmar')
  confirmar.hidden = eleccion.confirmado || eleccion.seleccion === null
  if (eleccion.seleccion === -1) {
    confirmar.textContent = 'No votar a nadie'
  } else if (eleccion.seleccion !== null) {
    const verbo = eleccion.tipo === 'noche' ? ACCION_NOCHE[partida.tuRol].boton : 'Votar a'
    confirmar.textContent = `${verbo} ${partida.jugadores[eleccion.seleccion]}`
  }
}

$('#fase-objetivos').addEventListener('click', evento => {
  const boton = evento.target.closest('.objetivo')
  const eleccion = partida?.eleccion
  if (!boton || !eleccion || eleccion.confirmado) return

  eleccion.seleccion = Number(boton.dataset.indice)
  marcarAsiento(eleccion.seleccion === -1 ? null : eleccion.seleccion, 'asiento-elegido')
  pintarObjetivos()
})

$('#fase-confirmar').addEventListener('click', () => {
  const eleccion = partida?.eleccion
  if (!eleccion || eleccion.confirmado || eleccion.seleccion === null) return

  const confirmar = $('#fase-confirmar')
  confirmar.disabled = true
  const evento = eleccion.tipo === 'noche' ? 'accion-noche' : 'votar'

  socket.emit(evento, { objetivo: eleccion.seleccion }, respuesta => {
    confirmar.disabled = false
    if (partida?.eleccion !== eleccion) return

    if (!respuesta?.ok) {
      mostrarResultado(respuesta?.error || 'No se ha podido enviar tu elección.')
      return
    }

    eleccion.confirmado = true
    const nombre = partida.jugadores[eleccion.seleccion]

    if (eleccion.tipo === 'votacion') {
      mostrarResultado(eleccion.seleccion === -1
        ? 'No has votado a nadie. Espera al recuento.'
        : `Has votado a ${nombre}. Espera al recuento.`)
    } else if (partida.tuRol === 'detective') {
      partida.investigaciones.push({ indice: eleccion.seleccion, esMafia: respuesta.esMafia })
      mostrarResultado(respuesta.esMafia
        ? `${nombre} ES de la Mafia. Guárdalo bien… o úsalo con cuidado.`
        : `${nombre} no es de la Mafia.`, respuesta.esMafia)
      pintarNotas()
    } else if (partida.tuRol === 'doctor') {
      mostrarResultado(`Esta noche proteges a ${nombre}. Espera a que amanezca.`)
    } else {
      mostrarResultado(partida.companerosMafia.length
        ? `Has señalado a ${nombre}. Espera a tus compañeros.`
        : `Has señalado a ${nombre}. Espera a que amanezca.`)
    }
    pintarObjetivos()
  })
})

function aplicarVivos(vivos) {
  if (!Array.isArray(vivos)) return
  partida.vivos = vivos
  vivos.forEach((vivo, indice) => {
    if (!vivo) asientoDe(indice)?.etiqueta.classList.add('asiento-muerto')
  })
}

// ── La noche ──

function empezarNoche(datos) {
  partida.nochePendiente = null
  aplicarVivos(datos.vivos)
  limpiarPanel()
  pintarVotosMesa(null)

  const accion = ACCION_NOCHE[partida.tuRol]
  const objetivos = Array.isArray(datos.objetivos) ? datos.objetivos : []

  partidaPreparada.classList.add('es-noche')
  $('#mi-rol').hidden = true
  $('#mesa-estado').textContent = `Noche ${datos.ronda}. La ciudad duerme…`
  $('#fase-subtitulo').textContent = `NOCHE ${datos.ronda}`

  if (!sigoVivo()) {
    textoTitulo('Observas desde las sombras', 'Ya no puedes actuar, pero puedes seguir mirando la partida.')
  } else if (accion && objetivos.length) {
    textoTitulo(accion.titulo, accion.texto)
    partida.eleccion = { tipo: 'noche', objetivos, seleccion: null, confirmado: false, anotaciones: {} }
    pintarObjetivos()
  } else {
    textoTitulo('Cierra los ojos', 'Mientras duermes, otros actúan en secreto. Espera a que amanezca.')
  }

  ponerReloj(datos.duracion, '☾ La noche termina en')
  mostrarPanel()
}

socket.on('fase-noche', datos => {
  if (!partida) return
  // Si la noche llega antes de que acabe tu reparto, se guarda para luego.
  if (!partida.listo) {
    partida.nochePendiente = datos
    return
  }
  empezarNoche(datos)
})

socket.on('elecciones-mafia', elecciones => {
  if (partida?.eleccion?.tipo !== 'noche' || partida.tuRol !== 'mafia') return
  partida.eleccion.anotaciones = elecciones || {}
  pintarObjetivos()
})

// Pone boca arriba la carta de alguien (muerto, expulsado o al final).
function revelarCarta(indice, rol, clase = 'carta-muerta') {
  const elemento = partida.cartas.find(c => c.asiento.indice === indice)
  if (!elemento || !ROLES[rol]) return

  const interior = elemento.carta.querySelector('.carta-interior')
  if (!interior.querySelector('.carta-frente')) {
    interior.insertAdjacentHTML('beforeend',
      `<img class="carta-cara carta-frente" src="/cartas/${rol}.webp" alt="Carta de ${escaparHTML(partida.jugadores[indice])}: ${ROLES[rol].nombre}" draggable="false" />`)
  }
  elemento.carta.classList.add('boca-arriba')
  if (clase) elemento.carta.classList.add(clase)
}

socket.on('amanecer', datos => {
  if (!partida) return
  pararReloj()
  limpiarPanel()
  partidaPreparada.classList.remove('es-noche')
  $('#fase-subtitulo').textContent = `DÍA ${datos.ronda}`

  if (datos.muerto === null || datos.muerto === undefined) {
    $('#mesa-estado').textContent = 'Amanece. Todos siguen con vida.'
    textoTitulo('Nadie ha muerto esta noche', 'La ciudad despierta entera… por ahora.')
  } else {
    const nombre = partida.jugadores[datos.muerto]
    const rol = ROLES[datos.rolMuerto]
    revelarCarta(datos.muerto, datos.rolMuerto)
    $('#mesa-estado').textContent = `Amanece. ${nombre} no ha despertado.`
    if (datos.muerto === partida.tuIndice) {
      textoTitulo('La Mafia te ha eliminado',
        `Eras ${rol?.articulo}. Ya no puedes actuar ni votar, pero puedes seguir mirando la partida.`)
    } else {
      textoTitulo(`La Mafia ha asesinado a ${nombre}`, `Su carta se ha revelado: era ${rol?.articulo}.`)
    }
  }
  aplicarVivos(datos.vivos)
  mostrarPanel()
})

// ── El día: debate ──

socket.on('fase-debate', datos => {
  if (!partida) return
  aplicarVivos(datos.vivos)
  limpiarPanel()

  $('#mesa-estado').textContent = `Día ${datos.ronda}. Hora de hablar.`
  $('#fase-subtitulo').textContent = `DÍA ${datos.ronda} · DEBATE`
  textoTitulo('Debatid',
    sigoVivo()
      ? 'Hablad entre vosotros: ¿quién creéis que es de la Mafia? Después votaréis a quién expulsar.'
      : 'Los vivos están debatiendo. Tú ya no puedes hablar de lo que sabes.')

  $('#fase-saltar').hidden = datos.anfitrion !== partida.tuIndice
  ponerReloj(datos.duracion, '☀ La votación empieza en')
  mostrarPanel()
})

$('#fase-saltar').addEventListener('click', () => {
  $('#fase-saltar').hidden = true
  socket.emit('saltar-debate')
})

// ── El día: votación ──

socket.on('fase-votacion', datos => {
  if (!partida) return
  aplicarVivos(datos.vivos)
  limpiarPanel()
  pintarVotosMesa(null)

  const objetivos = Array.isArray(datos.objetivos) ? datos.objetivos : []
  $('#mesa-estado').textContent = `Día ${datos.ronda}. Votación.`
  $('#fase-subtitulo').textContent = `DÍA ${datos.ronda} · VOTACIÓN`

  if (sigoVivo() && objetivos.length) {
    textoTitulo('¿A quién expulsáis?',
      'El más votado sale de la partida. Si hay empate, no se expulsa a nadie. Los votos se ven.')
    partida.eleccion = { tipo: 'votacion', objetivos, seleccion: null, confirmado: false, anotaciones: {} }
    pintarObjetivos()
  } else {
    textoTitulo('Los vivos votan', 'Mira cómo van los votos en la mesa.')
  }

  ponerReloj(datos.duracion, '⚖ La votación termina en')
  mostrarPanel()
})

socket.on('votos', votos => {
  if (!partida) return
  pintarVotosMesa(votos)
  if (partida.eleccion?.tipo === 'votacion') {
    partida.eleccion.anotaciones = votos || {}
    pintarObjetivos()
  }
})

socket.on('veredicto', datos => {
  if (!partida) return
  pararReloj()
  limpiarPanel()
  pintarVotosMesa(datos.votos)
  $('#fase-subtitulo').textContent = `DÍA ${datos.ronda} · VEREDICTO`

  if (datos.expulsado === null) {
    $('#mesa-estado').textContent = 'Nadie sale de la partida.'
    textoTitulo(datos.empate ? 'Empate' : 'Nadie ha sido expulsado',
      datos.empate
        ? 'Los votos han quedado empatados, así que nadie sale. Cae la noche…'
        : 'No ha habido votos suficientes. Cae la noche…')
  } else {
    const nombre = partida.jugadores[datos.expulsado]
    const rol = ROLES[datos.rolExpulsado]
    revelarCarta(datos.expulsado, datos.rolExpulsado)
    $('#mesa-estado').textContent = `${nombre} sale de la partida.`
    textoTitulo(
      datos.expulsado === partida.tuIndice ? 'Te han expulsado' : `Habéis expulsado a ${nombre}`,
      `Su carta se ha revelado: era ${rol?.articulo}.`
    )
    const cayoMafia = datos.rolExpulsado === 'mafia'
    if (partida.tuRol === 'mafia') {
      // Desde el lado de la Mafia, la noticia se lee al revés.
      mostrarResultado(cayoMafia
        ? 'Han descubierto a alguien de la Mafia.'
        : 'Han expulsado a un inocente. Seguís ocultos.', cayoMafia)
    } else {
      mostrarResultado(cayoMafia
        ? '¡Habéis atrapado a un miembro de la Mafia!'
        : 'Era inocente… La Mafia sigue entre vosotros.', !cayoMafia)
    }
  }

  aplicarVivos(datos.vivos)
  // Los votos se quitan de la mesa al caer la noche.
  mostrarPanel()
})

// ── Fin de la partida ──

socket.on('fin-partida', datos => {
  if (!partida) return
  pararReloj()
  limpiarPanel()
  pintarVotosMesa(null)
  aplicarVivos(datos.vivos)
  partidaPreparada.classList.remove('es-noche')

  // Se descubren todas las cartas.
  datos.roles.forEach((rol, indice) => {
    if (indice !== partida.tuIndice) revelarCarta(indice, rol, datos.vivos[indice] ? null : 'carta-muerta')
  })

  const ganaMafia = datos.ganador === 'mafia'
  const soyMafia = partida.tuRol === 'mafia'
  const heGanado = ganaMafia === soyMafia

  $('#mesa-estado').textContent = ganaMafia ? 'La Mafia se ha hecho con la ciudad.' : 'La ciudad está a salvo.'
  $('#fase-subtitulo').textContent = 'FIN DE LA PARTIDA'
  textoTitulo(
    ganaMafia ? 'Gana la Mafia' : 'Gana el pueblo',
    ganaMafia
      ? 'Ya son tantos como el resto: nadie puede pararlos.'
      : 'Toda la Mafia ha sido descubierta.'
  )
  mostrarResultado(heGanado ? '¡Has ganado!' : 'Has perdido.', !heGanado)
  $('#panel-fase').classList.toggle('gana-mafia', ganaMafia)
  $('#fase-final').hidden = false
  mostrarPanel()
})

$('#volver-sala').addEventListener('click', () => {
  cerrarMesa()
  mostrarPantalla(salaEspera)
  mostrarSala()
})

socket.on('jugador-abandona', ({ indice }) => {
  if (!partida?.asientos) return
  asientoDe(indice)?.etiqueta.classList.add('asiento-ausente')
  asientoDe(indice)?.etiqueta.classList.remove('asiento-desconectado')

  const eleccion = partida.eleccion
  if (!eleccion) return

  const posicion = eleccion.objetivos.indexOf(indice)
  if (posicion === -1) return

  eleccion.objetivos.splice(posicion, 1)
  if (eleccion.seleccion === indice) {
    eleccion.seleccion = null
    marcarAsiento(null, 'asiento-elegido')
  }
  if (!eleccion.confirmado) pintarObjetivos()
})

// Si cambia el tamaño de la ventana, recoloca todo sin animación.
function recolocarMesa() {
  if (!partida || partidaPreparada.hidden) return

  const { anchoCarta, asientos } = geometriaMesa()
  const mesa = $('#mesa')
  mesa.style.setProperty('--ancho-carta', `${anchoCarta}px`)

  partida.cartas.forEach((elemento, i) => {
    const asiento = partida.asientos[i]
    Object.assign(asiento, { x: asientos[i].x, y: asientos[i].y })
    colocarEtiqueta(asiento.etiqueta, asiento, anchoCarta)

    if (elemento.carta.classList.contains('en-movimiento')) {
      elemento.carta.classList.add('sin-transicion')
      moverCartaAsiento(elemento)
      void elemento.carta.offsetWidth
      elemento.carta.classList.remove('sin-transicion')
    }
  })
}

window.addEventListener('resize', recolocarMesa)

// Deja la mesa limpia (al salir, al volver a la sala o al empezar otra).
function cerrarMesa() {
  cancelarAnimacionesMesa()
  pararReloj()
  partida = null
  $('#mesa').innerHTML = ''
  $('#mi-rol').hidden = true
  $('#carta-grande').hidden = true
  $('#panel-fase').hidden = true
  $('#panel-fase').classList.remove('gana-mafia')
  partidaPreparada.classList.remove('es-noche')
}

socket.on('partida-iniciada', datos => {
  cerrarMesa()
  $('#mensaje').textContent = ''

  partida = {
    id: Date.now(),
    jugadores: datos.jugadores,
    tuIndice: datos.tuIndice,
    tuRol: datos.tuRol,
    companerosMafia: Array.isArray(datos.companerosMafia) ? datos.companerosMafia : [],
    investigaciones: [],
    repartido: false
  }

  $('#mesa-nombre-sala').textContent = datos.nombreSala
  mostrarPantalla(partidaPreparada)

  // Esperar a que la pantalla tenga tamaño antes de calcular la mesa.
  requestAnimationFrame(() => {
    dibujarMesa()
    repartirCartas()
  })
})

// ── Volver a una partida empezada ──────────────────────────
// Al reconectar, el servidor manda todo lo necesario para dejar la mesa
// como estaba: cartas en su sitio (sin animación) y la fase actual.

// Repite lo que hace cada fase al empezar, con los datos recibidos.
const lanzar = (evento, datos) => socket.listeners(evento).forEach(f => f(datos))

socket.on('partida-retomada', datos => {
  const mismaPartida = partida && partida.tuIndice === datos.tuIndice &&
    partida.jugadores.join() === datos.jugadores.join() && partida.repartido

  if (!mismaPartida) {
    cerrarMesa()
    partida = {
      id: Date.now(),
      jugadores: datos.jugadores,
      tuIndice: datos.tuIndice,
      tuRol: datos.tuRol,
      companerosMafia: datos.companerosMafia || [],
      investigaciones: datos.investigaciones || [],
      repartido: true,
      listo: true
    }
    $('#mesa-nombre-sala').textContent = datos.nombreSala
    mostrarPantalla(partidaPreparada)
    dibujarMesa()

    // Todas las cartas directamente en su asiento.
    partida.cartas.forEach(elemento => {
      elemento.carta.classList.add('en-movimiento', 'sin-transicion')
      moverCartaAsiento(elemento)
      elemento.carta.style.zIndex = elemento.asiento.soyYo ? '150' : '50'
      elemento.asiento.etiqueta.classList.add('visible')
      if (elemento.asiento.soyYo) {
        elemento.carta.classList.add('boca-arriba', 'carta-propia')
        elemento.carta.addEventListener('click', abrirCartaGrande)
      } else if (elemento.asiento.rolVisible) {
        elemento.carta.classList.add('boca-arriba', 'carta-aliada')
        elemento.asiento.etiqueta.classList.add('asiento-aliado')
      }
      void elemento.carta.offsetWidth
      elemento.carta.classList.remove('sin-transicion')
    })
  }

  partida.investigaciones = datos.investigaciones || []
  datos.revelados.forEach((rol, indice) => {
    if (rol) revelarCarta(indice, rol)
  })
  aplicarVivos(datos.vivos)
  partida.asientos.forEach(asiento => {
    asiento.etiqueta.classList.toggle('asiento-ausente', datos.fuera[asiento.indice])
    asiento.etiqueta.classList.toggle('asiento-desconectado',
      datos.desconectados[asiento.indice] && !datos.fuera[asiento.indice])
  })

  if (datos.fase === 'reparto') {
    mostrarMiRol()
    socket.emit('reparto-visto')
  } else if (datos.fase === 'noche') {
    empezarNoche(datos.noche)
    const eleccion = partida.eleccion
    if (eleccion) {
      eleccion.anotaciones = datos.noche.eleccionesMafia || {}
      if (datos.noche.yaElegido !== undefined && datos.noche.yaElegido !== null) {
        eleccion.seleccion = datos.noche.yaElegido
        eleccion.confirmado = true
        marcarAsiento(eleccion.seleccion, 'asiento-elegido')
        mostrarResultado(`Ya has elegido a ${partida.jugadores[eleccion.seleccion]}. Espera a que amanezca.`)
      }
      pintarObjetivos()
    }
  } else if (datos.fase === 'debate') {
    lanzar('fase-debate', datos.debate)
  } else if (datos.fase === 'votacion') {
    lanzar('fase-votacion', datos.votacion)
    lanzar('votos', datos.votacion.votos)
    const eleccion = partida.eleccion
    if (eleccion && datos.votacion.tuVoto !== undefined && datos.votacion.tuVoto !== null) {
      eleccion.seleccion = datos.votacion.tuVoto
      eleccion.confirmado = true
      mostrarResultado('Ya has votado. Espera al recuento.')
      pintarObjetivos()
    }
  } else {
    // Amanecer o veredicto: en unos segundos empieza la siguiente fase.
    limpiarPanel()
    $('#mesa-estado').textContent = 'Has vuelto a la partida.'
    $('#fase-subtitulo').textContent = `DÍA ${datos.ronda}`
    textoTitulo('Has vuelto a la partida', 'En unos segundos empieza la siguiente fase.')
    mostrarPanel()
  }
})

socket.on('jugador-desconectado', ({ indice }) => {
  if (!partida?.asientos) return
  asientoDe(indice)?.etiqueta.classList.add('asiento-desconectado')
})

socket.on('jugador-vuelve', ({ indice }) => {
  if (!partida?.asientos) return
  asientoDe(indice)?.etiqueta.classList.remove('asiento-desconectado')
})

botonReglas.addEventListener('click', () => mostrarPantalla(reglas))

$('#volver-inicio').addEventListener('click', () => {
  mensaje.textContent = ''
  mostrarPantalla(inicio)
})

$('#crear-sala').addEventListener('click', () => {
  mensaje.textContent = ''
  formulario.reset()
  mostrarPantalla(crearPartida)
  $('#nombre-jugador').focus()
})

$('#cancelar-crear').addEventListener('click', () => mostrarPantalla(inicio))

$('#unirse-sala').addEventListener('click', () => {
  mensajeUnirse.textContent = ''
  formularioUnirse.reset()
  mostrarPantalla(unirsePartida)
  $('#nombre-visitante').focus()
})

$('#cancelar-unirse').addEventListener('click', () => {
  mensajeUnirse.textContent = ''
  mostrarPantalla(inicio)
})

formulario.addEventListener('submit', evento => {
  evento.preventDefault()

  const datos = new FormData(formulario)
  const anfitrion = String(datos.get('nombre-jugador') || '').trim()
  const nombre = String(datos.get('nombre-sala') || '').trim()
  const jugadores = Number(datos.get('numero-jugadores'))

  if (!anfitrion || !nombre) return

  ultimaConfiguracion = { anfitrion, nombre, jugadores }

  $('#resumen-nombre').textContent = nombre
  $('#resumen-anfitrion').textContent = anfitrion
  $('#resumen-jugadores').textContent = jugadores
  $('#mensaje-resumen').textContent = ''

  mostrarPantalla(resumenPartida)
})

$('#ir-espera').addEventListener('click', () => {
  if (!ultimaConfiguracion || creandoSala) return

  if (!socket.connected) {
    $('#mensaje-resumen').textContent = 'Conectando con el servidor. Inténtalo de nuevo en unos segundos.'
    return
  }

  creandoSala = true
  $('#ir-espera').disabled = true
  $('#mensaje-resumen').textContent = 'Creando sala...'

  nombreJugador = ultimaConfiguracion.anfitrion

  socket.emit('crear-sala', {
    anfitrion: ultimaConfiguracion.anfitrion,
    nombreSala: ultimaConfiguracion.nombre,
    maximoJugadores: ultimaConfiguracion.jugadores
  }, respuesta => {
    creandoSala = false
    $('#ir-espera').disabled = false

    if (!respuesta?.ok) {
      $('#mensaje-resumen').textContent =
        respuesta?.error || 'No se pudo crear la sala.'
      return
    }

    codigoSala = respuesta.codigo
    guardarSesion(respuesta.codigo, respuesta.clave)
    soyAnfitrion = true
    $('#mensaje-copiar').textContent = ''
    mostrarPantalla(salaEspera)

    if (estadoSala) mostrarSala()
  })
})

$('#volver-configuracion').addEventListener('click', () => {
  if (ultimaConfiguracion) {
    $('#nombre-jugador').value = ultimaConfiguracion.anfitrion
    $('#nombre-sala').value = ultimaConfiguracion.nombre
    $('#numero-jugadores').value = String(ultimaConfiguracion.jugadores)
  }

  mostrarPantalla(crearPartida)
})

$('#volver-menu-resumen').addEventListener('click', () => {
  mostrarPantalla(inicio)
})

formularioUnirse.addEventListener('submit', evento => {
  evento.preventDefault()

  const nombre = $('#nombre-visitante').value.trim()
  const campoCodigo = $('#codigo-invitacion')
  const codigo = campoCodigo.value.trim().toUpperCase()

  if (!nombre) {
    mensajeUnirse.textContent = 'Introduce tu nombre de jugador.'
    return
  }

  if (!/^NOC-[A-Z0-9]{4}$/.test(codigo)) {
    mensajeUnirse.textContent = 'El código debe tener el formato NOC-XXXX.'
    campoCodigo.focus()
    return
  }

  if (!socket.connected) {
    mensajeUnirse.textContent = 'No hay conexión con el servidor. Inténtalo de nuevo.'
    return
  }

  if (uniendoseSala) return

  uniendoseSala = true
  nombreJugador = nombre
  mensajeUnirse.textContent = 'Buscando sala...'

  socket.emit('unirse-sala', { nombre, codigo }, respuesta => {
    uniendoseSala = false

    if (!respuesta?.ok) {
      nombreJugador = ''
      mensajeUnirse.textContent =
        respuesta?.error || 'No se pudo entrar en la sala.'
      return
    }

    codigoSala = respuesta.codigo || codigo
    guardarSesion(codigoSala, respuesta.clave)
    estadoSala = null
    mostrarPantalla(salaEspera)
    $('#mensaje-espera').textContent = 'Conectado. Actualizando jugadores...'
  })
})

$('#copiar-codigo').addEventListener('click', async () => {
  const mensajeCopiar = $('#mensaje-copiar')

  if (!codigoSala) {
    mensajeCopiar.textContent = 'Todavía no hay un código disponible.'
    return
  }

  try {
    await navigator.clipboard.writeText(codigoSala)
    mensajeCopiar.textContent = 'Código copiado.'
  } catch {
    mensajeCopiar.textContent =
      'No se pudo copiar automáticamente. Selecciona el código y cópialo manualmente.'
  }
})

$('#comenzar-partida').addEventListener('click', () => {
  if (!estadoSala || !soyAnfitrion || !estadoSala.puedeEmpezar) return

  $('#comenzar-partida').disabled = true
  $('#mensaje-espera').textContent = 'Iniciando partida...'

  socket.emit('iniciar-partida', respuesta => {
    if (!respuesta?.ok) {
      $('#mensaje-espera').textContent =
        respuesta?.error || 'No se pudo iniciar la partida.'
      mostrarSala()
    }
  })
})

$('#volver-configuracion-espera').addEventListener('click', () => {
  if (!soyAnfitrion) {
    $('#mensaje-espera').textContent = 'Solo el anfitrión puede volver a la configuración.'
    return
  }

  salirDeSala()
  mostrarPantalla(crearPartida)
})

$('#salir-espera').addEventListener('click', () => {
  salirDeSala()
  mostrarPantalla(inicio)
})

$('#salir-partida').addEventListener('click', () => {
  cerrarMesa()
  salirDeSala()
  mostrarPantalla(inicio)
})

