// src/pages/Call.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import VideoPlayer from '../components/VideoPlayer';
import CallControls from '../components/CallControls';

const Call = () => {
    const { id: roomId } = useParams();
    const [users, setUsers] = useState([]);
    const [streams, setStreams] = useState({});
    const [myStream, setMyStream] = useState(null);
    const socketRef = useRef(null);
    const peerConnections = useRef({});
    const myUserId = useRef(uuidv4());

    useEffect(() => {
        socketRef.current = io(); // Connect to server

        const getMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });
                setMyStream(stream);
                setStreams((prev) => ({ ...prev, [myUserId.current]: stream }));

                socketRef.current.emit('join-room', roomId, myUserId.current);
            } catch (err) {
                console.error('Error getting user media: ', err);
            }
        };

        getMedia();

        socketRef.current.on('new-user-joined', (userId) => {
            console.log('User Joined', userId);
            setUsers((prev) => [...prev, userId]);
        });

        socketRef.current.on('user-joined', (userId, socketId) => {
            console.log('User Joined', userId, socketId);
            createOffer(userId, socketId);
        });

        socketRef.current.on('user-left', (userId) => {
            console.log('user left', userId);
            setUsers((prev) => prev.filter((id) => id !== userId));
            setStreams((prev) => {
                const { [userId]: streamToRemove, ...rest } = prev;
                if (streamToRemove) {
                    streamToRemove.getTracks().forEach((track) => track.stop());
                }
                return rest;
            });
            if (peerConnections.current[userId]) {
                peerConnections.current[userId].close();
                delete peerConnections.current[userId];
            }
        });

        socketRef.current.on('offer', (offer, sdp, from) => {
            createAnswer(offer, sdp, from);
        });

        socketRef.current.on('answer', (answer, sdp, from) => {
            handleAnswer(answer, sdp, from);
        });

        socketRef.current.on('ice-candidate', (candidate, from) => {
            handleIceCandidate(candidate, from);
        });

        socketRef.current.on('remove-user', (userToRemove) => {
            setUsers((prev) => prev.filter((id) => id !== userToRemove));
            setStreams((prev) => {
                const { [userToRemove]: streamToRemove, ...rest } = prev;
                if (streamToRemove) {
                    streamToRemove.getTracks().forEach((track) => track.stop());
                }
                return rest;
            });
            if (peerConnections.current[userToRemove]) {
                peerConnections.current[userToRemove].close();
                delete peerConnections.current[userToRemove];
            }
        });

        socketRef.current.on('mute-all', () => {
            setStreams((prev) => {
                const updatedStreams = {};
                Object.keys(prev).forEach((key) => {
                    if (key !== myUserId.current && prev[key]) {
                        prev[key]
                            .getAudioTracks()
                            .forEach((track) => (track.enabled = false));
                    }
                    updatedStreams[key] = prev[key];
                });
                return updatedStreams;
            });
        });

        socketRef.current.on('unmute-all', () => {
            setStreams((prev) => {
                const updatedStreams = {};
                Object.keys(prev).forEach((key) => {
                    if (key !== myUserId.current && prev[key]) {
                        prev[key]
                            .getAudioTracks()
                            .forEach((track) => (track.enabled = true));
                    }
                    updatedStreams[key] = prev[key];
                });
                return updatedStreams;
            });
        });

        return () => {
            if (myStream) {
                myStream.getTracks().forEach((track) => track.stop());
            }
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
            Object.values(peerConnections.current).forEach((connection) => {
                connection.close();
            });
        };
    }, [roomId]);

    const createOffer = async (userId, socketId) => {
        const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        peerConnections.current[userId] = peerConnection;
        if (myStream) {
            myStream.getTracks().forEach((track) => {
                peerConnection.addTrack(track, myStream);
            });
        }

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit(
                    'ice-candidate',
                    event.candidate,
                    roomId,
                    myUserId.current
                );
            }
        };

        peerConnection.ontrack = (event) => {
            setStreams((prev) => ({ ...prev, [userId]: event.streams[0] }));
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socketRef.current.emit(
            'offer',
            offer,
            roomId,
            peerConnection.localDescription,
            myUserId.current
        );
    };

    const createAnswer = async (offer, sdp, from) => {
        console.log('received offer from ', from);
        const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        peerConnections.current[from] = peerConnection;
        if (myStream) {
            myStream.getTracks().forEach((track) => {
                peerConnection.addTrack(track, myStream);
            });
        }

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit(
                    'ice-candidate',
                    event.candidate,
                    roomId,
                    myUserId.current
                );
            }
        };

        peerConnection.ontrack = (event) => {
            setStreams((prev) => ({ ...prev, [from]: event.streams[0] }));
        };

        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socketRef.current.emit(
            'answer',
            answer,
            roomId,
            peerConnection.localDescription,
            myUserId.current
        );
    };
    const handleAnswer = async (answer, sdp, from) => {
        console.log('received answer from ', from);
        if (peerConnections.current[from]) {
            await peerConnections.current[from].setRemoteDescription(
                new RTCSessionDescription(sdp)
            );
        }
    };

    const handleIceCandidate = async (candidate, from) => {
        if (peerConnections.current[from]) {
            try {
                await peerConnections.current[from].addIceCandidate(
                    new RTCIceCandidate(candidate)
                );
            } catch (e) {
                console.error('Error adding ice candidate', e);
            }
        }
    };

    const handleRemoveUser = (userToRemove) => {
        socketRef.current.emit('remove-user', roomId, userToRemove);
    };

    const handleMuteAll = () => {
        socketRef.current.emit('mute-all', roomId);
    };

    const handleUnmuteAll = () => {
        socketRef.current.emit('unmute-all', roomId);
    };

    function uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
            /[xy]/g,
            function (c) {
                var r = (Math.random() * 16) | 0,
                    v = c == 'x' ? r : (r & 0x3) | 0x8;
                return v.toString(16);
            }
        );
    }

    return (
        <div>
            <h1>Room ID: {roomId}</h1>
            <div>
                {Object.entries(streams).map(([id, stream]) => (
                    <div key={id}>
                        {id === myUserId.current ? (
                            <h3>Me</h3>
                        ) : (
                            <h3>User: {id}</h3>
                        )}
                        <VideoPlayer stream={stream} muted={id === myUserId.current} />
                    </div>
                ))}
            </div>
            <CallControls
                users={users}
                onRemoveUser={handleRemoveUser}
                onMuteAll={handleMuteAll}
                onUnmuteAll={handleUnmuteAll}
            />
        </div>
    );
};

export default Call;