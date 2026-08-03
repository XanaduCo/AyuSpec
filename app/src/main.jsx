import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { PostureProvider } from './mock/posture.jsx'
import App from './App.jsx'
import './styles/tokens.css'
import './styles/app.css'

// HashRouter: the demo is served as static files by MkDocs at /demo/, with no
// server able to rewrite deep links — hash routing keeps every view reachable.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <PostureProvider>
        <App />
      </PostureProvider>
    </HashRouter>
  </StrictMode>
)
