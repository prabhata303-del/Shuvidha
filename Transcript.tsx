
import React, { useRef, useEffect } from 'react';
import { TranscriptEntry } from '../types';

interface TranscriptProps {
  transcript: TranscriptEntry[];
}

const Transcript: React.FC<TranscriptProps> = ({ transcript }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  return (
    <div className="space-y-4">
      {transcript.map((entry, index) => (
        <div
          key={index}
          className={`flex flex-col ${entry.speaker === 'user' ? 'items-end' : 'items-start'}`}
        >
          <div
            className={`max-w-xs md:max-w-md lg:max-w-lg rounded-2xl px-4 py-2 text-sm md:text-base ${
              entry.speaker === 'user'
                ? 'bg-sky-500 text-white rounded-br-none'
                : 'bg-slate-200 text-slate-800 rounded-bl-none'
            }`}
          >
            {entry.text}
          </div>
          <p className="text-xs text-slate-400 mt-1 px-1">
            {entry.speaker === 'user' ? 'You' : 'Tolkin'}
          </p>
        </div>
      ))}
      <div ref={endOfMessagesRef} />
    </div>
  );
};

export default Transcript;
