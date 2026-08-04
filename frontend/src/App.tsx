import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './hooks/useAuth'
import ApiDocumentationPage from './pages/ApiDocumentationPage'
import BugDebuggerPage from './pages/BugDebuggerPage'
import CodeExplainerPage from './pages/CodeExplainerPage'
import CodeReviewPage from './pages/CodeReviewPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LoginPage from './pages/LoginPage'
import ProjectGeneratorPage from './pages/ProjectGeneratorPage'
import ReadmeGeneratorPage from './pages/ReadmeGeneratorPage'
import RegisterPage from './pages/RegisterPage'
import RepositoryAnalyzerPage from './pages/RepositoryAnalyzerPage'
import RepositoryChatPage from './pages/RepositoryChatPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
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
        <Route
          path="/explain"
          element={
            <ProtectedRoute>
              <AppLayout>
                <CodeExplainerPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
<Route
          path="/code/review"
          element={
            <ProtectedRoute>
              <AppLayout>
                <CodeReviewPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/debug"
          element={
            <ProtectedRoute>
              <AppLayout>
                <BugDebuggerPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/documentation"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ApiDocumentationPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/repository/analyze"
          element={
            <ProtectedRoute>
              <AppLayout>
                <RepositoryAnalyzerPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/repository/:analysisId/chat"
          element={
            <ProtectedRoute>
              <AppLayout>
                <RepositoryChatPage />
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

