import React from "react";
import AuthNavigator from "./navigation/AuthNavigator";
import { LoaderProvider } from "./context/LoaderContext";
import { NotificationProvider } from "./contexts/NotificationContext";

export default function App() {
  return (
    <LoaderProvider>
      <NotificationProvider>
        <AuthNavigator />
      </NotificationProvider>
    </LoaderProvider>
  );
}
