import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import Video from './components/Video';
import './App.css';

const socket = io('http://localhost:8000');
function App() {
  const [room, setRoom] = useState('');
  const [users, setUsers] = useState([]);
  const [host, setHost] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const localVideoRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      setLocalStream(stream)
      if (localVideoRef.current)
        localVideoRef.current.srcObject = stream;

    })
  }, [])

  useEffect(() => {
    socket.on("room_created", (room) => {
      setRoom(room)
    })

    socket.on("user_joined", (newUser) => {
      setUsers(prevUsers => [...prevUsers, newUser])
    })
    socket.on("join_success", (room, users, host) => {
      setRoom(room)
      setUsers(users)
      setHost(host)
    })
    socket.on("join_error", (error) => {
      setErrorMessage(error)
    })
    socket.on('offer', ({ offer, from }) => {
      handleOffer(offer, from);
    });

    socket.on('answer', ({ answer, from }) => {
      handleAnswer(answer, from);
    });
    socket.on('ice-candidate', ({ candidate, from }) => {
      handleIceCandidate(candidate, from);
    });
    socket.on('mute-all', () => {
      setMuteAll(true);
    });

    socket.on('unmute-all', () => {
      setMuteAll(false);
    });

    socket.on("removed", () => {
      alert("You have been removed from the room by the host.");
      window.location.reload();
    })
    socket.on("update_users", (users) => {
      setUsers(users)
    })


    return () => {
      socket.off("room_created");
      socket.off("user_joined");
      socket.off("join_success");
      socket.off("join_error");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("mute-all");
      socket.off("unmute-all");
      socket.off("removed");
      socket.off("update_users");
    }

  }, [])
  useEffect(() => {
    setIsHost(socket.id === host)
  }, [host])

  const handleCreateRoom = () => {
    const newRoom = Math.random().toString(36).substring(2, 15)
    socket.emit('create_room', newRoom);
  };

  const handleJoinRoom = () => {
    if (room)
      socket.emit('join_room', room)

  }
  const handleOffer = (offer, from) => {
    const peer = new Peer({ initiator: false, trickle: false, stream: localStream });
    peer.on('signal', (signal) => {
      socket.emit('answer', { answer: signal, to: from });
    });
    peer.on('stream', (stream) => {
      setRemoteStreams((prevStreams) => ({ ...prevStreams, [from]: stream }));
    });
    peer.on('icecandidate', (candidate) => {
      if (candidate)
        socket.emit('ice-candidate', { candidate, to: from });
    })
    peer.signal(offer);
  };

  const handleAnswer = (answer, from) => {
    if (remoteStreams[from]) {
      const peer = remoteStreams[from].peer;
      peer.signal(answer);
    }
  };

  const handleIceCandidate = (candidate, from) => {
    if (remoteStreams[from]) {
      const peer = remoteStreams[from].peer;
      peer.addIceCandidate(candidate);
    }
  };
  useEffect(() => {
    users.forEach((userId) => {
      if (userId !== socket.id && !remoteStreams[userId]) {
        const peer = new Peer({ initiator: true, trickle: false, stream: localStream });
        peer.on('signal', (signal) => {
          socket.emit('offer', { offer: signal, to: userId });
        });
        peer.on('stream', (stream) => {
          setRemoteStreams((prevStreams) => ({ ...prevStreams, [userId]: stream, peer }));
        });
        peer.on('icecandidate', (candidate) => {
          if (candidate)
            socket.emit('ice-candidate', { candidate, to: userId });
        })

        setRemoteStreams((prevStreams) => ({ ...prevStreams, [userId]: { peer } }));
      }

    });
  }, [users, localStream])

  const handleMuteAll = () => {
    socket.emit('mute-all', room);
    setMuteAll(true);
  };

  const handleUnmuteAll = () => {
    socket.emit('unmute-all', room);
    setMuteAll(false);
  };

  const handleRemoveUser = (userToRemove) => {
    socket.emit('remove-user', { userToRemove, room });
  };

  const setMuteAll = (mute) => {
    setIsMuted(mute)
    if (localStream && localStream.getAudioTracks()) {
      localStream.getAudioTracks().forEach(track => track.enabled = !mute)
    }
  }
  return (
    <div className="container">
      <h1>Video Conference App</h1>
      <div className="form-group">
        <input
          type="text"
          className="form-control"
          placeholder="Enter Room ID"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
        />
        <button onClick={handleCreateRoom} className="btn btn-primary">Create Room</button>
        <button onClick={handleJoinRoom} className="btn btn-primary">Join Room</button>
        {errorMessage && <p className="error-message">{errorMessage}</p>}
      </div>
      <div className="video-container">
        <div className="videos-section">
          <Video stream={localStream} muted={isMuted} isLocal ref={localVideoRef} />
          {Object.keys(remoteStreams).map((userId) => (
            <Video key={userId} stream={remoteStreams[userId].stream} />
          ))}
        </div>

        {isHost && <div className="control-section">
          <button onClick={handleMuteAll} className="btn btn-secondary">Mute All</button>
          <button onClick={handleUnmuteAll} className="btn btn-secondary">Unmute All</button>
        </div>}

        {isHost && <ul className="user-list">
          {users.map(userId => (
            userId !== socket.id && <li key={userId}>User {userId} <button onClick={() => handleRemoveUser(userId)} className="btn btn-danger">Remove</button></li>
          ))}
        </ul>}
      </div>
    </div>
  );
}

export default App;