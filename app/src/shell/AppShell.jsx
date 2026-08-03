import { Outlet, useLocation } from 'react-router-dom'
import Rail from './Rail.jsx'
import PostureHeader from './PostureHeader.jsx'
import { DrawerProvider } from '../components/Drawer.jsx'

const TITLES = {
  '/ask': 'Ask',
  '/timeline': 'Timeline',
  '/explore': 'Explore · the healthspan model',
  '/experiments': 'Experiments',
  '/data': 'Data sources',
  '/share': 'Share',
  '/transparency': 'Transparency',
  '/settings': 'Settings',
}

export default function AppShell() {
  const { pathname } = useLocation()
  const title = TITLES[pathname] || 'ayuOS'
  return (
    <DrawerProvider>
      <div className="app">
        <Rail />
        <div className="main">
          <PostureHeader title={title} />
          <div className="content">
            <Outlet />
          </div>
        </div>
      </div>
    </DrawerProvider>
  )
}
