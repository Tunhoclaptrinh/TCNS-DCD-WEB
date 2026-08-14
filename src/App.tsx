import React, { useEffect, useState, useLayoutEffect } from "react";
import { useDispatch } from "react-redux";
import { useAppSelector } from "./store/hooks";
import { useRoutes, useNavigate } from "react-router-dom";
import { ConfigProvider, theme as antdTheme, App as AntApp } from "antd";
import viVN from "antd/locale/vi_VN";
import { forceLogout, initializeAuth } from "./store/slices/authSlice";
import routes from "./routes/routes.config";
import Loading from "./components/common/Loading";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { ToastProvider } from "./components/common/Toast";
import { STORAGE_KEYS } from "./config/constants";

const App: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const routing = useRoutes(routes);
  const [dynamicPrimary, setDynamicPrimary] = useState<string>("#8b1d1d");

  const { isInitialized, loading } = useAppSelector((state) => state.auth);
  const { theme: uiTheme } = useAppSelector((state) => state.ui);

  // Dynamically resolve --primary-color from CSS root styles
  useLayoutEffect(() => {
    const readCssColor = () => {
      const computed = getComputedStyle(document.documentElement)
        .getPropertyValue("--primary-color")
        .trim();
      if (computed && computed !== dynamicPrimary) {
        setDynamicPrimary(computed);
      }
    };
    readCssColor();
    const observer = new MutationObserver(readCssColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
    return () => observer.disconnect();
  }, [dynamicPrimary]);

  // Initialize Auth on Mount
  useEffect(() => {
    dispatch(initializeAuth() as any);
  }, [dispatch]);

  // Listen for Storage Changes (Multi-tab Logout)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.TOKEN && !e.newValue) {
        dispatch(forceLogout());
        navigate("/login");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [dispatch, navigate]);

  // Show Loading Screen During Initialization
  if (!isInitialized || loading) {
    return <Loading fullScreen message="Đang khởi tạo..." />;
  }

  const primaryColor = dynamicPrimary;
  const controlOutline = "color-mix(in srgb, var(--primary-color) 20%, transparent)";

  return (
    <ErrorBoundary>
      <ConfigProvider
        locale={viVN}
        theme={{
          algorithm:
            uiTheme === "dark"
              ? antdTheme.darkAlgorithm
              : antdTheme.defaultAlgorithm,
          token: {
            // Theme Colors
            colorPrimary: primaryColor,
            colorLink: primaryColor,
            controlOutline: controlOutline,
            colorSuccess: "#22C55E",
            colorWarning: "#F97316",
            colorError: "#EF4444",
            colorInfo: "#0284c7",

            // Border & Radius
            borderRadius: 8,
            borderRadiusLG: 12,
            borderRadiusSM: 6,

            // Typography
            fontFamily:
              "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: 14,

            // Spacing
            padding: 16,
            margin: 16,
          },
          components: {
            Alert: {
              colorInfoBg: "#f8fafc",
              colorInfoBorder: "#e2e8f0",
              colorInfoText: "#1e293b",
            },
            Tag: {
              borderRadiusSM: 4,
              fontSize: 12,
            },
            Button: {
              controlHeight: 32,
              fontSize: 14,
              borderRadius: 8,
              primaryColor: "#FFFFFF",
              colorPrimary: primaryColor,
            },
            Input: {
              controlHeight: 32,
              fontSize: 14,
              borderRadius: 8,
              activeBorderColor: primaryColor,
              hoverBorderColor: primaryColor,
              activeShadow: `0 0 0 2px ${controlOutline}`,
            },
            Select: {
              controlHeight: 32,
              fontSize: 14,
              borderRadius: 8,
              activeBorderColor: primaryColor,
              hoverBorderColor: primaryColor,
            },
            DatePicker: {
              controlHeight: 32,
              fontSize: 14,
              borderRadius: 8,
              activeBorderColor: primaryColor,
              hoverBorderColor: primaryColor,
            },
            InputNumber: {
              controlHeight: 32,
              fontSize: 14,
              borderRadius: 8,
              activeBorderColor: primaryColor,
              hoverBorderColor: primaryColor,
            },
            Descriptions: {
              labelBg: "#fafafa",
              titleColor: primaryColor,
              fontSize: 14,
              paddingXS: 8,
            },
            Tabs: {
              titleFontSize: 14,
              horizontalItemPadding: "12px 16px",
            },
            Divider: {
              textPaddingInline: 8,
              colorSplit: "#f0f0f0",
            },
            Card: {
              borderRadiusLG: 12,
            },
            Modal: {
              borderRadiusLG: 16,
            },
          },
        }}
      >
        <AntApp>
          <ToastProvider>
            {routing}
          </ToastProvider>
        </AntApp>
      </ConfigProvider>
    </ErrorBoundary>
  );
};

export default App;

