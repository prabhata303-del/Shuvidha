
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { AppStatus, TranscriptEntry } from './types';
import Rabbit from './components/Rabbit';
import Transcript from './components/Transcript';
import Controls from './components/Controls';
import { encode, decode, decodeAudioData } from './utils/audioUtils';

// FIX: Cast window to any to support webkitAudioContext for Safari compatibility.
// Polyfill for webkitAudioContext
const AudioContext = window.AudioContext || (window as any).webkitAudioContext;

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const microphoneSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const playingAudioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const stopConversation = useCallback(async () => {
    setStatus(AppStatus.IDLE);
    
    if (sessionPromiseRef.current) {
      try {
        const session = await sessionPromiseRef.current;
        session.close();
      } catch (e) {
        console.error("Error closing session:", e);
      }
      sessionPromiseRef.current = null;
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (microphoneSourceRef.current) {
      microphoneSourceRef.current.disconnect();
      microphoneSourceRef.current = null;
    }
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      microphoneStreamRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      await inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        playingAudioSourcesRef.current.forEach(source => source.stop());
        playingAudioSourcesRef.current.clear();
        await outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }

    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
    nextStartTimeRef.current = 0;
  }, []);
  
  const handleMessage = useCallback(async (message: LiveServerMessage) => {
    if (message.serverContent?.inputTranscription) {
        currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
    }
    if (message.serverContent?.outputTranscription) {
        currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
    }

    if (message.serverContent?.turnComplete) {
      const fullInput = currentInputTranscriptionRef.current.trim();
      const fullOutput = currentOutputTranscriptionRef.current.trim();

      setTranscript(prev => {
          const newTranscript = [...prev];
          if(fullInput) newTranscript.push({ speaker: 'user', text: fullInput });
          if(fullOutput) newTranscript.push({ speaker: 'rabbit', text: fullOutput });
          return newTranscript;
      });

      currentInputTranscriptionRef.current = '';
      currentOutputTranscriptionRef.current = '';
    }

    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
    if (base64Audio && outputAudioContextRef.current) {
        setStatus(AppStatus.SPEAKING);
        const audioContext = outputAudioContextRef.current;
        const decodedBytes = decode(base64Audio);
        const audioBuffer = await decodeAudioData(decodedBytes, audioContext, 24000, 1);

        const currentTime = audioContext.currentTime;
        const startTime = Math.max(currentTime, nextStartTimeRef.current);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);

        const onEnded = () => {
            playingAudioSourcesRef.current.delete(source);
            if (playingAudioSourcesRef.current.size === 0) {
                setStatus(AppStatus.LISTENING);
            }
        };
        source.addEventListener('ended', onEnded, { once: true });
        
        source.start(startTime);
        nextStartTimeRef.current = startTime + audioBuffer.duration;
        playingAudioSourcesRef.current.add(source);
    }
    
    if (message.serverContent?.interrupted) {
        playingAudioSourcesRef.current.forEach(source => source.stop());
        playingAudioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;
        setStatus(AppStatus.LISTENING);
    }
  }, []);

  const startConversation = useCallback(async () => {
    setError(null);
    setTranscript([]);
    setStatus(AppStatus.CONNECTING);

    if (!process.env.API_KEY) {
      setError("API_KEY environment variable not set.");
      setStatus(AppStatus.IDLE);
      return;
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
      microphoneStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStatus(AppStatus.LISTENING);

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: 'You are a friendly, cheerful, and slightly mischievous rabbit named Tolkin. Keep your answers concise and engaging for all ages. You are talking to a person right now.'
        },
        callbacks: {
          onopen: () => {
            if (!inputAudioContextRef.current || !microphoneStreamRef.current) return;
            
            microphoneSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(microphoneStreamRef.current);
            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              // FIX: More efficient conversion from Float32Array to Int16Array and align with API guidelines for encoding.
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };
            
            microphoneSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
          },
          onmessage: handleMessage,
          onerror: (e) => {
            console.error('Session error:', e);
            setError('An error occurred with the session. Please try again.');
            stopConversation();
          },
          onclose: () => {
            console.log('Session closed.');
            stopConversation();
          },
        }
      });

    } catch (err) {
      console.error('Failed to start conversation:', err);
      setError('Could not access microphone. Please grant permission and try again.');
      await stopConversation();
    }
  }, [handleMessage, stopConversation]);

  const handleToggleConversation = useCallback(() => {
    if (status === AppStatus.IDLE) {
      startConversation();
    } else {
      stopConversation();
    }
  }, [status, startConversation, stopConversation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopConversation();
    };
  }, [stopConversation]);

  return (
    <div className="flex flex-col h-screen font-sans items-center justify-center p-4 bg-sky-50 text-slate-800">
        <div className="w-full max-w-2xl h-full flex flex-col items-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-sky-700 my-4">Talk to Tolkin the Rabbit</h1>
            <div className="w-48 h-48 sm:w-64 sm:h-64 mb-4">
                <Rabbit status={status} />
            </div>
            
            <div className="w-full flex-grow bg-white/70 rounded-xl shadow-inner p-4 overflow-y-auto mb-4 min-h-0">
                <Transcript transcript={transcript} />
                {error && <p className="text-red-500 text-center">{error}</p>}
                {status === AppStatus.IDLE && transcript.length === 0 && !error && (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-slate-500 text-lg">Click the microphone to start talking!</p>
                    </div>
                )}
            </div>

            <div className="w-full flex-shrink-0">
                <Controls status={status} onToggle={handleToggleConversation} />
            </div>
        </div>
    </div>
  );
};

export default App;
