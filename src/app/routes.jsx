import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import ErrorBoundary from '@/components/ui/ErrorBoundary'

// Layouts
import PassengerLayout from '@/features/passenger/layouts/PassengerLayout'

// Eagerly loaded passenger pages
import HomePage from '@/features/passenger/pages/HomePage'
import SearchPage from '@/features/passenger/pages/SearchPage'
import ResultsPage from '@/features/passenger/pages/ResultsPage'
import JourneyPage from '@/features/passenger/pages/JourneyPage'
import LivePage from '@/features/passenger/pages/LivePage'
import NearbyPage from '@/features/passenger/pages/NearbyPage'
import RoutesPage from '@/features/passenger/pages/RoutesPage'
import RouteDetailPage from '@/features/passenger/pages/RouteDetailPage'
import StopDetailPage from '@/features/passenger/pages/StopDetailPage'
import SavedPage from '@/features/passenger/pages/SavedPage'
import ProfilePage from '@/features/passenger/pages/ProfilePage'
import HelpPage from '@/features/passenger/pages/HelpPage'
import ComplaintsPage from '@/features/passenger/pages/ComplaintsPage'
import AlertsPage from '@/features/passenger/pages/AlertsPage'

// Auth pages
import LoginPage from '@/features/passenger/pages/LoginPage'
import RegisterPage from '@/features/passenger/pages/RegisterPage'
import ForgotPasswordPage from '@/features/passenger/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/features/passenger/pages/ResetPasswordPage'
import PlaceholderPage from '@/components/ui/PlaceholderPage'

// Guards
import PublicRoute from '@/app/guards/PublicRoute'
import ProtectedRoute from '@/app/guards/ProtectedRoute'
import DriverRoute from '@/app/guards/DriverRoute'
import AdminRoute from '@/app/guards/AdminRoute'

// Lazy loaded driver components & pages (Driver portal)
const DriverLayout = lazy(() => import('@/features/driver/layouts/DriverLayout'))
const DriverStartPage = lazy(() => import('@/features/driver/pages/DriverStartPage'))
const DriverTripPage = lazy(() => import('@/features/driver/pages/DriverTripPage'))
const DriverHistoryPage = lazy(() => import('@/features/driver/pages/DriverHistoryPage'))

// Lazy loaded admin layout & pages
const AdminLayout = lazy(() => import('@/features/admin/layouts/AdminLayout'))
const AdminLoginPage = lazy(() => import('@/features/admin/pages/AdminLoginPage'))
const AdminDashboardPage = lazy(() => import('@/features/admin/pages/AdminDashboardPage'))
const AdminStopsPage = lazy(() => import('@/features/admin/pages/AdminStopsPage'))
const AdminRoutesPage = lazy(() => import('@/features/admin/pages/AdminRoutesPage'))
const AdminRouteEditorPage = lazy(() => import('@/features/admin/pages/AdminRouteEditorPage'))
const AdminSchedulesPage = lazy(() => import('@/features/admin/pages/AdminSchedulesPage'))
const AdminFaresPage = lazy(() => import('@/features/admin/pages/AdminFaresPage'))
const AdminFleetPage = lazy(() => import('@/features/admin/pages/AdminFleetPage'))
const AdminUsersPage = lazy(() => import('@/features/admin/pages/AdminUsersPage'))
const AdminLiveMonitorPage = lazy(() => import('@/features/admin/pages/AdminLiveMonitorPage'))
const AdminComplaintsPage = lazy(() => import('@/features/admin/pages/AdminComplaintsPage'))
const AdminAlertsPage = lazy(() => import('@/features/admin/pages/AdminAlertsPage'))
const AdminReportsPage = lazy(() => import('@/features/admin/pages/AdminReportsPage'))
const AdminImportPage = lazy(() => import('@/features/admin/pages/AdminImportPage'))
const AdminAuditPage = lazy(() => import('@/features/admin/pages/AdminAuditPage'))
const AdminSimulatorPage = lazy(() => import('@/features/admin/pages/AdminSimulatorPage'))

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[200px] bg-transparent">
    <div className="w-8 h-8 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
  </div>
)

const withBoundary = (element) => (
  <ErrorBoundary>
    <Suspense fallback={<LoadingFallback />}>
      {element}
    </Suspense>
  </ErrorBoundary>
)

export const router = createBrowserRouter([
  // Passenger Portal Layout
  {
    element: withBoundary(<PassengerLayout />),
    children: [
      {
        path: '/',
        element: withBoundary(<HomePage />),
      },
      {
        path: '/search',
        element: withBoundary(<SearchPage />),
      },
      {
        path: '/results',
        element: withBoundary(<ResultsPage />),
      },
      {
        path: '/journey',
        element: withBoundary(<JourneyPage />),
      },
      {
        path: '/live',
        element: withBoundary(<LivePage />),
      },
      {
        path: '/nearby',
        element: withBoundary(<NearbyPage />),
      },
      {
        path: '/routes',
        element: withBoundary(<RoutesPage />),
      },
      {
        path: '/routes/:id',
        element: withBoundary(<RouteDetailPage />),
      },
      {
        path: '/stops/:id',
        element: withBoundary(<StopDetailPage />),
      },
      {
        path: '/saved',
        element: withBoundary(<SavedPage />),
      },
      {
        path: '/complaints',
        element: withBoundary(<ComplaintsPage />),
      },
      {
        path: '/alerts',
        element: withBoundary(<AlertsPage />),
      },
      {
        path: '/profile',
        element: withBoundary(<ProfilePage />),
      },
      {
        path: '/help',
        element: withBoundary(<HelpPage />),
      },
    ],
  },

  // Auth Routes (outside passenger layout, wrapped in PublicRoute)
  {
    path: '/login',
    element: withBoundary(
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: '/register',
    element: withBoundary(
      <PublicRoute>
        <RegisterPage />
      </PublicRoute>
    ),
  },
  {
    path: '/forgot-password',
    element: withBoundary(
      <PublicRoute>
        <ForgotPasswordPage />
      </PublicRoute>
    ),
  },
  {
    path: '/reset-password',
    element: withBoundary(<ResetPasswordPage />),
  },

  // Driver Routes (Wrapped in DriverRoute & DriverLayout)
  {
    path: '/driver',
    element: withBoundary(
      <DriverRoute>
        <DriverLayout />
      </DriverRoute>
    ),
    children: [
      {
        index: true,
        element: <DriverStartPage />,
      },
      {
        path: 'trip',
        element: <DriverTripPage />,
      },
      {
        path: 'history',
        element: <DriverHistoryPage />,
      },
    ],
  },

  // Admin Login (standalone outside layout)
  {
    path: '/12345678/admin/login',
    element: withBoundary(<AdminLoginPage />),
  },

  // Admin Portal Layout (All protected admin routes)
  {
    path: '/12345678/admin',
    element: withBoundary(
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/12345678/admin/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <AdminDashboardPage />,
      },
      {
        path: 'stops',
        element: <AdminStopsPage />,
      },
      {
        path: 'routes',
        element: <AdminRoutesPage />,
      },
      {
        path: 'routes/new',
        element: <AdminRouteEditorPage />,
      },
      {
        path: 'routes/:id',
        element: <AdminRouteEditorPage />,
      },
      {
        path: 'schedules',
        element: <AdminSchedulesPage />,
      },
      {
        path: 'fares',
        element: <AdminFaresPage />,
      },
      {
        path: 'fleet',
        element: <AdminFleetPage />,
      },
      {
        path: 'users',
        element: <AdminUsersPage />,
      },
      {
        path: 'live',
        element: <AdminLiveMonitorPage />,
      },
      {
        path: 'complaints',
        element: <AdminComplaintsPage />,
      },
      {
        path: 'alerts',
        element: <AdminAlertsPage />,
      },
      {
        path: 'reports',
        element: <AdminReportsPage />,
      },
      {
        path: 'import',
        element: <AdminImportPage />,
      },
      {
        path: 'audit',
        element: <AdminAuditPage />,
      },
      {
        path: 'simulator',
        element: <AdminSimulatorPage />,
      },
    ],
  },

  // Fallback 404
  {
    path: '*',
    element: withBoundary(<PlaceholderPage title="Page Not Found" path="*" />),
  },
])
