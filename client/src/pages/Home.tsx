import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Settings, BarChart3, MessageSquare, Zap, Lock, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const [, navigate] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated by checking if they have a session
    const checkAuth = async () => {
      try {
        // Try to call a protected procedure to check auth
        const result = await trpc.googleCredentials.get.useQuery();
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        // Redirect to login if not authenticated
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);
  const [timeUntilNextRun, setTimeUntilNextRun] = useState("--:--");

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Calculate time until next cron run (every 10 minutes)
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      // Calculate next 10-minute interval
      const nextInterval = Math.ceil(minutes / 10) * 10;
      const minutesUntil = (nextInterval - minutes) % 10 || 10;
      const secondsUntil = minutesUntil === 10 ? 60 - seconds : 60 - seconds;

      setTimeUntilNextRun(
        `${String(minutesUntil).padStart(2, "0")}:${String(secondsUntil).padStart(2, "0")}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-slate-900 mb-4">
              Agent de Réponse aux Avis
            </h1>
            <p className="text-xl text-slate-600 mb-8">
              Répondez automatiquement à vos avis Google et TrustedShop
            </p>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700" onClick={() => navigate("/login")}>
              Se connecter
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="border-slate-200 shadow-lg hover:shadow-xl transition">
              <CardHeader>
                <Zap className="w-8 h-8 text-blue-600 mb-2" />
                <CardTitle>Automatisation Google</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Répondez à tous les avis Google automatiquement toutes les 10 minutes, sans intervention.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-lg hover:shadow-xl transition">
              <CardHeader>
                <MessageSquare className="w-8 h-8 text-green-600 mb-2" />
                <CardTitle>Réponses personnalisées</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  L'IA génère des réponses adaptées au ton de chaque avis (5 étoiles, 1 étoile, etc.).
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-lg hover:shadow-xl transition">
              <CardHeader>
                <Lock className="w-8 h-8 text-purple-600 mb-2" />
                <CardTitle>Sécurisé et fiable</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Vos identifiants sont chiffrés. Pas de doublon. Retries automatiques.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <div className="text-center">
            <p className="text-slate-600 mb-4">Commencez à automatiser vos réponses dès maintenant</p>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700" onClick={() => navigate("/login")}>
              Se connecter
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">Agent de Réponse aux Avis</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">Bienvenue, Admin</span>
            <Button variant="outline" onClick={handleLogout}>
              Déconnexion
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Google Configuration Card */}
          <Card className="border-slate-200 shadow-lg hover:shadow-xl transition">
            <CardHeader>
              <Settings className="w-8 h-8 text-blue-600 mb-2" />
              <CardTitle>Google - Automatisé</CardTitle>
              <CardDescription>Réponses automatiques toutes les 10 min</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">
                Entrez vos identifiants OAuth2 Google. L'agent répondra automatiquement à tous vos avis.
              </p>
              <Button variant="outline" className="w-full" onClick={() => navigate("/settings")}>
                Configurer Google
              </Button>
            </CardContent>
          </Card>

          {/* TrustedShop Configuration Card */}
          <Card className="border-slate-200 shadow-lg hover:shadow-xl transition">
            <CardHeader>
              <Settings className="w-8 h-8 text-orange-600 mb-2" />
              <CardTitle>TrustedShop - Manuel</CardTitle>
              <CardDescription>Générer et publier manuellement</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">
                Entrez vos identifiants eTrusted. L'agent génère les réponses, vous les publiez manuellement.
              </p>
              <div className="space-y-2">
                <Button variant="outline" className="w-full" onClick={() => navigate("/trustedshop-settings")}>
                  Configurer TrustedShop
                </Button>
                <Button variant="outline" className="w-full" onClick={() => navigate("/trustedshop-dashboard")}>
                  Voir les réponses
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Card */}
        <Card className="mt-8 border-slate-200 shadow-lg hover:shadow-xl transition">
          <CardHeader>
            <BarChart3 className="w-8 h-8 text-green-600 mb-2" />
            <CardTitle>Tableau de bord</CardTitle>
            <CardDescription>Consultez l'historique des réponses</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              Visualisez toutes les réponses générées et publiées par l'agent, avec les détails de chaque avis.
            </p>
            <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard")}>
              Voir le tableau de bord
            </Button>
          </CardContent>
        </Card>

        {/* Cron Timer Card */}
        <Card className="mt-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="text-sm text-slate-600 font-medium">Prochaine exécution Google</p>
                  <p className="text-xs text-slate-500">La tâche cron s'exécute toutes les 10 minutes</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-600 font-mono">{timeUntilNextRun}</p>
                <p className="text-xs text-slate-600">mm:ss</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card className="mt-8 bg-blue-50 border-blue-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-blue-900">Comment ça marche ?</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-900 space-y-3">
            <div>
              <p className="font-semibold text-base mb-3">Google (Automatisé)</p>
              <div className="space-y-2 ml-4">
                <div className="flex gap-2">
                  <span className="text-blue-600 font-bold">1.</span>
                  <p className="text-sm">Configurez vos identifiants Google OAuth2</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-600 font-bold">2.</span>
                  <p className="text-sm">Toutes les 10 minutes, l'agent récupère les nouveaux avis</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-600 font-bold">3.</span>
                  <p className="text-sm">L'IA génère des réponses personnalisées et les publie automatiquement</p>
                </div>
              </div>
            </div>
            <div className="border-t border-blue-200 pt-3">
              <p className="font-semibold text-base mb-3">TrustedShop (Manuel)</p>
              <div className="space-y-2 ml-4">
                <div className="flex gap-2">
                  <span className="text-orange-600 font-bold">1.</span>
                  <p className="text-sm">Configurez vos identifiants eTrusted</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-orange-600 font-bold">2.</span>
                  <p className="text-sm">L'agent récupère vos avis TrustedShop</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-orange-600 font-bold">3.</span>
                  <p className="text-sm">L'IA génère les réponses</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-orange-600 font-bold">4.</span>
                  <p className="text-sm">Vous cliquez sur "Publier" pour chaque réponse</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
