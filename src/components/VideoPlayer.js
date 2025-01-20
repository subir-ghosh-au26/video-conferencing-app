// src/components/VideoPlayer.js
import React, { useRef, useEffect } from 'react';

const VideoPlayer = ({ stream, muted }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            videoRef.current.muted = muted;
        }
    }, [stream, muted]);

    return <video ref={videoRef} autoPlay playsInline />;
};

export default VideoPlayer;