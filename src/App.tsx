import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router'
import { UpdatePrompt } from './components/UpdatePrompt'
import HandList from './pages/HandList'
import HandPage from './pages/HandPage'

/** 換一手就重新掛載，狀態不會殘留 */
function HandRoute() {
  const { id } = useParams()
  return id ? <HandPage key={id} id={id} /> : <Navigate to="/" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      {/* 主畫面模式下狀態列是透明的，捲動的內容不要跑到它底下 */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-ink" />
      <UpdatePrompt />
      <Routes>
        <Route path="/" element={<HandList />} />
        <Route path="/hand/:id" element={<HandRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
