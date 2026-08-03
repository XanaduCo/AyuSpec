import { Outlet, useLocation } from 'react-router-dom'
import Rail from './Rail.jsx'
import PostureHeader from './PostureHeader.jsx'
import { DrawerProvider } from '../components/Drawer.jsx'
import { CaptureProvider } from '../components/Capture.jsx'
import { SessionProvider } from '../state/store.js'

const TITLES = {
  '/now': 'Now',
  '/ask': 'Ask',
  '/timeline': 'Timeline',
  '/explore': 'Explore · the healthspan model',
  '/experiments': 'Experiments',
  '/data': 'Data sources',
  '/share': 'Share',
  '/transparency': 'Transparency',
  '/settings': 'Settings',
}

// The session overlay wraps everything: the drawer resolves records it created,
// capture writes into it, and every view reads `base mock + overlay` from it.
export default function AppShell() {
  const { pathname } = useLocation()
  const title = TITLES[pathname] || 'ayuOS'
  return (
    <SessionProvider>
      <DrawerProvider>
        <CaptureProvider>
          <div className="app">
            <Rail />
            <div className="main">
              <PostureHeader title={title} />
              <div className="content">
                <Outlet />
              </div>
            </div>
          </div>
        </CaptureProvider>
      </DrawerProvider>
    </SessionProvider>
  )
}
