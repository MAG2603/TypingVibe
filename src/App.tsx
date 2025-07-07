import { useState, useRef, useEffect } from 'react'
import './App.css'

// Helper untuk generate kata acak (sementara, bisa diganti dengan wordlist lebih baik)
const WORDS = [
  'kucing', 'anjing', 'rumah', 'mobil', 'jalan', 'pohon', 'air', 'api', 'tanah', 'langit',
  'buku', 'meja', 'kursi', 'komputer', 'laptop', 'monitor', 'keyboard', 'mouse', 'layar', 'kamera',
  'musik', 'lagu', 'suara', 'gambar', 'warna', 'gelap', 'terang', 'malam', 'siang', 'pagi',
  'senja', 'awan', 'hujan', 'angin', 'salju', 'panas', 'dingin', 'lembab', 'kering', 'basah',
]
function getRandomWords(count: number) {
  return Array.from({ length: count }, () => WORDS[Math.floor(Math.random() * WORDS.length)])
}

// State utama aplikasi
const WORDS_PER_LINE = 14
const TEST_DURATION = 60 // detik

type TestStatus = 'idle' | 'running' | 'finished'

type Result = {
  wpm: number
  accuracy: number
  correct: number
  incorrect: number
}

// Komponen animasi typing tagline
function TypingTagline() {
  const text = 'Tingkatkan kecepatan dan keakuratan anda dalam mengetik sekarang'
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'typing' | 'deleting'>('typing')

  useEffect(() => {
    let timeout: number | undefined
    if (phase === 'typing') {
      if (index < text.length) {
        timeout = window.setTimeout(() => setIndex(index + 1), 180)
      } else if (index === text.length) {
        timeout = window.setTimeout(() => setPhase('deleting'), 1500)
      }
    } else if (phase === 'deleting') {
      if (index > 0) {
        timeout = window.setTimeout(() => setIndex(index - 1), 90)
      } else if (index === 0) {
        timeout = window.setTimeout(() => setPhase('typing'), 1500)
      }
    }
    return () => { if (timeout) clearTimeout(timeout) }
  }, [index, phase, text])

  // Reset index ke 0 saat mulai typing baru
  useEffect(() => {
    if (phase === 'typing' && index === 0) {
      setIndex(0)
    }
  }, [phase])

  return (
    <span className="typingvibe-tagline typingvibe-tagline-animated">
      {text.slice(0, index)}
      {/* Caret selalu tampil saat mengetik dan saat penuh */}
      {(phase === 'typing' || (phase === 'deleting' && index === text.length)) && <span className="typing-caret">|</span>}
    </span>
  )
}

function AboutModal({ open, onClose }: { open: boolean, onClose: () => void }) {
  if (!open) return null
  return (
    <div className="about-modal-backdrop" onClick={onClose}>
      <div className="about-modal-card" onClick={e => e.stopPropagation()}>
        <img
          src="https://api.um.ac.id/akademik/operasional/GetFoto.ptikUM?nim=230213600320&angkatan=2023"
          alt="Foto Developer"
          className="about-modal-photo"
        />
        <div className="about-modal-name">Mohammad Affan Ghoffar</div>
        <button className="about-modal-close" onClick={onClose}>Tutup</button>
      </div>
    </div>
  )
}

function App() {
  // State utama: hanya satu baris kata yang tampil
  const [lineWords, setLineWords] = useState<string[]>(getRandomWords(WORDS_PER_LINE))
  const [input, setInput] = useState<string>('')
  const [caretPos, setCaretPos] = useState(0)
  const [status, setStatus] = useState<TestStatus>('idle')
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION)
  const [result, setResult] = useState<Result | null>(null)
  const [history, setHistory] = useState<{line: string, input: string}[]>([])
  const [aboutOpen, setAboutOpen] = useState(false)

  // Refs untuk interval timer, dsb (akan dipakai di langkah berikutnya)
  const timerRef = useRef<number | null>(null)

  // Fokus otomatis
  const inputRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => { if (inputRef.current) inputRef.current.focus() }, [])

  // Mulai timer saat input pertama
  useEffect(() => {
    if (status === 'running' && timerRef.current === null) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            setStatus('finished');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);

  // Hitung hasil saat selesai
  useEffect(() => {
    if (status === 'finished' && result === null) {
      const allTarget = history.map(h => h.line).join(' ') + ' ' + lineWords.join(' ')
      const allInput = history.map(h => h.input).join(' ') + ' ' + input
      let correct = 0
      for (let i = 0; i < allInput.length; i++) {
        if (allInput[i] === allTarget[i]) correct++
      }
      const totalTyped = allInput.length
      const accuracy = totalTyped > 0 ? Math.round((correct / totalTyped) * 100) : 0
      const minutes = (TEST_DURATION - timeLeft) / 60
      const wpm = minutes > 0 ? Math.round((totalTyped / 5) / (minutes || 1/60)) : 0
      setResult({ wpm, accuracy, correct, incorrect: totalTyped - correct })
    }
  }, [status, result, input, lineWords, history, timeLeft])

  // Hitung metrik real-time
  function getLiveMetrics() {
    const allTarget = history.map(h => h.line).join(' ') + ' ' + lineWords.join(' ')
    const allInput = history.map(h => h.input).join(' ') + ' ' + input
    let correct = 0
    for (let i = 0; i < allInput.length; i++) {
      if (allInput[i] === allTarget[i]) correct++
    }
    const totalTyped = allInput.length
    const accuracy = totalTyped > 0 ? Math.round((correct / totalTyped) * 100) : 0
    const minutes = (TEST_DURATION - timeLeft) / 60
    const wpm = minutes > 0 ? Math.round((totalTyped / 5) / (minutes || 1/60)) : 0
    return { wpm, accuracy, correct, incorrect: totalTyped - correct }
  }

  const liveMetrics = getLiveMetrics()

  // Otomatis lanjut ke baris baru jika semua karakter sudah diketik
  useEffect(() => {
    if (
      status === 'running' &&
      input.length === lineWords.join(' ').length
    ) {
      // Simpan hasil baris yang sudah diketik
      setHistory(prev => [...prev, { line: lineWords.join(' '), input }])
      // Generate baris baru dan reset input
      setLineWords(getRandomWords(WORDS_PER_LINE))
      setInput('')
      setCaretPos(0)
    }
    // eslint-disable-next-line
  }, [input, status, lineWords])

  // Handler keyboard
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (status === 'finished') return
    if (status === 'idle') setStatus('running')
    if (e.key.length === 1 && /[a-zA-Z0-9\u00C0-\u024F ]/.test(e.key)) {
      if (input.length < lineWords.join(' ').length) {
        setInput(prev => prev + e.key)
        setCaretPos(pos => pos + 1)
      }
    } else if (e.key === 'Backspace') {
      setInput(prev => prev.slice(0, -1))
      setCaretPos(pos => (pos > 0 ? pos - 1 : 0))
    } else if (e.key === ' ' && input.length === lineWords.join(' ').length) {
      // Jika baris selesai, lanjut ke baris baru
      nextLine()
    }
  }

  // Lanjut ke baris baru
  function nextLine() {
    setHistory(prev => [...prev, { line: lineWords.join(' '), input }])
    setLineWords(getRandomWords(WORDS_PER_LINE))
    setInput('')
    setCaretPos(0)
  }

  // Tombol ulangi
  function handleRestart() {
    setLineWords(getRandomWords(WORDS_PER_LINE))
    setInput('')
    setCaretPos(0)
    setStatus('idle')
    setTimeLeft(TEST_DURATION)
    setResult(null)
    setHistory([])
    setTimeout(() => { if (inputRef.current) inputRef.current.focus() }, 50)
  }

  // Render satu baris kata dengan jarak antar kata
  function renderLine() {
    let charIdx = 0
    return lineWords.map((word, wIdx) => {
      const wordChars = word.split('').map((char) => {
        let className = 'word-char'
        if (input[charIdx]) {
          className += input[charIdx] === char ? ' correct' : ' incorrect'
        } else if (charIdx === caretPos && status !== 'finished') {
          className += ' caret'
        }
        const el = <span key={charIdx} className={className}>{char}</span>
        charIdx++
        return el
      })
      // Tambahkan spasi visual antar kata (kecuali kata terakhir)
      const spaceIdx = charIdx
      let spaceEl = null
      if (wIdx < lineWords.length - 1) {
        let className = 'word-space'
        if (input[spaceIdx]) {
          className += input[spaceIdx] === ' ' ? ' correct' : ' incorrect'
        } else if (spaceIdx === caretPos && status !== 'finished') {
          className += ' caret'
        }
        spaceEl = <span key={'space-' + spaceIdx} className={className}>&nbsp;</span>
        charIdx++
      }
      return <span className="word" key={'word-' + wIdx}>{wordChars}{spaceEl}</span>
    })
  }

  return (
    <div className="typingvibe-modern-container">
      <div className="typingvibe-header">
        <h1>TypingVibe</h1>
        <TypingTagline />
        <button className="about-toggle-btn" onClick={() => setAboutOpen(true)}>About</button>
      </div>
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <div className="modern-words-area-wrapper">
        <div className="modern-words-area"
          tabIndex={0}
          ref={inputRef}
          onKeyDown={handleKeyDown}
          style={{ outline: 'none', minHeight: 110, cursor: 'text', userSelect: 'none', letterSpacing: '0.04em', position: 'relative' }}
        >
          {renderLine()}
        </div>
      </div>
      <div className="result-summary always-show">
        <div className="typingvibe-timer-card">Sisa Waktu: {timeLeft}s</div>
        <div className="metrics-group">
          <div className="metric-item wpm">
            <span className="metric-icon">⏱️</span>
            <span>{liveMetrics.wpm}</span>
            <span className="metric-label">WPM</span>
          </div>
          <div className="metric-item accuracy">
            <span className="metric-icon">🎯</span>
            <span>{liveMetrics.accuracy}%</span>
            <span className="metric-label">Akurasi</span>
          </div>
          <div className="metric-item correct">
            <span className="metric-icon">✔️</span>
            <span>{liveMetrics.correct}</span>
            <span className="metric-label">Benar</span>
          </div>
          <div className="metric-item incorrect">
            <span className="metric-icon">❌</span>
            <span>{liveMetrics.incorrect}</span>
            <span className="metric-label">Salah</span>
          </div>
        </div>
        <button onClick={handleRestart}>Ulangi Tes</button>
      </div>
    </div>
  )
}

export default App
