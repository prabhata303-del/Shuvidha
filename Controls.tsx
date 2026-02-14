
import React from 'react';
import { AppStatus } from '../types';

interface ControlsProps {
  status: AppStatus;
  onToggle: () => void;
}

const MicrophoneIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Zm0 12.5a4.5 4.5 0 0 1-4.5-4.5V5a4.5 4.5 0 0 1 9 0v6a4.5 4.5 0 0 1-4.5 4.5Z" />
        <path d="M8 5a1 1 0 0 0-1 1v.5a4 4 0 0 0 8 0V6a1 1 0 0 0-2 0v.5a2 2 0 0 1-4 0V6a1 1 0 0 0-1-1Z" />
        <path d="M12 15a4 4 0 0 0 4-4h1a5 5 0 0 1-4.857 5H12.5A2.5 2.5 0 0 1 15 18.5v2a1 1 0 0 1-2 0v-2a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v2a1 1 0 0 1-2 0v-2A2.5 2.5 0 0 1 9.5 16h.357A5 5 0 0 1 5 11h1a4 4 0 0 0 4 4a4 4 0 0 0 2 0Z" />
    </svg>
);


const Controls: React.FC<ControlsProps> = ({ status, onToggle }) => {
    const isIdle = status === AppStatus.IDLE;
    const isConnecting = status === AppStatus.CONNECTING;
    const isRecording = status === AppStatus.LISTENING || status === AppStatus.SPEAKING;

    let buttonText = "Start Conversation";
    let buttonClass = "bg-sky-500 hover:bg-sky-600";

    if (isConnecting) {
        buttonText = "Connecting...";
        buttonClass = "bg-yellow-500";
    } else if (isRecording) {
        buttonText = "Stop Conversation";
        buttonClass = "bg-red-500 hover:bg-red-600";
    }

    return (
        <div className="flex justify-center items-center">
        <button
            onClick={onToggle}
            disabled={isConnecting}
            className={`flex items-center justify-center gap-3 w-full max-w-xs px-6 py-4 rounded-full text-white font-semibold shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-75 ${buttonClass} ${isConnecting ? 'cursor-not-allowed' : ''} ${isRecording ? 'focus:ring-red-400' : 'focus:ring-sky-400'}`}
        >
            <MicrophoneIcon className="w-6 h-6" />
            <span>{buttonText}</span>
        </button>
        </div>
    );
};

export default Controls;
