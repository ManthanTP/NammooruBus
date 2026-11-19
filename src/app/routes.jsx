import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
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

// Lazy loaded admin pages
const AdminLoginPage = lazy(() => import('@/features/admin/pages/AdminLoginPage'))
const AdminDashboardPage = lazy(() => import('@/features/admin/pages/AdminDashboardPage'))
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
  // Passenger Portal Layout (Single Persistent Leaflet Map)
  {
    element: withBoundary(<PassengerLayout />),
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        path: '/search',
        element: <SearchPage />,
      },
      {
        path: '/results',
        element: <ResultsPage />,
      },
      {
        path: '/journey',
        element: <JourneyPage />,
      },
      {
        path: '/live',
        element: <LivePage />,
      },
      {
        path: '/nearby',
        element: <NearbyPage />,
      },
      {
        path: '/routes',
        element: <RoutesPage />,
      },
      {
        path: '/routes/:id',
        element: <RouteDetailPage />,
      },
      {
        path: '/stops/:id',
        element: <StopDetailPage />,
      },
      {
        path: '/saved',
        element: <SavedPage />,
      },
      {
        path: '/complaints',
        element: <PlaceholderPage title="Complaints & Feedback" path="/complaints" />,
      },
      {
        path: '/alerts',
        element: <PlaceholderPage title="Service Alerts" path="/alerts" />,
      },
      {
        path: '/profile',
        element: <ProfilePage />,
      },
      {
        path: '/help',
        element: <HelpPage />,
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

  // Admin Routes (Lazy loaded + AdminRoute)
  {
    path: '/12345678/admin/login',
    element: withBoundary(<AdminLoginPage />),
  },
  {
    path: '/12345678/admin/dashboard',
    element: withBoundary(
      <AdminRoute>
        <AdminDashboardPage />
      </AdminRoute>
    ),
  },
  {
    path: '/12345678/admin/stops',
    element: withBoundary(
      <AdminRoute>
        <PlaceholderPage title="Admin: Stops" path="/12345678/admin/stops" role="admin" />
      </AdminRoute>
    ),
  },
  {
    path: '/12345678/admin/routes',
    element: withBoundary(
      <AdminRoute>
        <PlaceholderPage title="Admin: Routes" path="/12345678/admin/routes" role="admin" />
      </AdminRoute>
    ),
  },
  {
    path: '/12345678/admin/routes/:id',
    element: withBoundary(
      <AdminRoute>
        <PlaceholderPage title="Admin: Route Edit" path="/12345678/admin/routes/:id" role="admin" />
      </AdminRoute>
    ),
  },
  {
    path: '/12345678/admin/schedules',
    element: withBoundary(
      <AdminRoute>
        <PlaceholderPage title="Admin: Schedules" path="/12345678/admin/schedules" role="admin" />
      </AdminRoute>
    ),
  },
  {
    path: '/12345678/admin/fares',
    element: withBoundary(
      <AdminRoute>
        <PlaceholderPage title="Admin: Fares" path="/12345678/admin/fares" role="admin" />
      </AdminRoute>
    ),
  },
  {
    path: '/12345678/admin/fleet',
    element: withBoundary(
      <AdminRoute>
        <PlaceholderPage title="Admin: Fleet" path="/12345678/admin/fleet" role="admin" />
      </AdminRoute>
    ),
  },
  {
    path: '/12345678/admin/users',
    element: withBoundary(
      <AdminRoute>
        <PlaceholderPage title="Admin: Users & Roles" path="/12345678/admin/users" role="admin" />
      </AdminRoute>
    ),
  },
  {
    path: '/12345678/admin/live',
    element: withBoundary(
      <AdminRoute>
        <PlaceholderPage title="Admin: Live Monitor" path="/12345678/admin/live" role="admin" />
      </AdminRoute>
    ),
  },
  {
    path: '/12345678/admin/complaints',
    element: withBoundary(
      <AdminRoute>
        <PlaceholderPage title="Admin: Complaints" path="/12345678/admin/complaints" role="admin" />
      </AdminRoute>
    ),
  },
  {
    path: '/12345678/admin/alerts',
    element: withBoundary(
      <AdminRoute>
        <PlaceholderPage title="Admin: Alerts" path="/12345678/admin/alerts" role="admin" />
      </AdminRoute>
    ),
  },
  {
    path: '/12345678/admin/reports',
    element: withBoundary(
      <AdminRoute>
        <PlaceholderPage title="Admin: Reports" path="/12345678/admin/reports" role="admin" />
      </AdminRoute>
    ),
  },
  {
    path: '/12345678/admin/import',
    element: withBoundary(
      <AdminRoute>
        <PlaceholderPage title="Admin: CSV Import" path="/12345678/admin/import" role="admin" />
      </AdminRoute>
    ),
  },
  {
    path: '/12345678/admin/audit',
    element: withBoundary(
      <AdminRoute>
        <PlaceholderPage title="Admin: Audit Logs" path="/12345678/admin/audit" role="admin" />
      </AdminRoute>
    ),
  },
  {
    path: '/12345678/admin/simulator',
    element: withBoundary(
      <AdminRoute>
        <AdminSimulatorPage />
      </AdminRoute>
    ),
  },

  // Fallback 404
  {
    path: '*',
    element: withBoundary(<PlaceholderPage title="Page Not Found" path="*" />),
  },
])
