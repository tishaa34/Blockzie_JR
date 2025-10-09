// src/utils/soundUtils.js
// 🔊 Sound utilities extracted from runScript.js (no logic changed)

//
// Plays a custom audio clip from a block's soundData or audioURL.
//
export async function playCustomSound(block) {
  try {
    const audio = new Audio(block.soundData?.audioURL || block.audioURL);
    audio.volume = 0.7;
    await audio.play();
  } catch (err) {
    console.error("Error playing sound:", err);
  }
}

//
// Plays a generated tone at a given frequency for a duration.
//
export function playFrequencySound(frequency = 440, duration = 300) {
  return new Promise((resolve) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const mappedFreq = 300 + ((frequency - 1) * 12);
      oscillator.frequency.setValueAtTime(mappedFreq, audioContext.currentTime);
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + duration / 1000
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
      oscillator.onended = resolve;
    } catch (err) {
      console.error("🔊 Error playing frequency sound:", err);
      resolve();
    }
  });
}

//
// Plays a "pop" sound using multiple possible sources.
//
export async function playPopSound(sounds) {
  const popSources = [
    sounds?.pop,
    "./assets/sounds/pop.mp3",
    "assets/sounds/pop.mp3",
    "/assets/sounds/pop.mp3",
    "sounds/pop.mp3",
  ];

  for (const src of popSources) {
    if (src) {
      try {
        const audio = new Audio(src);
        audio.volume = 0.8;
        await audio.play();
        return;
      } catch {
        continue;
      }
    }
  }

  // Fallback: use frequency tone
  await playFrequencySound(800, 200);
}
