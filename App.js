import React from "react";
import AuthNavigator from "./navigation/AuthNavigator";
import { LoaderProvider } from "./context/LoaderContext";

export default function App() {
  return (
    <LoaderProvider>
      <AuthNavigator />
    </LoaderProvider>
  );
}
