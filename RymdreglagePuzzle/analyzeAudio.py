"""Analyse spectrale rapide d'un mp3 (nécessite ffmpeg + numpy).

Usage : python -I analyzeAudio.py "chemin/fichier.mp3" [dossier_sortie]
Produit dans dossier_sortie (défaut : dossier courant) :
  - spec.png : spectrogramme (fréquences log)
et affiche : durée, stéréo (mid/side/corr), pics de fréquence moyens (avec note),
énergie par bande, périodes de modulation lente de l'enveloppe.
"""
import os
import subprocess
import sys
import tempfile

import numpy as np

NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
SR = 48000


def note_name(freq):
    n = int(round(69 + 12 * np.log2(freq / 440)))
    return NOTES[n % 12] + str(n // 12 - 1)


def main(path, out_dir="."):
    os.makedirs(out_dir, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-lavfi",
                    "showspectrumpic=s=1600x700:legend=1:scale=log:fscale=log",
                    os.path.join(out_dir, "spec.png")], check=True)
    with tempfile.TemporaryDirectory() as tmp:
        raw = os.path.join(tmp, "st.raw")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-f", "f32le",
                        "-ac", "2", "-ar", str(SR), raw], check=True)
        x = np.fromfile(raw, dtype=np.float32).reshape(-1, 2)
    left, right = x[:, 0], x[:, 1]
    mid, side = (left + right) / 2, (left - right) / 2
    print("durée (s):", len(x) / SR)
    print("rms mid:", np.sqrt((mid ** 2).mean()), "rms side:", np.sqrt((side ** 2).mean()),
          "corr L/R:", np.corrcoef(left, right)[0, 1])

    size = 1 << 16
    win = np.hanning(size)
    acc = np.zeros(size // 2 + 1)
    for i in range(0, len(mid) - size, size):
        acc += np.abs(np.fft.rfft(mid[i:i + size] * win)) ** 2
    freqs = np.fft.rfftfreq(size, 1 / SR)
    acc /= acc.max()
    peaks = [i for i in range(2, len(acc) - 2)
             if acc[i] > acc[i - 1] and acc[i] > acc[i + 1] and freqs[i] > 25]
    print("pics (Hz, note, dB rel.):")
    for i in sorted(sorted(peaks, key=lambda i: -acc[i])[:25]):
        print(" ", round(freqs[i], 1), note_name(freqs[i]), round(10 * np.log10(acc[i]), 1))

    print("énergie par bande (dB rel.):")
    for lo, hi in [(20, 100), (100, 500), (500, 2000), (2000, 8000), (8000, 16000), (16000, 24000)]:
        band = (freqs >= lo) & (freqs < hi)
        print(" ", lo, hi, round(10 * np.log10(acc[band].sum() + 1e-20), 1))

    env = np.sqrt(np.convolve(mid ** 2, np.ones(2400) / 2400, "same"))[::2400]
    env = env - env.mean()
    spec = np.abs(np.fft.rfft(env * np.hanning(len(env))))
    mod_freqs = np.fft.rfftfreq(len(env), 0.05)
    print("modulations lentes (période en s):")
    for i in np.argsort(-spec[1:])[:5] + 1:
        print(" ", round(1 / mod_freqs[i], 1))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else ".")
