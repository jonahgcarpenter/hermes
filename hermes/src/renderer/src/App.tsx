import { HashRouter, Routes, Route } from 'react-router-dom'

import Layout from './componenets/general/layout'
import Landing from './pages/general/landing'
import Login from './pages/auth/login'

export default function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
