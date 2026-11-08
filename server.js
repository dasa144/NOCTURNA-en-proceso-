
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

function abandonarSala(socket) {
  const codigo = socket.data.codigoSala;
  if (!codigo) return;

  socket.data.codigoSala = null;
  const sala = salas.get(codigo);

  if (!sala) return;

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

    const nombres = sala.jugadores.map(j => j.nombre);

    // Cada jugador recibe la mesa completa, pero solo su propio rol.
    sala.jugadores.forEach((jugador, indice) => {
      io.to(jugador.id).emit('partida-iniciada', {
        nombreSala: sala.nombre,
        jugadores: nombres,
        tuIndice: indice,
        tuRol: sala.roles.get(jugador.id)
      });
    });

    actualizarSala(sala);
    responder({ ok: true });
  });

  socket.on('disconnect', () => abandonarSala(socket));
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
