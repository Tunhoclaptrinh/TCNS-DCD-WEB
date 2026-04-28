import React, { lazy, Suspense } from "react";
import { RouteObject } from "react-router-dom";

// Layouts
import MainLayout from "@/layouts/MainLayout";
import AdminLayout from "@/layouts/AdminLayout";
import AuthLayout from "@/layouts/AuthLayout";
import Loading from "@/components/common/Loading";
import AuthGuard from "@/components/common/guards/AuthGuard";
const CustomerLayout = lazy(() => import("@/layouts/CustomerLayout"));

// Lazy load pages
const Home = lazy(() => import("@/pages/Home"));
const Login = lazy(() => import("@/pages/Auth"));

// Profile Pages
const Profile = lazy(() => import("@/pages/Profile/Profile/index"));
const NotificationsPage = lazy(() => import("@/pages/Notifications"));

const NotFound = lazy(() => import("@/pages/NotFound"));
const Support = lazy(() => import("@/pages/Support"));


// Admin/Manager Pages (DataTables)
const Dashboard = lazy(() => import("@/pages/Dashboard/DashboardMain"));
const UserManagement = lazy(() => import("@/pages/Users"));
const DutyLayout = lazy(() => import("@/pages/Duty"));
const DutyCalendar = lazy(() => import("@/pages/Duty/Admin/AdminDutyCalendar"));
const DutyManagement = lazy(() => import("@/pages/Duty/Admin/Management"));
const LeaveRequests = lazy(() => import("@/pages/Duty/Admin/LeaveRequests"));
const SwapRequests = lazy(() => import("@/pages/Duty/Admin/SwapRequests"));
const DutyStatistics = lazy(() => import("@/pages/Duty/Admin/Statistics"));
const SystemConfig = lazy(() => import("@/pages/SystemConfig"));
const Permissions = lazy(() => import("@/pages/Permissions"));
const Roles = lazy(() => import("@/pages/Roles"));

// ... (rest of the lazy loads)

// Member Duty Pages
const MemberDashboard = lazy(() => import("@/pages/Duty/Member/PersonalDashboard"));
const MemberCalendar = lazy(() => import("@/pages/Duty/Member/MemberCalendar"));
const MemberRequests = lazy(() => import("@/pages/Duty/Member/MyRequests"));



// Wrapper component for Suspense
const LazyLoadWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <Suspense fallback={<Loading fullScreen />}>{children}</Suspense>;

const routes: RouteObject[] = [
  // ============ AUTH ROUTES ============
  {
    path: "/login",
    element: (
      <LazyLoadWrapper>
        <AuthLayout />
      </LazyLoadWrapper>
    ),
    children: [
      {
        index: true,
        element: <Login />,
      },
    ],
  },
  {
    path: "/register",
    element: (
      <LazyLoadWrapper>
        <AuthLayout />
      </LazyLoadWrapper>
    ),
    children: [
      {
        index: true,
        element: <Login />,
      },
    ],
  },

  // ============ PUBLIC ROUTES ============
  {
    path: "/",
    element: (
      <LazyLoadWrapper>
        <MainLayout />
      </LazyLoadWrapper>
    ),
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "support",
        element: <Support />,
      },
    ],
  },

  // ============ PROTECTED USER ROUTES ============
  {
    path: "/profile",
    element: (
      <AuthGuard requireAuth={true}>
        <LazyLoadWrapper>
          <MainLayout />
        </LazyLoadWrapper>
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <Profile />,
      },
    ],
  },

  // ============ NOTIFICATIONS ============
  {
    path: "/notifications",
    element: (
      <AuthGuard requireAuth={true}>
        <LazyLoadWrapper>
          <MainLayout />
        </LazyLoadWrapper>
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <NotificationsPage />,
      },
    ],
  },

  // ============ MEMBER DUTY ROUTES ============
  {
    path: "/duty",
    element: (
      <AuthGuard requireAuth={true}>
        <LazyLoadWrapper>
          <CustomerLayout />
        </LazyLoadWrapper>
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <MemberDashboard />,
      },
      {
        path: "dashboard",
        element: <MemberDashboard />,
      },
      {
        path: "calendar",
        element: <MemberCalendar />,
      },
      {
        path: "requests",
        element: <MemberRequests />,
      },
    ],
  },

  // ============ ADMIN ROUTES ============
  {
    path: "/admin",
    element: (
      <AuthGuard requireAuth={true} requiredRoles={["admin", "staff"]}>
        <LazyLoadWrapper>
          <AdminLayout />
        </LazyLoadWrapper>
      </AuthGuard>
    ),
    children: [
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "users",
        element: <UserManagement />,
      },
      {
        path: "duty",
        element: <DutyLayout />,
        children: [
          {
            index: true,
            element: <DutyCalendar />,
          },
          {
            path: "calendar",
            element: <DutyCalendar />,
          },
          {
            path: "setup",
            element: <DutyManagement />,
          },
          {
            path: "leave",
            element: <LeaveRequests />,
          },
          {
            path: "swaps",
            element: <SwapRequests />,
          },
        ]
      },
      {
        path: "statistics",
        element: <DutyStatistics />,
      },
      {
        path: "system-config",
        children: [
          {
            index: true,
            element: <SystemConfig />,
          },
          {
            path: "generations",
            element: <SystemConfig />,
          },
          {
            path: "permissions",
            element: <Permissions />,
          },
          {
            path: "roles",
            element: <Roles />,
          },
        ]
      },
    ],
  },

  // ============ 404 ============
  {
    path: "*",
    element: (
      <LazyLoadWrapper>
        <NotFound />
      </LazyLoadWrapper>
    ),
  },
];

export default routes;
