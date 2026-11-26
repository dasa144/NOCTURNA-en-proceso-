
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = Number(process.env.PORT) || 3000;
const MIN_JUGADORES = 5;
const salas = new Map();

// ── Tiempos ────────────────────────────────────────────────
// NOCTURNA_TIEMPO acorta todos los tiempos para hacer pruebas (p. ej. 0.1).
const ESCALA_TIEMPO = Number(process.env.NOCTURNA_TIEMPO) || 1;
const DURACION_NOCHE = 60_000 * ESCALA_TIEMPO;
const PAUSA_NOTICIA = 6_000 * ESCALA_TIEMPO;
const DURACION_DEBATE = 90_000 * ESCALA_TIEMPO;
const DURACION_VOTACION = 45_000 * ESCALA_TIEMPO;
// Tiempo máximo que se espera a que todos terminen de ver el reparto.
const ESPERA_REPARTO = 30_000;
// Si alguien pierde la conexión con la partida empezada (p. ej. se le
// bloquea el móvil), tiene este tiempo para volver a su sitio.
const TIEMPO_RECONEXION = 90_000;

// ── Utilidades ─────────────────────────────────────────────

function generarCodigo() {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo;

  do {
    codigo = 'NOC-';

    for (let i = 0; i < 4; i++) {
      codigo += caracteres[Math.floor(Math.random() * caracteres.length)];
    }
  } while (salas.has(codigo));

  return codigo;
}

function estadoSala(sala) {
  return {
    codigo: sala.codigo,
    nombre: sala.nombre,
    anfitrion: sala.jugadores.find(j => j.id === sala.anfitrionId)?.nombre || '',
    jugadores: sala.jugadores.map(j => ({
      nombre: j.nombre,
      anfitrion: j.id === sala.anfitrionId
    })),
    maximoJugadores: sala.maximoJugadores,
    minimoJugadores: MIN_JUGADORES,
    puedeEmpezar: sala.jugadores.length >= MIN_JUGADORES,
    iniciada: sala.iniciada
  };
}

function numeroMafias(totalJugadores) {
  if (totalJugadores >= 11) return 3;
  if (totalJugadores >= 7) return 2;
  return 1;
}

function barajar(lista) {
  const copia = [...lista];

  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }

  return copia;
}

function repartirRoles(jugadores) {
  const mafias = numeroMafias(jugadores.length);
  const mazo = [
    ...Array(mafias).fill('mafia'),
    'doctor',
    'detective'
  ];

  while (mazo.length < jugadores.length) mazo.push('civil');

  barajar(mazo).forEach((rol, i) => {
    jugadores[i].rol = rol;
  });
}

function actualizarSala(sala) {
  io.to(sala.codigo).emit('estado-sala', estadoSala(sala));
}

function nuevoJugador(socket, nombre) {
  // La clave permite volver a tu sitio si se corta la conexión.
  return { id: socket.id, clave: randomUUID(), nombre };
}

// Sigue en la partida: vivo y sin haberla abandonado. Quien ha perdido
// la conexión sigue contando mientras tenga tiempo para volver.
const enJuego = jugador => jugador.vivo && !jugador.fuera;
const vivos = sala => sala.jugadores.map(j => j.vivo);
const indiceAnfitrion = sala => sala.jugadores.findIndex(j => j.id === sala.anfitrionId);

// Pone el reloj de la fase actual.
function programar(sala, ms, accion) {
  clearTimeout(sala.temporizador);
  sala.terminaEn = Date.now() + ms;
  sala.temporizador = setTimeout(accion, ms);
}

function emitirA(sala, crearDatos, evento) {
  sala.jugadores.forEach((jugador, indice) => {
    if (jugador.conectado) io.to(jugador.id).emit(evento, crearDatos(jugador, indice));
  });
}

function borrarSala(sala) {
  clearTimeout(sala.temporizador);
  sala.jugadores.forEach(j => clearTimeout(j.gracia));
  salas.delete(sala.codigo);
}

// ── Inicio de la partida ───────────────────────────────────

function datosInicio(sala, jugador, indice) {
  return {
    nombreSala: sala.nombre,
    jugadores: sala.jugadores.map(j => j.nombre),
    tuIndice: indice,
    tuRol: jugador.rol,
    // Los de la Mafia se conocen entre ellos.
    companerosMafia: jugador.rol === 'mafia'
      ? sala.jugadores
        .map((otro, i) => (otro.rol === 'mafia' && i !== indice ? i : -1))
        .filter(i => i !== -1)
      : []
  };
}

function comprobarFinReparto(sala) {
  const faltan = sala.jugadores.some(j => j.conectado && !sala.vistoReparto.has(j.clave));
  if (!faltan) empezarNoche(sala);
}

// ── La noche ───────────────────────────────────────────────
// Cada rol con habilidad elige en secreto. La noche termina cuando
// todos han elegido o cuando se acaba el tiempo.

function actoresNoche(sala) {
  return sala.jugadores.filter(
    j => enJuego(j) && ['mafia', 'doctor', 'detective'].includes(j.rol)
  );
}

// A quién puede señalar cada rol (índices de la mesa).
function objetivosNoche(sala, jugador) {
  if (!actoresNoche(sala).includes(jugador)) return [];

  return sala.jugadores
    .map((otro, indice) => ({ otro, indice }))
    .filter(({ otro }) => enJuego(otro))
    .filter(({ otro }) => {
      if (jugador.rol === 'mafia') return otro.rol !== 'mafia';
      if (jugador.rol === 'detective') return otro !== jugador;
      return true; // El Doctor puede protegerse a sí mismo.
    })
    .map(({ indice }) => indice);
}

function eleccionesMafia(sala) {
  const elecciones = {};

  sala.jugadores.forEach((jugador, indice) => {
    if (jugador.rol !== 'mafia') return;
    const eleccion = sala.noche.elecciones.get(jugador.clave);
    if (eleccion !== undefined) elecciones[indice] = eleccion;
  });

  return elecciones;
}

function enviarEleccionesMafia(sala) {
  const elecciones = eleccionesMafia(sala);
  sala.jugadores
    .filter(j => j.rol === 'mafia' && j.conectado)
    .forEach(j => io.to(j.id).emit('elecciones-mafia', elecciones));
}

function datosNoche(sala, jugador) {
  return {
    ronda: sala.ronda,
    duracion: Math.max(0, sala.terminaEn - Date.now()),
    objetivos: objetivosNoche(sala, jugador),
    vivos: vivos(sala)
  };
}

function empezarNoche(sala) {
  if (sala.fase !== 'reparto' && sala.fase !== 'veredicto') return;

  sala.fase = 'noche';
  sala.ronda = (sala.ronda || 0) + 1;
  sala.noche = { elecciones: new Map() };
  programar(sala, DURACION_NOCHE, () => terminarNoche(sala));

  emitirA(sala, jugador => datosNoche(sala, jugador), 'fase-noche');
}

function comprobarFinNoche(sala) {
  const faltan = actoresNoche(sala).some(j => !sala.noche.elecciones.has(j.clave));
  if (!faltan) terminarNoche(sala);
}

// La víctima es la más votada por la Mafia. Si empatan, decide el azar.
function victimaMafia(sala) {
  const votos = new Map();

  sala.jugadores.forEach(jugador => {
    if (jugador.rol !== 'mafia' || !enJuego(jugador)) return;
    const eleccion = sala.noche.elecciones.get(jugador.clave);
    if (eleccion !== undefined) votos.set(eleccion, (votos.get(eleccion) || 0) + 1);
  });

  if (votos.size === 0) return null;

  const maximo = Math.max(...votos.values());
  const empatados = [...votos].filter(([, n]) => n === maximo).map(([indice]) => indice);
  return empatados[Math.floor(Math.random() * empatados.length)];
}

function terminarNoche(sala) {
  if (sala.fase !== 'noche') return;

  const victima = victimaMafia(sala);
  const doctor = sala.jugadores.find(j => j.rol === 'doctor' && enJuego(j));
  const protegido = doctor ? sala.noche.elecciones.get(doctor.clave) : undefined;
  const muere = victima !== null && victima !== protegido && sala.jugadores[victima]?.vivo;

  if (muere) sala.jugadores[victima].vivo = false;

  sala.fase = 'amanecer';
  sala.noche = null;

  io.to(sala.codigo).emit('amanecer', {
    ronda: sala.ronda,
    muerto: muere ? victima : null,
    rolMuerto: muere ? sala.jugadores[victima].rol : null,
    vivos: vivos(sala)
  });

  // Unos segundos para leer la noticia antes de seguir.
  programar(sala, PAUSA_NOTICIA, () => comprobarVictoria(sala) || empezarDebate(sala));
}

// ── El día: debate y votación ──────────────────────────────

function datosDebate(sala) {
  return {
    ronda: sala.ronda,
    duracion: Math.max(0, sala.terminaEn - Date.now()),
    anfitrion: indiceAnfitrion(sala),
    vivos: vivos(sala)
  };
}

function empezarDebate(sala) {
  if (sala.fase !== 'amanecer') return;

  sala.fase = 'debate';
  programar(sala, DURACION_DEBATE, () => empezarVotacion(sala));
  io.to(sala.codigo).emit('fase-debate', datosDebate(sala));
}

function datosVotacion(sala, jugador, indice) {
  return {
    ronda: sala.ronda,
    duracion: Math.max(0, sala.terminaEn - Date.now()),
    objetivos: enJuego(jugador)
      ? sala.jugadores
        .map((otro, i) => (enJuego(otro) && i !== indice ? i : -1))
        .filter(i => i !== -1)
      : [],
    vivos: vivos(sala)
  };
}

function empezarVotacion(sala) {
  if (sala.fase !== 'debate') return;

  sala.fase = 'votacion';
  sala.votos = new Map();
  programar(sala, DURACION_VOTACION, () => terminarVotacion(sala));

  emitirA(sala, (jugador, indice) => datosVotacion(sala, jugador, indice), 'fase-votacion');
}

// Los votos son públicos: { índiceVotante: índiceVotado (o -1 si no vota a nadie) }
function votosPublicos(sala) {
  const votos = {};
  sala.jugadores.forEach((jugador, indice) => {
    if (sala.votos.has(jugador.clave)) votos[indice] = sala.votos.get(jugador.clave);
  });
  return votos;
}

function comprobarFinVotacion(sala) {
  const faltan = sala.jugadores.filter(enJuego).some(j => !sala.votos.has(j.clave));
  if (!faltan) terminarVotacion(sala);
}

// Expulsado: el más votado. Si hay empate, no se expulsa a nadie.
function terminarVotacion(sala) {
  if (sala.fase !== 'votacion') return;

  const recuento = new Map();
  sala.jugadores.forEach(jugador => {
    if (!enJuego(jugador)) return;
    const voto = sala.votos.get(jugador.clave);
    if (voto !== undefined && voto !== -1 && enJuego(sala.jugadores[voto])) {
      recuento.set(voto, (recuento.get(voto) || 0) + 1);
    }
  });

  let expulsado = null;
  let empate = false;

  if (recuento.size) {
    const maximo = Math.max(...recuento.values());
    const masVotados = [...recuento].filter(([, n]) => n === maximo);
    if (masVotados.length === 1) expulsado = masVotados[0][0];
    else empate = true;
  }

  if (expulsado !== null) sala.jugadores[expulsado].vivo = false;

  sala.fase = 'veredicto';

  io.to(sala.codigo).emit('veredicto', {
    ronda: sala.ronda,
    votos: votosPublicos(sala),
    expulsado,
    rolExpulsado: expulsado !== null ? sala.jugadores[expulsado].rol : null,
    empate,
    vivos: vivos(sala)
  });

  sala.votos = null;
  programar(sala, PAUSA_NOTICIA, () => comprobarVictoria(sala) || empezarNoche(sala));
}

// ── Fin de la partida ──────────────────────────────────────
// Gana el pueblo si no queda Mafia. Gana la Mafia si ya son tantos
// como el resto (en la votación nadie podría echarlos).

function ganador(sala) {
  const quedan = sala.jugadores.filter(enJuego);
  const mafias = quedan.filter(j => j.rol === 'mafia').length;

  if (mafias === 0) return 'pueblo';
  if (mafias >= quedan.length - mafias) return 'mafia';
  return null;
}

function comprobarVictoria(sala) {
  if (!sala.iniciada) return true;

  const quienGana = ganador(sala);
  if (!quienGana) return false;

  clearTimeout(sala.temporizador);

  io.to(sala.codigo).emit('fin-partida', {
    ganador: quienGana,
    roles: sala.jugadores.map(j => j.rol),
    vivos: vivos(sala)
  });

  // La sala vuelve a la espera con quien siga conectado, lista para otra partida.
  sala.jugadores.forEach(j => clearTimeout(j.gracia));
  sala.jugadores = sala.jugadores
    .filter(j => j.conectado && !j.fuera)
    .map(({ id, clave, nombre }) => ({ id, clave, nombre }));
  sala.iniciada = false;
  sala.fase = null;
  sala.ronda = 0;
  sala.noche = null;
  sala.votos = null;

  if (!sala.jugadores.some(j => j.id === sala.anfitrionId) && sala.jugadores.length) {
    sala.anfitrionId = sala.jugadores[0].id;
  }

  actualizarSala(sala);
  return true;
}

// ── Salir, desconectarse y volver ──────────────────────────

// Alguien deja la partida para siempre (se va o no vuelve a tiempo).
function marcarFuera(sala, jugador) {
  if (!sala.iniciada || !sala.jugadores.includes(jugador) || jugador.fuera) return;

  jugador.fuera = true;
  clearTimeout(jugador.gracia);
  io.to(sala.codigo).emit('jugador-abandona', { indice: sala.jugadores.indexOf(jugador) });

  if (!sala.jugadores.some(j => j.conectado)) return borrarSala(sala);
  revisarFase(sala);
}

// Tras cambiar quién sigue en juego, mira si la fase actual ya puede acabar.
function revisarFase(sala) {
  if (sala.fase === 'reparto') return comprobarFinReparto(sala);
  if (comprobarVictoria(sala)) return;
  if (sala.fase === 'noche') comprobarFinNoche(sala);
  if (sala.fase === 'votacion') comprobarFinVotacion(sala);
}

function abandonarSala(socket, definitivo) {
  const codigo = socket.data.codigoSala;
  if (!codigo) return;

  socket.data.codigoSala = null;
  socket.leave(codigo);
  const sala = salas.get(codigo);

  if (!sala) return;

  const jugador = sala.jugadores.find(j => j.id === socket.id);
  if (!jugador) return;

  // Con la partida empezada no se quita a nadie de la mesa (cambiarían
  // los asientos de todos).
  if (sala.iniciada) {
    jugador.conectado = false;

    if (sala.anfitrionId === socket.id) {
      const otro = sala.jugadores.find(j => j.conectado && !j.fuera);
      if (otro) sala.anfitrionId = otro.id;
    }

    if (definitivo || jugador.fuera) {
      marcarFuera(sala, jugador);
      return;
    }

    io.to(codigo).emit('jugador-desconectado', { indice: sala.jugadores.indexOf(jugador) });
    jugador.gracia = setTimeout(() => marcarFuera(sala, jugador), TIEMPO_RECONEXION);
    if (sala.fase === 'reparto') comprobarFinReparto(sala);
    return;
  }

  sala.jugadores = sala.jugadores.filter(j => j !== jugador);

  if (sala.jugadores.length === 0) {
    salas.delete(codigo);
    return;
  }

  if (sala.anfitrionId === socket.id) {
    sala.anfitrionId = sala.jugadores[0].id;
  }

  actualizarSala(sala);
}

// Todo lo que necesita alguien que vuelve para ver la partida como estaba.
function datosRetomar(sala, jugador, indice) {
  const datos = {
    ...datosInicio(sala, jugador, indice),
    fase: sala.fase,
    ronda: sala.ronda,
    vivos: vivos(sala),
    // Las cartas de los muertos ya están boca arriba para todos.
    revelados: sala.jugadores.map(j => (j.vivo ? null : j.rol)),
    fuera: sala.jugadores.map(j => Boolean(j.fuera)),
    desconectados: sala.jugadores.map(j => !j.conectado),
    investigaciones: jugador.investigaciones || []
  };

  if (sala.fase === 'noche') {
    datos.noche = datosNoche(sala, jugador);
    datos.noche.yaElegido = sala.noche.elecciones.get(jugador.clave);
    if (jugador.rol === 'mafia') datos.noche.eleccionesMafia = eleccionesMafia(sala);
  }
  if (sala.fase === 'debate') datos.debate = datosDebate(sala);
  if (sala.fase === 'votacion') {
    datos.votacion = datosVotacion(sala, jugador, indice);
    datos.votacion.votos = votosPublicos(sala);
    datos.votacion.tuVoto = sala.votos.get(jugador.clave);
  }

  return datos;
}

// ── Conexiones ─────────────────────────────────────────────

const respuesta = callback => (typeof callback === 'function' ? callback : () => {});

function salaDe(socket) {
  return salas.get(socket.data.codigoSala);
}

function jugadorDe(sala, socket) {
  return sala?.jugadores.find(j => j.id === socket.id);
}

io.on('connection', socket => {
  socket.on('crear-sala', (datos, callback) => {
    const responder = respuesta(callback);

    if (socket.data.codigoSala) {
      return responder({ ok: false, error: 'Ya estás en una sala.' });
    }

    const anfitrion = String(datos?.anfitrion || datos?.nombre || '').trim().slice(0, 20);
    const nombre = String(datos?.nombreSala || datos?.nombre || '').trim().slice(0, 30);
    const maximo = Number(datos?.maximoJugadores || datos?.jugadores || 8);

    if (!anfitrion || !nombre) {
      return responder({ ok: false, error: 'Completa tu nombre y el de la sala.' });
    }

    if (!Number.isInteger(maximo) || maximo < MIN_JUGADORES || maximo > 15) {
      return responder({ ok: false, error: 'El máximo debe estar entre 5 y 15 jugadores.' });
    }

    const codigo = generarCodigo();
    const jugador = nuevoJugador(socket, anfitrion);
    const sala = {
      codigo,
      nombre,
      maximoJugadores: maximo,
      anfitrionId: socket.id,
      jugadores: [jugador],
      iniciada: false
    };

    salas.set(codigo, sala);
    socket.join(codigo);
    socket.data.codigoSala = codigo;

    responder({ ok: true, codigo, clave: jugador.clave });
    actualizarSala(sala);
  });

  socket.on('unirse-sala', (datos, callback) => {
    const responder = respuesta(callback);

    if (socket.data.codigoSala) {
      return responder({ ok: false, error: 'Ya estás en una sala.' });
    }

    const nombre = String(datos?.nombre || '').trim().slice(0, 20);
    const codigo = String(datos?.codigo || '').trim().toUpperCase();
    const sala = salas.get(codigo);

    if (!nombre) return responder({ ok: false, error: 'Introduce tu nombre.' });
    if (!sala) return responder({ ok: false, error: 'No existe esa sala.' });
    if (sala.iniciada) return responder({ ok: false, error: 'La partida ya ha comenzado.' });

    if (sala.jugadores.length >= sala.maximoJugadores) {
      return responder({ ok: false, error: 'La sala está llena.' });
    }

    if (sala.jugadores.some(j => j.nombre.toLowerCase() === nombre.toLowerCase())) {
      return responder({ ok: false, error: 'Ese nombre ya está en uso en la sala.' });
    }

    const jugador = nuevoJugador(socket, nombre);
    sala.jugadores.push(jugador);
    socket.join(codigo);
    socket.data.codigoSala = codigo;

    responder({ ok: true, codigo, clave: jugador.clave });
    actualizarSala(sala);
  });

  // Volver a tu sitio tras perder la conexión (o recargar la página).
  socket.on('volver-partida', (datos, callback) => {
    const responder = respuesta(callback);
    const sala = salas.get(String(datos?.codigo || ''));
    const jugador = sala?.jugadores.find(j => j.clave === datos?.clave);

    if (!sala || !jugador || jugador.fuera || socket.data.codigoSala) {
      return responder({ ok: false });
    }

    // Si el sitio aún estaba ocupado por una conexión vieja, se la quitamos.
    const viejo = io.sockets.sockets.get(jugador.id);
    if (viejo && viejo.id !== socket.id) {
      viejo.data.codigoSala = null;
      viejo.leave(sala.codigo);
    }

    if (sala.anfitrionId === jugador.id) sala.anfitrionId = socket.id;
    jugador.id = socket.id;
    socket.join(sala.codigo);
    socket.data.codigoSala = sala.codigo;

    if (!sala.iniciada) {
      responder({ ok: true, enEspera: true, nombre: jugador.nombre });
      actualizarSala(sala);
      return;
    }

    jugador.conectado = true;
    clearTimeout(jugador.gracia);

    const indice = sala.jugadores.indexOf(jugador);
    responder({ ok: true, nombre: jugador.nombre });
    socket.emit('partida-retomada', datosRetomar(sala, jugador, indice));
    socket.to(sala.codigo).emit('jugador-vuelve', { indice });
    actualizarSala(sala);
  });

  socket.on('salir-sala', callback => {
    abandonarSala(socket, true);
    respuesta(callback)({ ok: true });
  });

  socket.on('iniciar-partida', callback => {
    const responder = respuesta(callback);
    const sala = salaDe(socket);

    if (!sala) return responder({ ok: false, error: 'No estás en una sala.' });
    if (sala.anfitrionId !== socket.id) {
      return responder({ ok: false, error: 'Solo el anfitrión puede iniciar.' });
    }
    if (sala.jugadores.length < MIN_JUGADORES) {
      return responder({ ok: false, error: 'Necesitáis al menos 5 jugadores.' });
    }
    if (sala.iniciada) {
      return responder({ ok: false, error: 'La partida ya ha comenzado.' });
    }

    sala.iniciada = true;
    repartirRoles(sala.jugadores);
    sala.fase = 'reparto';
    sala.ronda = 0;
    sala.vistoReparto = new Set();
    sala.jugadores.forEach(j => {
      j.vivo = true;
      j.conectado = true;
      j.fuera = false;
      j.investigaciones = [];
    });
    programar(sala, ESPERA_REPARTO, () => empezarNoche(sala));

    // Cada jugador recibe la mesa completa, pero solo su propio rol.
    emitirA(sala, (jugador, indice) => datosInicio(sala, jugador, indice), 'partida-iniciada');

    actualizarSala(sala);
    responder({ ok: true });
  });

  // Cada jugador avisa cuando ha terminado de ver el reparto.
  socket.on('reparto-visto', () => {
    const sala = salaDe(socket);
    const jugador = jugadorDe(sala, socket);
    if (!jugador || sala.fase !== 'reparto') return;

    sala.vistoReparto.add(jugador.clave);
    comprobarFinReparto(sala);
  });

  socket.on('accion-noche', (datos, callback) => {
    const responder = respuesta(callback);
    const sala = salaDe(socket);

    if (!sala || sala.fase !== 'noche') {
      return responder({ ok: false, error: 'Ahora no es de noche.' });
    }

    const jugador = jugadorDe(sala, socket);

    if (!jugador || !actoresNoche(sala).includes(jugador)) {
      return responder({ ok: false, error: 'Esta noche no tienes nada que hacer.' });
    }
    if (sala.noche.elecciones.has(jugador.clave)) {
      return responder({ ok: false, error: 'Ya has elegido esta noche.' });
    }

    const objetivo = Number(datos?.objetivo);

    if (!objetivosNoche(sala, jugador).includes(objetivo)) {
      return responder({ ok: false, error: 'No puedes elegir a esa persona.' });
    }

    sala.noche.elecciones.set(jugador.clave, objetivo);

    // El Detective recibe su respuesta en privado nada más elegir.
    if (jugador.rol === 'detective') {
      const esMafia = sala.jugadores[objetivo].rol === 'mafia';
      jugador.investigaciones.push({ indice: objetivo, esMafia });
      responder({ ok: true, esMafia });
    } else {
      responder({ ok: true });
    }

    if (jugador.rol === 'mafia') enviarEleccionesMafia(sala);
    comprobarFinNoche(sala);
  });

  // El anfitrión puede cortar el debate y pasar ya a votar.
  socket.on('saltar-debate', () => {
    const sala = salaDe(socket);
    if (sala?.fase === 'debate' && sala.anfitrionId === socket.id) empezarVotacion(sala);
  });

  socket.on('votar', (datos, callback) => {
    const responder = respuesta(callback);
    const sala = salaDe(socket);

    if (!sala || sala.fase !== 'votacion') {
      return responder({ ok: false, error: 'Ahora no se está votando.' });
    }

    const jugador = jugadorDe(sala, socket);
    const indice = sala.jugadores.indexOf(jugador);

    if (!jugador || !enJuego(jugador)) {
      return responder({ ok: false, error: 'Ya no puedes votar.' });
    }
    if (sala.votos.has(jugador.clave)) {
      return responder({ ok: false, error: 'Ya has votado.' });
    }

    const objetivo = Number(datos?.objetivo);
    const valido = objetivo === -1 ||
      (objetivo !== indice && sala.jugadores[objetivo] && enJuego(sala.jugadores[objetivo]));

    if (!valido) return responder({ ok: false, error: 'No puedes votar a esa persona.' });

    sala.votos.set(jugador.clave, objetivo);
    responder({ ok: true });
    io.to(sala.codigo).emit('votos', votosPublicos(sala));
    comprobarFinVotacion(sala);
  });

  socket.on('disconnect', () => abandonarSala(socket, false));
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));

  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });

  app.use(vite.middlewares);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`NOCTURNA está funcionando en el puerto ${PORT}`);
});
