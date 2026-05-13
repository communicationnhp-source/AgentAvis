import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [formData, setFormData] = useState({
    clientId: "",
    clientSecret: "",
    refreshToken: "",
    businessProfileId: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const { data: credentials, isLoading: credentialsLoading } = trpc.googleCredentials.get.useQuery();

  const saveCredentialsMutation = trpc.googleCredentials.save.useMutation({
    onSuccess: () => {
      toast.success("Identifiants Google sauvegardés !");
      setIsSaving(false);
      setTimeout(() => navigate("/"), 1500);
    },
    onError: (error) => {
      toast.error(`Erreur : ${error.message}`);
      setIsSaving(false);
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.clientId || !formData.clientSecret || !formData.refreshToken || !formData.businessProfileId) {
      toast.error("Tous les champs sont obligatoires");
      return;
    }
    setIsSaving(true);
    await saveCredentialsMutation.mutateAsync(formData);
  };

  const testFetchMutation = trpc.googleReviews.testFetch.useMutation({
    onSuccess: (data) => {
      const result = data.result;
      toast.success(`Test réussi ! ${result.processed} avis traités, ${result.published} publiés`);
      setIsTesting(false);
    },
    onError: (error) => {
      toast.error(`Erreur : ${error.message}`);
      setIsTesting(false);
    },
  });

  if (authLoading || credentialsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader><CardTitle>Accès refusé</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">Vous devez être connecté.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Configuration</h1>
            <p className="text-slate-600 mt-2">Identifiants Google Business Profile</p>
          </div>
        </div>

        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="border-b border-slate-200 bg-slate-50">
            <CardTitle className="flex items-center gap-2">
              {credentials?.businessProfileId ? (
                <><CheckCircle2 className="w-5 h-5 text-green-600" /> Identifiants configurés</>
              ) : (
                <><AlertCircle className="w-5 h-5 text-amber-600" /> Configuration requise</>
              )}
            </CardTitle>
            <CardDescription>
              Entrez vos identifiants OAuth2 Google pour permettre à l'agent de répondre automatiquement aux avis.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId" name="clientId" type="text"
                placeholder="123456789-abcdef.apps.googleusercontent.com"
                value={formData.clientId} onChange={handleInputChange}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret</Label>
              <div className="relative">
                <Input
                  id="clientSecret" name="clientSecret"
                  type={showSecrets ? "text" : "password"}
                  placeholder="••••••••••••••••"
                  value={formData.clientSecret} onChange={handleInputChange}
                  className="font-mono text-sm pr-20"
                />
                <button
                  type="button" onClick={() => setShowSecrets(!showSecrets)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-700"
                >
                  {showSecrets ? "Masquer" : "Afficher"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refreshToken">Refresh Token</Label>
              <div className="relative">
                <textarea
                  id="refreshToken" name="refreshToken"
                  placeholder="••••••••••••••••"
                  value={formData.refreshToken}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full font-mono text-sm border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring pr-20"
                  style={{ fontFamily: showSecrets ? "monospace" : "text-security:disc", WebkitTextSecurity: showSecrets ? "none" : "disc" } as any}
                />
                <button
                  type="button" onClick={() => setShowSecrets(!showSecrets)}
                  className="absolute right-3 top-2 text-xs text-slate-500 hover:text-slate-700"
                >
                  {showSecrets ? "Masquer" : "Afficher"}
                </button>
              </div>
              <p className="text-xs text-slate-500">Obtenu via OAuth 2.0 Playground</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessProfileId">ID Fiche Business Profile</Label>
              <Input
                id="businessProfileId" name="businessProfileId" type="text"
                placeholder="accounts/123456789/locations/987654321"
                value={formData.businessProfileId} onChange={handleInputChange}
                className="font-mono text-sm"
              />
              <p className="text-xs text-slate-500">Format : accounts/[ACCOUNT_ID]/locations/[LOCATION_ID]</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-900">
                <strong>⚠️ Sécurité :</strong> Les identifiants sauvegardés ne sont jamais réaffichés. Pour les modifier, entrez les nouvelles valeurs et sauvegardez.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>🤖 Cron automatique :</strong> Le traitement des avis est déclenché automatiquement toutes les 10 minutes par Railway Cron. Aucune configuration supplémentaire n'est nécessaire.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sauvegarde...</> : "Sauvegarder"}
              </Button>
              <Button variant="outline" onClick={() => navigate("/")}>Annuler</Button>
            </div>

            <Button
              onClick={() => { setIsTesting(true); testFetchMutation.mutate(); }}
              disabled={isTesting}
              variant="outline" className="w-full"
            >
              {isTesting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Test en cours...</> : "🧪 Tester maintenant (traitement manuel des avis)"}
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-8 bg-slate-50 border-slate-200">
          <CardHeader><CardTitle className="text-base">Aide — Comment obtenir les identifiants ?</CardTitle></CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-4">
            <div>
              <p className="font-medium mb-1">Client ID et Client Secret</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li><a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a> → API et services → Identifiants</li>
                <li>Créer un ID client OAuth 2.0 (type : Application Web)</li>
                <li>Copier Client ID et Client Secret</li>
              </ol>
            </div>
            <div>
              <p className="font-medium mb-1">Refresh Token</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li><a href="https://developers.google.com/oauthplayground/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OAuth 2.0 Playground</a></li>
                <li>Configurer avec votre Client ID/Secret (icône ⚙️ en haut à droite)</li>
                <li>Scope : <code className="bg-white px-1 py-0.5 rounded text-xs">https://www.googleapis.com/auth/business.manage</code></li>
                <li>Autoriser → Exchange code for tokens → copier le Refresh Token</li>
              </ol>
            </div>
            <div>
              <p className="font-medium mb-1">Business Profile ID</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Utiliser l'<a href="https://mybusiness.googleapis.com/v1/accounts" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">API accounts</a> avec votre token pour trouver votre ACCOUNT_ID</li>
                <li>Puis <code className="bg-white px-1 py-0.5 rounded text-xs">/v1/accounts/ACCOUNT_ID/locations</code> pour le LOCATION_ID</li>
                <li>Format final : <code className="bg-white px-1 py-0.5 rounded text-xs">accounts/ACCOUNT_ID/locations/LOCATION_ID</code></li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
