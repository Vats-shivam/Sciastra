import React, { useEffect } from "react";
import AuthNavigator from "./navigation/AuthNavigator";
import { LoaderProvider } from "./context/LoaderContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { initializeNetworkConfig } from "./api/NetworkConfig";

export default function App() {
  useEffect(() => {
    // Initialize network configuration for SSL bypass
    initializeNetworkConfig();
  }, []);

  return (
    <LoaderProvider>
      <NotificationProvider>
        <AuthNavigator />
      </NotificationProvider>
    </LoaderProvider>
  );
}
