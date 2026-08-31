"use client";

import { useEffect, useRef, useState } from "react";
import TestRunner from "./TestRunner";

export default function TestRoom({ test, onFinish, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraState, setCameraState] = useState("requesting"); // requesting | active | denied

  useEffect(() => {
    let cancelled = false;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraState("active");
      } catch {
        if (!cancelled) setCameraState("denied");
      }
    }
    startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function handleFinish(score) {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onFinish(score);
  }

  function handleCancel() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCancel();
  }

  return (
    <div className="animate-fade-slide">
      <div className="max-w-2xl mx-auto mb-4 flex items-center justify-between gap-3 bg-secondary rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          Demo proctoring preview — video stays in your browser only, nothing is recorded or uploaded.
        </div>
        <div className="w-14 h-10 rounded-lg overflow-hidden bg-black flex-shrink-0 flex items-center justify-center">
          {cameraState === "active" ? (
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          ) : cameraState === "denied" ? (
            <span className="text-[9px] text-white/70 text-center px-1">No camera</span>
          ) : (
            <span className="text-[9px] text-white/70">…</span>
          )}
        </div>
      </div>

      <TestRunner test={test} onFinish={handleFinish} onCancel={handleCancel} />
    </div>
  );
}
