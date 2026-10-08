import { useEffect, useState } from 'react';

export default function VoiceJarvis() {
  const [isListening, setIsListening] = useState(false);
  const [statusText, setStatusText] = useState('Voice system ready');

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setStatusText('Browser does not support speech recognition');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setStatusText('Listening for wake word: Jarvis');
    };

    recognition.onend = () => {
      setIsListening(false);
      setStatusText('Voice system ready');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setStatusText(`Heard: "${transcript}"`);
    };

    const trigger = () => {
      recognition.start();
    };

    window.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() === 'j') trigger();
    });

    return () => {
      recognition.stop();
      window.removeEventListener('keydown', () => {});
    };
  }, []);

  return (
    <div className="panel p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-cyan-300">Voice Interface</h3>
        <span className={`h-3 w-3 rounded-full ${isListening ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]' : 'bg-slate-500'}`} />
      </div>

      <div className="flex items-center justify-center py-8">
        <div className={`flex h-28 w-28 items-center justify-center rounded-full border-2 ${isListening ? 'border-emerald-400 bg-emerald-500/10' : 'border-sky-500/40 bg-sky-500/5'} transition-all`}>
          <div className={`h-14 w-14 rounded-full ${isListening ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400/80'}`} />
        </div>
      </div>

      <p className="text-center text-sm text-slate-300">{statusText}</p>
      <div className="mt-5 flex gap-2">
        <button className="button-primary w-full">Listen</button>
        <button className="button-secondary w-full">Speak</button>
      </div>
    </div>
  );
}
