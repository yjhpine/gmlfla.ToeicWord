/** 브라우저 Web Speech API로 영어 TTS */

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const preferred =
    voices.find((v) => v.lang === "en-US" && /google|premium|enhanced/i.test(v.name)) ??
    voices.find((v) => v.lang === "en-US") ??
    voices.find((v) => v.lang.startsWith("en"));

  return preferred ?? null;
}

export function speakEnglish(text: string): void {
  if (!canSpeak() || !text.trim()) return;

  const utterance = new SpeechSynthesisUtterance(text.trim());
  utterance.lang = "en-US";
  utterance.rate = 0.9;

  const voice = pickEnglishVoice();
  if (voice) utterance.voice = voice;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

/** 일부 브라우저는 voices를 비동기로 로드함 */
export function warmUpVoices(): void {
  if (!canSpeak()) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    window.speechSynthesis.getVoices();
  }, { once: true });
}
