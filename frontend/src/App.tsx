import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import ProjectGeneratorPage from './pages/ProjectGeneratorPage'
import ReadmeGeneratorPage from './pages/ReadmeGeneratorPage'
import RegisterPage from './pages/RegisterPage'

function HomeRedirect() {
  const { isAuthenticated, isInitializing } = useAuth()

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          Checking your session...
        </div>
      </div>
    )
  }

  return <Navigate to={isAuthenticated ? '/projects/generate' : '/login'} replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/projects/generate"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ProjectGeneratorPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/readme/generate"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ReadmeGeneratorPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

