import { useState, useRef, useEffect } from 'react'

// A reusable mic control. In the demo it "transcribes" a canned phrase, typed
// out to feel live, and is explicitly labelled on-device — voice never implies
// egress here (the open question of cloud STT is flagged in the spec, not taken).

const CANNED = [
  'What changed in my last 90 days?',
  'Should I take NMN?',
  'Am I at risk for heart disease?',
]

export default function VoiceInput({ onTranscript }) {
  const [listening, setListening] = useState(false)
  const [partial, setPartial] = useState('')
  const idx = useRef(0)
  const timer = useRef(null)

  useEffect(() => () => clearInterval(timer.current), [])

  const start = () => {
    if (listening) { stop(); return }
    const phrase = CANNED[idx.current % CANNED.length]
    idx.current++
    setListening(true)
    setPartial('')
    let i = 0
    clearInterval(timer.current)
    timer.current = setInterval(() => {
      i += 1
      setPartial(phrase.slice(0, i))
      if (i >= phrase.length) {
        clearInterval(timer.current)
        setTimeout(() => { setListening(false); setPartial(''); onTranscript(phrase) }, 350)
      }
    }, 32)
  }

  const stop = () => {
    clearInterval(timer.current)
    setListening(false)
    setPartial('')
  }

  return (
    <>
      {listening && partial && <span className="voice-partial mono">{partial}<span className="caret">▍</span></span>}
      <span
        className={`pill local clickable ${listening ? 'live' : ''}`}
        title="Voice input — transcribed on-device. No audio leaves the machine."
        role="button"
        tabIndex={0}
        onClick={start}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), start())}
      >
        <span className="led" />🎙 {listening ? 'listening…' : 'voice'}
      </span>
    </>
  )
}
