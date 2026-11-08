
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
    <article class="regla"><span class="numero-regla">I</span><div><h3>La noche</h3><p>Los roles con habilidades nocturnas realizan sus acciones secretamente.</p></div></article>
    <article class="regla"><span class="numero-regla">II</span><div><h3>El día</h3><p>Los jugadores debaten, comparten sospechas y tratan de descubrir quién es la Mafia.</p></div></article>
    <article class="regla"><span class="numero-regla">III</span><div><h3>La votación</h3><p>Los jugadores votan para señalar al sospechoso que consideran culpable.</p></div></article>
    <p class="aviso-reglas">Los detalles de las rondas y las condiciones de victoria se concretarán al desarrollar las mecánicas del juego.</p>
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
      <p class="subtitulo">TU CARTA</p>
      <h3 id="mi-rol-nombre"></h3>
      <p id="mi-rol-texto"></p>
      <p id="mi-rol-companeros" class="mi-rol-companeros" hidden></p>
      <p id="mi-rol-aviso" class="aviso-reglas"></p>
    </div>
    <button id="salir-partida" class="boton-secundario">Salir de la partida</button>
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
  limpiarSalaLocal()
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
const reduceMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches

let partida = null
let temporizadoresMesa = []

function esperar(ms) {
  return new Promise(resolve => {
    temporizadoresMesa.push(setTimeout(resolve, reduceMovimiento ? Math.min(ms, 60) : ms))
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
  const anchoCarta = Math.max(28, Math.min(ancho * 0.13, (perimetro / total) * 0.55, 84))

  const asientos = partida.jugadores.map((nombre, indice) => {
    const relativo = (indice - partida.tuIndice + total) % total
    const objetivo = (relativo * perimetro) / total
    const punto = puntos.find(p => p.recorrido >= objetivo) || puntos[0]
    const soyYo = relativo === 0
    const esCompanero = partida.companerosMafia.includes(indice)
    return {
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
    // El nombre va por debajo de la carta.
    etiqueta.style.transform =
      `translate(-50%, 0) translate(${asiento.x}px, ${asiento.y + anchoCarta * 0.72}px)`
    mesa.appendChild(etiqueta)
    return { ...asiento, etiqueta }
  })

  // Montón desordenado en el centro. La primera carta del montón
  // es la que se reparte primero (la de arriba).
  partida.cartas = partida.asientos.map((asiento, i) => {
    const carta = crearCarta(asiento)
    carta.style.zIndex = String(100 - i)
    const desorden = {
      x: (Math.random() - 0.5) * anchoCarta * 1.4,
      y: (Math.random() - 0.5) * anchoCarta * 1.1,
      giro: (Math.random() - 0.5) * 160
    }
    colocarCarta(carta, desorden.x, desorden.y, desorden.giro)
    mesa.appendChild(carta)
    return { carta, asiento, giroFinal: (Math.random() - 0.5) * 8 }
  })
}

function unirNombres(nombres) {
  if (nombres.length <= 1) return nombres.join('')
  return `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`
}

function moverCartaAsiento({ carta, asiento, giroFinal }) {
  colocarCarta(carta, asiento.x, asiento.y, giroFinal, asiento.soyYo ? 1.35 : 1)
}

async function repartirCartas() {
  const id = partida.id
  $('#mesa-estado').textContent = 'Barajando las cartas…'
  await esperar(1100)

  $('#mesa-estado').textContent = 'Repartiendo…'

  for (const elemento of partida.cartas) {
    if (!partida || partida.id !== id) return
    elemento.carta.classList.add('en-movimiento')
    elemento.carta.style.zIndex = '200'
    moverCartaAsiento(elemento)
    await esperar(320)
    elemento.carta.style.zIndex = elemento.asiento.soyYo ? '150' : '50'
    elemento.asiento.etiqueta.classList.add('visible')
  }

  await esperar(700)
  if (!partida || partida.id !== id) return

  // Primero se gira la tuya y, si eres Mafia, después las de tus compañeros.
  const mia = partida.cartas.find(c => c.asiento.soyYo)
  mia.carta.classList.add('boca-arriba')

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

  const rol = ROLES[partida.tuRol]
  $('#mesa-estado').textContent = `Eres ${rol.articulo}.`
  $('#mi-rol-nombre').textContent = rol.nombre
  $('#mi-rol-texto').textContent = rol.texto

  const nombresCompaneros = companeros.map(c => c.asiento.nombre)
  $('#mi-rol-companeros').hidden = partida.tuRol !== 'mafia'
  $('#mi-rol-companeros').textContent = nombresCompaneros.length
    ? `Tus compañeros de la Mafia: ${unirNombres(nombresCompaneros)}. Solo vosotros os conocéis.`
    : 'Eres la única Mafia de la mesa. Nadie más conoce tu secreto.'
  $('#mi-rol-aviso').textContent = nombresCompaneros.length
    ? 'Solo tu equipo puede ver tu carta. Que nadie os descubra.'
    : 'Solo tú puedes ver tu carta. Que nadie te descubra.'
  $('#mi-rol').hidden = false
}

// Si cambia el tamaño de la ventana, recoloca todo sin animación.
function recolocarMesa() {
  if (!partida || partidaPreparada.hidden) return

  const { anchoCarta, asientos } = geometriaMesa()
  const mesa = $('#mesa')
  mesa.style.setProperty('--ancho-carta', `${anchoCarta}px`)

  partida.cartas.forEach((elemento, i) => {
    const asiento = partida.asientos[i]
    Object.assign(asiento, { x: asientos[i].x, y: asientos[i].y })
    asiento.etiqueta.style.transform =
      `translate(-50%, 0) translate(${asiento.x}px, ${asiento.y + anchoCarta * 0.72}px)`

    if (elemento.carta.classList.contains('en-movimiento')) {
      elemento.carta.classList.add('sin-transicion')
      moverCartaAsiento(elemento)
      void elemento.carta.offsetWidth
      elemento.carta.classList.remove('sin-transicion')
    }
  })
}

window.addEventListener('resize', recolocarMesa)

socket.on('partida-iniciada', datos => {
  cancelarAnimacionesMesa()
  $('#mensaje').textContent = ''

  partida = {
    id: Date.now(),
    jugadores: datos.jugadores,
    tuIndice: datos.tuIndice,
    tuRol: datos.tuRol,
    companerosMafia: Array.isArray(datos.companerosMafia) ? datos.companerosMafia : [],
    repartido: false
  }

  $('#mesa-nombre-sala').textContent = datos.nombreSala
  $('#mi-rol').hidden = true
  mostrarPantalla(partidaPreparada)

  // Esperar a que la pantalla tenga tamaño antes de calcular la mesa.
  requestAnimationFrame(() => {
    dibujarMesa()
    repartirCartas()
  })
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
  cancelarAnimacionesMesa()
  partida = null
  $('#mesa').innerHTML = ''
  salirDeSala()
  mostrarPantalla(inicio)
})

