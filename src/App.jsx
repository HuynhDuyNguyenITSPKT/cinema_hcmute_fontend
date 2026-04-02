import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import AppRouter from './router/AppRouter'
import AppNotificationModal from './components/AppNotificationModal'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <AppNotificationModal />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
