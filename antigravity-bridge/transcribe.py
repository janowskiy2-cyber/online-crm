import sys
import os
import soundfile as sf
import speech_recognition as sr

# Force UTF-8 on Windows stdout/stderr
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

def transcribe_audio(input_file, preferred_lang='uk-UA'):
    if not os.path.exists(input_file):
        return ""
    
    temp_wav = input_file + '.temp.wav'
    try:
        data, samplerate = sf.read(input_file)
        sf.write(temp_wav, data, samplerate)
    except Exception as e:
        print(f"Audio conversion failed: {e}", file=sys.stderr)
        return ""

    recognizer = sr.Recognizer()
    text = ""
    try:
        with sr.AudioFile(temp_wav) as source:
            audio_data = recognizer.record(source)
            
            # 1. Try Ukrainian
            try:
                text = recognizer.recognize_google(audio_data, language='uk-UA')
            except sr.UnknownValueError:
                # 2. Try Russian
                try:
                    text = recognizer.recognize_google(audio_data, language='ru-RU')
                except sr.UnknownValueError:
                    # 3. Try English
                    try:
                        text = recognizer.recognize_google(audio_data, language='en-US')
                    except Exception:
                        text = ""
    except Exception as e:
        print(f"Recognition error: {e}", file=sys.stderr)
    finally:
        if os.path.exists(temp_wav):
            try:
                os.remove(temp_wav)
            except Exception:
                pass
                
    return text.strip()

if __name__ == '__main__':
    if len(sys.argv) > 1:
        audio_file = sys.argv[1]
        out_txt_file = sys.argv[2] if len(sys.argv) > 2 else None
        
        result = transcribe_audio(audio_file)
        
        # If output file specified, write UTF-8 directly
        if out_txt_file:
            with open(out_txt_file, 'w', encoding='utf-8') as f:
                f.write(result)
        
        # Also print to stdout
        print(result)
    else:
        print("Usage: python transcribe.py <audio_path> [output_txt_path]")
