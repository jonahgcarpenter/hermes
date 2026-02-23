import { HashRouter, Routes, Route } from 'react-router-dom'

import Layout from './components/general/layout'
import ProtectedRoute from './components/auth/protectedRoute'
import Landing from './pages/general/landing'
import Login from './pages/auth/login'
import ServerPage from './pages/server/serverPage'
import ServerLayout from './components/servers/general/serverLayout'

export default function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/servers/:serverId" element={<ServerLayout />}>
              <Route path="channels/:channelId" element={<ServerPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  )
}
