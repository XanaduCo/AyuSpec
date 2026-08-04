import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './shell/AppShell.jsx'
import Now from './views/Now.jsx'
import Ask from './views/Ask.jsx'
import Timeline from './views/Timeline.jsx'
import Explore from './views/Explore.jsx'
import Experiments from './views/Experiments.jsx'
import Evidence from './views/Evidence.jsx'
import Companion from './views/Companion.jsx'
import Profile from './views/Profile.jsx'
import DataSources from './views/DataSources.jsx'
import Share from './views/Share.jsx'
import Transparency from './views/Transparency.jsx'
import Settings from './views/Settings.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Law 5: the app opens on Ask with the cursor ready, never a dashboard. */}
        <Route index element={<Navigate to="/ask" replace />} />
        <Route path="/now" element={<Now />} />
        <Route path="/ask" element={<Ask />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/experiments" element={<Experiments />} />
        <Route path="/evidence" element={<Evidence />} />
        <Route path="/companion" element={<Companion />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/data" element={<DataSources />} />
        <Route path="/share" element={<Share />} />
        <Route path="/transparency" element={<Transparency />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/ask" replace />} />
      </Route>
    </Routes>
  )
}
