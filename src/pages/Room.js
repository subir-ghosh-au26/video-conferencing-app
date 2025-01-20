// src/pages/Room.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

const Room = () => {
    const [roomId, setRoomId] = useState('');
    const navigate = useNavigate();

    const handleJoinRoom = () => {
        navigate(`/call/${roomId}`);
    };

    const handleCreateRoom = () => {
        const newRoomId = uuidv4();
        navigate(`/call/${newRoomId}`);
    };

    return (
        <div>
            <h1>Join or Create Room</h1>
            <input
                type="text"
                placeholder="Enter Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
            />
            <button onClick={handleJoinRoom}>Join Room</button>
            <button onClick={handleCreateRoom}>Create Room</button>
        </div>
    );
};

export default Room;