import { HashRouter, Routes, Route } from 'react-router-dom'

import Landing from './pages/general/landing'
import Login from './pages/auth/login'

export default function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </HashRouter>
  )
}
