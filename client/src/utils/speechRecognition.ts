// Browser Speech Recognition (Web Speech API) helper with Ukrainian and Russian support

export interface SpeechRecognitionResultHandler {
  onResult: (text: string) => void;
  onError?: (err: any) => void;
  onEnd?: () => void;
  language?: 'uk-UA' | 'ru-RU' | 'en-US';
}

export function startSpeechToText({
  onResult,
  onError,
  onEnd,
  language = 'uk-UA'
}: SpeechRecognitionResultHandler) {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (onError) onError(new Error('Браузер не підтримує розпізнавання голосу. Спробуйте в Chrome / Safari.'));
    return null;
  }

  try {
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript + ' ';
      }
      onResult(currentTranscript.trim());
    };

    recognition.onerror = (event: any) => {
      if (onError) onError(event.error);
    };

    recognition.onend = () => {
      if (onEnd) onEnd();
    };

    recognition.start();
    return recognition;
  } catch (err) {
    if (onError) onError(err);
    return null;
  }
}
