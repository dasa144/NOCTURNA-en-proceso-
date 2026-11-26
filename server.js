
import express from 'express';
import http from 'node:http';
import path from 'node:path';
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

  const barajado = barajar(mazo);
  return new Map(jugadores.map((jugador, i) => [jugador.id, barajado[i]]));
}

function actualizarSala(sala) {
  io.to(sala.codigo).emit('estado-sala', estadoSala(sala));
}

// ── La noche ───────────────────────────────────────────────
// Cada rol con habilidad elige en secreto. La noche termina cuando
// todos han elegido o cuando se acaba el tiempo.

const DURACION_NOCHE = 60_000;
// Tiempo máximo que se espera a que todos terminen de ver el reparto.
const ESPERA_REPARTO = 30_000;

const enJuego = jugador => jugador.vivo && jugador.conectado;

function rolDe(sala, jugador) {
  return sala.roles.get(jugador.id);
}

// Quién tiene que actuar esta noche (vivos y conectados).
function actoresNoche(sala) {
  return sala.jugadores.filter(
    j => enJuego(j) && ['mafia', 'doctor', 'detective'].includes(rolDe(sala, j))
  );
}

// A quién puede señalar cada rol (índices de la mesa).
function objetivosValidos(sala, jugador) {
  const rol = rolDe(sala, jugador);

  return sala.jugadores
    .map((otro, indice) => ({ otro, indice }))
    .filter(({ otro }) => enJuego(otro))
    .filter(({ otro }) => {
      if (rol === 'mafia') return rolDe(sala, otro) !== 'mafia';
      if (rol === 'detective') return otro.id !== jugador.id;
      return true; // El Doctor puede protegerse a sí mismo.
    })
    .map(({ indice }) => indice);
}

function enviarEleccionesMafia(sala) {
  const elecciones = {};

  sala.jugadores.forEach((jugador, indice) => {
    if (rolDe(sala, jugador) !== 'mafia') return;
    const eleccion = sala.noche.elecciones.get(jugador.id);
    if (eleccion !== undefined) elecciones[indice] = eleccion;
  });

  sala.jugadores
    .filter(j => rolDe(sala, j) === 'mafia' && j.conectado)
    .forEach(j => io.to(j.id).emit('elecciones-mafia', elecciones));
}

function empezarNoche(sala) {
  if (sala.fase !== 'reparto') return;

  clearTimeout(sala.temporizador);
  sala.fase = 'noche';
  sala.ronda = (sala.ronda || 0) + 1;
  sala.noche = { elecciones: new Map(), terminaEn: Date.now() + DURACION_NOCHE };

  sala.jugadores.forEach(jugador => {
    if (!jugador.conectado) return;

    const puedeActuar = actoresNoche(sala).includes(jugador);

    io.to(jugador.id).emit('fase-noche', {
      ronda: sala.ronda,
      duracion: DURACION_NOCHE,
      objetivos: puedeActuar ? objetivosValidos(sala, jugador) : [],
      vivos: sala.jugadores.map(j => j.vivo)
    });
  });

  sala.temporizador = setTimeout(() => terminarNoche(sala), DURACION_NOCHE);
}

function comprobarFinNoche(sala) {
  const faltan = actoresNoche(sala).some(j => !sala.noche.elecciones.has(j.id));
  if (!faltan) terminarNoche(sala);
}

// La víctima es la más votada por la Mafia. Si empatan, decide el azar.
function victimaMafia(sala) {
  const votos = new Map();

  sala.jugadores.forEach(jugador => {
    if (rolDe(sala, jugador) !== 'mafia' || !enJuego(jugador)) return;
    const eleccion = sala.noche.elecciones.get(jugador.id);
    if (eleccion !== undefined) votos.set(eleccion, (votos.get(eleccion) || 0) + 1);
  });

  if (votos.size === 0) return null;

  const maximo = Math.max(...votos.values());
  const empatados = [...votos].filter(([, n]) => n === maximo).map(([indice]) => indice);
  return empatados[Math.floor(Math.random() * empatados.length)];
}

function terminarNoche(sala) {
  if (sala.fase !== 'noche') return;

  clearTimeout(sala.temporizador);

  const victima = victimaMafia(sala);
  const doctor = sala.jugadores.find(j => rolDe(sala, j) === 'doctor' && enJuego(j));
  const protegido = doctor ? sala.noche.elecciones.get(doctor.id) : undefined;
  const muere = victima !== null && victima !== protegido && sala.jugadores[victima]?.vivo;

  if (muere) sala.jugadores[victima].vivo = false;

  sala.fase = 'dia';
  sala.noche = null;

  io.to(sala.codigo).emit('amanecer', {
    ronda: sala.ronda,
    muerto: muere ? victima : null,
    rolMuerto: muere ? rolDe(sala, sala.jugadores[victima]) : null,
    vivos: sala.jugadores.map(j => j.vivo)
  });
}

function abandonarSala(socket) {
  const codigo = socket.data.codigoSala;
  if (!codigo) return;

  socket.data.codigoSala = null;
  const sala = salas.get(codigo);

  if (!sala) return;

  // Con la partida empezada no se quita a nadie de la mesa (cambiarían
  // los asientos de todos): solo se marca que se ha ido.
  if (sala.iniciada) {
    const indice = sala.jugadores.findIndex(j => j.id === socket.id);
    if (indice === -1) return;

    sala.jugadores[indice].conectado = false;
    socket.leave(codigo);

    if (!sala.jugadores.some(j => j.conectado)) {
      clearTimeout(sala.temporizador);
      salas.delete(codigo);
      return;
    }

    if (sala.anfitrionId === socket.id) {
      sala.anfitrionId = sala.jugadores.find(j => j.conectado).id;
    }

    io.to(codigo).emit('jugador-abandona', { indice });

    if (sala.fase === 'reparto') comprobarFinReparto(sala);
    if (sala.fase === 'noche') comprobarFinNoche(sala);
    return;
  }

  sala.jugadores = sala.jugadores.filter(j => j.id !== socket.id);

  if (sala.jugadores.length === 0) {
    salas.delete(codigo);
    return;
  }

  if (sala.anfitrionId === socket.id) {
    sala.anfitrionId = sala.jugadores[0].id;
  }

  actualizarSala(sala);
}

io.on('connection', socket => {
  socket.on('crear-sala', (datos, callback) => {
    const responder = typeof callback === 'function' ? callback : () => {};

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
    const sala = {
      codigo,
      nombre,
      maximoJugadores: maximo,
      anfitrionId: socket.id,
      jugadores: [{ id: socket.id, nombre: anfitrion }],
      iniciada: false
    };

    salas.set(codigo, sala);
    socket.join(codigo);
    socket.data.codigoSala = codigo;

    responder({ ok: true, codigo });
    actualizarSala(sala);
  });

  socket.on('unirse-sala', (datos, callback) => {
    const responder = typeof callback === 'function' ? callback : () => {};

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

    sala.jugadores.push({ id: socket.id, nombre });
    socket.join(codigo);
    socket.data.codigoSala = codigo;

    responder({ ok: true, codigo });
    actualizarSala(sala);
  });

  socket.on('salir-sala', callback => {
    abandonarSala(socket);
    if (typeof callback === 'function') callback({ ok: true });
  });

  socket.on('iniciar-partida', callback => {
    const responder = typeof callback === 'function' ? callback : () => {};
    const sala = salas.get(socket.data.codigoSala);

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
    sala.roles = repartirRoles(sala.jugadores);
    sala.fase = 'reparto';
    sala.vistoReparto = new Set();
    sala.jugadores.forEach(j => {
      j.vivo = true;
      j.conectado = true;
    });
    sala.temporizador = setTimeout(() => empezarNoche(sala), ESPERA_REPARTO);

    const nombres = sala.jugadores.map(j => j.nombre);
    const indicesMafia = sala.jugadores
      .map((jugador, indice) => (sala.roles.get(jugador.id) === 'mafia' ? indice : -1))
      .filter(indice => indice !== -1);

    // Cada jugador recibe la mesa completa, pero solo su propio rol.
    // Excepción: los de la Mafia se conocen entre ellos.
    sala.jugadores.forEach((jugador, indice) => {
      const rol = sala.roles.get(jugador.id);

      io.to(jugador.id).emit('partida-iniciada', {
        nombreSala: sala.nombre,
        jugadores: nombres,
        tuIndice: indice,
        tuRol: rol,
        companerosMafia: rol === 'mafia'
          ? indicesMafia.filter(otro => otro !== indice)
          : []
      });
    });

    actualizarSala(sala);
    responder({ ok: true });
  });

  // Cada jugador avisa cuando ha terminado de ver el reparto.
  socket.on('reparto-visto', () => {
    const sala = salas.get(socket.data.codigoSala);
    if (!sala || sala.fase !== 'reparto') return;

    sala.vistoReparto.add(socket.id);
    comprobarFinReparto(sala);
  });

  socket.on('accion-noche', (datos, callback) => {
    const responder = typeof callback === 'function' ? callback : () => {};
    const sala = salas.get(socket.data.codigoSala);

    if (!sala || sala.fase !== 'noche') {
      return responder({ ok: false, error: 'Ahora no es de noche.' });
    }

    const jugador = sala.jugadores.find(j => j.id === socket.id);

    if (!jugador || !actoresNoche(sala).includes(jugador)) {
      return responder({ ok: false, error: 'Esta noche no tienes nada que hacer.' });
    }
    if (sala.noche.elecciones.has(jugador.id)) {
      return responder({ ok: false, error: 'Ya has elegido esta noche.' });
    }

    const objetivo = Number(datos?.objetivo);

    if (!objetivosValidos(sala, jugador).includes(objetivo)) {
      return responder({ ok: false, error: 'No puedes elegir a esa persona.' });
    }

    sala.noche.elecciones.set(jugador.id, objetivo);
    const rol = rolDe(sala, jugador);

    // El Detective recibe su respuesta en privado nada más elegir.
    if (rol === 'detective') {
      responder({
        ok: true,
        esMafia: rolDe(sala, sala.jugadores[objetivo]) === 'mafia'
      });
    } else {
      responder({ ok: true });
    }

    if (rol === 'mafia') enviarEleccionesMafia(sala);
    comprobarFinNoche(sala);
  });

  socket.on('disconnect', () => abandonarSala(socket));
});

function comprobarFinReparto(sala) {
  const faltan = sala.jugadores.some(j => j.conectado && !sala.vistoReparto.has(j.id));
  if (!faltan) empezarNoche(sala);
}

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
