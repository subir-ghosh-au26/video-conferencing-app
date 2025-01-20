import React, { useRef, useEffect } from 'react';
import styles from "./Video.module.css";
function Video({ stream, muted, isLocal }) {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className={styles.videoContainer}>
            <video
                ref={videoRef}
                className={styles.video}
                muted={muted}
                autoPlay
                playsInline
            />
            {isLocal && <p className={styles.label}>Me</p>}
        </div>
    );
}
export default Video;