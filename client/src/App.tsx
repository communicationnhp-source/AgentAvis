import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import TrustedShopSettings from "./pages/TrustedShopSettings";
import Dashboard from "./pages/Dashboard";
import TrustedShopDashboard from "./pages/TrustedShopDashboard";

function Router() {
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/"} component={Home} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/trustedshop-settings"} component={TrustedShopSettings} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/trustedshop-dashboard"} component={TrustedShopDashboard} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
