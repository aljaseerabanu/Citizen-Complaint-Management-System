import { Server } from 'socket.io';

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: 'http://localhost:5173', // your frontend
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected');
    });
  });

  return io;
};
