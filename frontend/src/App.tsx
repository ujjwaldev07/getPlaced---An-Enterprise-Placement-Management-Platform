import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/AppShell'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import { Loader2 } from 'lucide-react'

// Lazy load app and admin views for optimal bundle splitting and performance
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Profile = lazy(() => import('./pages/Profile'))
const Drives = lazy(() => import('./pages/Drives'))
const Applications = lazy(() => import('./pages/Applications'))
const Interviews = lazy(() => import('./pages/Interviews'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Resources = lazy(() => import('./pages/Resources'))
const SettingsPage = lazy(() => import('./pages/Settings'))

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminStudents = lazy(() => import('./pages/admin/AdminStudents'))
const AdminCompanies = lazy(() => import('./pages/admin/AdminCompanies'))
const AdminDrives = lazy(() => import('./pages/admin/AdminDrives'))
const AdminApplications = lazy(() => import('./pages/admin/AdminApplications'))
const AdminInterviews = lazy(() => import('./pages/admin/AdminInterviews'))
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'))
const AdminResources = lazy(() => import('./pages/admin/AdminResources'))

function PageFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<AppShell />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="profile" element={<Profile />} />
                <Route path="drives" element={<Drives />} />
                <Route path="applications" element={<Applications />} />
                <Route path="interviews" element={<Interviews />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="resources" element={<Resources />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute role="admin" />}>
              <Route path="/admin" element={<AppShell />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="students" element={<AdminStudents />} />
                <Route path="companies" element={<AdminCompanies />} />
                <Route path="drives" element={<AdminDrives />} />
                <Route path="applications" element={<AdminApplications />} />
                <Route path="interviews" element={<AdminInterviews />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="resources" element={<AdminResources />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  )
}
