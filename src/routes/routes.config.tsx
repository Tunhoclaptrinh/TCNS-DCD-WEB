import React, { lazy, Suspense } from "react";
import { RouteObject } from "react-router-dom";

// Layouts
import MainLayout from "@/layouts/MainLayout";
import AdminLayout from "@/layouts/AdminLayout";
import AuthLayout from "@/layouts/AuthLayout";
import Loading from "@/components/common/Loading";
import AuthGuard from "@/components/common/guards/AuthGuard";

// Lazy load pages
const Home = lazy(() => import("@/pages/Home"));
const Login = lazy(() => import("@/pages/Auth"));

// Profile Pages
const Profile = lazy(() => import("@/pages/Profile/Profile"));
const FavoritesPage = lazy(() => import("@/pages/Profile/FavoritesPage"));
const NotificationsPage = lazy(() => import("@/pages/Notifications"));

const NotFound = lazy(() => import("@/pages/NotFound"));
const Support = lazy(() => import("@/pages/Support"));


// Admin/Manager Pages (DataTables)
const Dashboard = lazy(() => import("@/pages/Dashboard/DashboardMain"));
const UserManagement = lazy(() => import("@/pages/Users"));



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
      {
        path: "favorites",
        element: <FavoritesPage />,
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

  // ============ ADMIN ROUTES ============
  {
    path: "/admin",
    element: (
      <AuthGuard requireAuth={true} requiredRoles={["admin"]}>
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
