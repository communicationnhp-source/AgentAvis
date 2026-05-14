import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, BarChart3, MessageSquare, Zap, Lock, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";

export default function Home() {
  const [, navigate] = useLocation();
  const [timeUntilNextRun, setTimeUntilNextRun] = useState("--:--");

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      const nextInterval = Math.ceil((minutes + 1) / 10) * 10;
      const minutesUntil = (nextInterval - minutes) % 10 || 10;
      const secondsUntil = 60 - seconds;
      setTimeUntilNextRun(
        `${String(minutesUntil).padStart(2, "0")}:${String(secondsUntil).padStart(2, "0")}`
      );
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">Agent de Réponse aux Avis</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">Bienvenue, Admin</span>
            <Button variant="outline" onClick={handleLogout}>Déconnexion</Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <Card className="mt-8 border-slate-200 shadow-lg hover:shadow-xl transition">
          <CardHeader>
            <BarChart3 className="w-8 h-8 text-green-600 mb-2" />
            <CardTitle>Tableau de bord</CardTitle>
            <CardDescription>Consultez l'historique des réponses</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              Visualisez toutes les réponses générées et publiées par l'agent.
            </p>
            <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard")}>
              Voir le tableau de bord
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="text-sm text-slate-600 font-medium">Prochaine exécution Google</p>
                  <p className="text-xs text-slate-500">Toutes les 10 minutes</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-600 font-mono">{timeUntilNextRun}</p>
                <p className="text-xs text-slate-600">mm:ss</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
