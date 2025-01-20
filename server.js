// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        io.to(roomId).emit('user-joined', userId, socket.id); // Send socketId
        // Broadcast new user
        socket.broadcast.to(roomId).emit('new-user-joined', userId);
        socket.on('disconnect', () => {
            socket.broadcast.to(roomId).emit('user-left', userId);
        });
    });

    socket.on('offer', (offer, roomId, sdp, from) => {
        socket.broadcast.to(roomId).emit('offer', offer, sdp, from);
    });

    socket.on('answer', (answer, roomId, sdp, from) => {
        socket.broadcast.to(roomId).emit('answer', answer, sdp, from);
    });

    socket.on('ice-candidate', (candidate, roomId, from) => {
        socket.broadcast.to(roomId).emit('ice-candidate', candidate, from);
    });

    socket.on('remove-user', (roomId, userToRemove) => {
        socket.broadcast.to(roomId).emit('remove-user', userToRemove);
    });

    socket.on('mute-all', (roomId) => {
        socket.broadcast.to(roomId).emit('mute-all');
    });

    socket.on('unmute-all', (roomId) => {
        socket.broadcast.to(roomId).emit('unmute-all');
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});