import React from 'react';
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { GameEngine } from './game/core/GameEngine';

function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const socket = io(import.meta.env.SERVER_URL || 'http://localhost:3000');
    const game = new GameEngine(containerRef.current, socket);

    return () => {
      socket.disconnect();
      containerRef.current?.firstChild?.remove();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-screen" />
  );
}

export default App;
