import React, { useEffect } from "react";
import AuthNavigator from "./navigation/AuthNavigator";
import { LoaderProvider } from "./context/LoaderContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { EditPostProvider } from "./contexts/EditPostContext";
import { initializeNetworkConfig } from "./api/NetworkConfig";

export default function App() {
  useEffect(() => {
    // Initialize network configuration for SSL bypass
    initializeNetworkConfig();
  }, []);

  return (
    <LoaderProvider>
      <NotificationProvider>
        <EditPostProvider>
          <AuthNavigator />
        </EditPostProvider>
      </NotificationProvider>
    </LoaderProvider>
  );
}
