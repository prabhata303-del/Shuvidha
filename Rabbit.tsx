
import React from 'react';
import { AppStatus } from '../types';

interface RabbitProps {
  status: AppStatus;
}

const Rabbit: React.FC<RabbitProps> = ({ status }) => {
  const isListening = status === AppStatus.LISTENING || status === AppStatus.CONNECTING;
  const isSpeaking = status === AppStatus.SPEAKING;

  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Listening/Speaking Indicator */}
      {isListening && (
        <circle cx="50" cy="50" r="48" fill="#67e8f9" className="opacity-75 animate-pulse" />
      )}
      {isSpeaking && (
        <circle cx="50" cy="50" r="48" fill="#a5f3fc" className="opacity-75 animate-ping" />
      )}
      
      <g className="fill-slate-200 stroke-slate-600" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
        {/* Ears */}
        <path d="M 35,45 C 30,15 40,10 40,30 V 45" />
        <path d="M 65,45 C 70,15 60,10 60,30 V 45" />
        
        {/* Head */}
        <circle cx="50" cy="65" r="25" />
        
        {/* Eyes */}
        <circle cx="42" cy="60" r="2" fill="#1e293b" stroke="none" />
        <circle cx="58" cy="60" r="2" fill="#1e293b" stroke="none" />

        {/* Nose */}
        <path d="M 48,68 L 52,68 L 50,70 Z" fill="#f87171" stroke="none" />

        {/* Mouth */}
        <g transform={`translate(50, 74)`}>
          <path d="M -5,0 Q 0,3 5,0" className={`transition-all duration-200 ${isSpeaking ? 'opacity-0' : 'opacity-100'}`} />
          {/* Animated speaking mouth */}
          <ellipse cx="0" cy="1" rx="4" ry="2.5" className={`transition-all duration-200 ${isSpeaking ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}`} />
        </g>
      </g>
    </svg>
  );
};

export default Rabbit;
