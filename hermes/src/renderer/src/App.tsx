import { HashRouter, Routes, Route } from 'react-router-dom'

import Layout from './componenets/general/layout'
import Landing from './pages/general/landing'
import Login from './pages/auth/login'
import ServerInfo from './pages/server/info'

export default function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          {/* TODO: Middleware */}
          <Route path="/servers/:serverId" element={<ServerInfo />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
