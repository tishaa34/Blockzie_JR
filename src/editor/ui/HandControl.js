import React, { useEffect, useRef } from 'react';
import { initHandDetection, getFingerDirection } from '../../utils/HandDetection';

const HandControl = ({ cameraActive = true }) => {
    const videoRef = useRef(null);
    const detectorRef = useRef(null);

    useEffect(() => {
        let running = true;
        async function detectFrame() {
            if (!running || !detectorRef.current || !videoRef.current) return;
            const results = detectorRef.current.detectForVideo(videoRef.current, performance.now());
            const hands = results?.landmarks?.[0];
            if (hands) {
                const dir = getFingerDirection(hands);
                console.log('🟢 Pointing direction:', dir);
                window.handDetectionData = { direction: dir, landmarks: hands };
            } else {
                window.handDetectionData = { direction: null, landmarks: null };
            }
            requestAnimationFrame(detectFrame);
        }
        const setup = async () => {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = async () => {
                await videoRef.current.play();
                detectorRef.current = await initHandDetection();
                requestAnimationFrame(detectFrame);
            };
        };
        if (cameraActive) setup();
        return () => {
            running = false;
            if (videoRef.current?.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
            detectorRef.current = null;
        };
    }, [cameraActive]);

    return (
        <video ref={videoRef} width={320} height={240} autoPlay muted playsInline style={{ display: 'none' }} />
    );

};
export default HandControl;
