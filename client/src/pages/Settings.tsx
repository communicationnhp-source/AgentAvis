import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
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
  const [isSettingupCron, setIsSettingupCron] = useState(false);

  // Fetch existing credentials
  const { data: credentials, isLoading: credentialsLoading } = trpc.googleCredentials.get.useQuery();

  // Load credentials into form only on initial mount
  useEffect(() => {
    if (credentials && credentials.businessProfileId) {
      // Only set businessProfileId if it exists and form is empty
      setFormData((prev) => ({
        ...prev,
        businessProfileId: prev.businessProfileId || credentials.businessProfileId || "",
      }));
    }
  }, []);

  const saveCredentialsMutation = trpc.googleCredentials.save.useMutation({
    onSuccess: () => {
      toast.success("Identifiants Google sauvegardés avec succès !");
      setIsSaving(false);
      // Redirect to home after successful save
      setTimeout(() => navigate("/"), 1500);
    },
    onError: (error) => {
      console.error("Save error:", error);
      toast.error(`Erreur : ${error.message}`);
      setIsSaving(false);
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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

  const handleTestFetch = async () => {
    setIsTesting(true);
    await testFetchMutation.mutateAsync();
  };

  const setupCronMutation = trpc.googleReviews.setupCron.useMutation({
    onSuccess: (data) => {
      toast.success(`Tâche cron créée ! Prochaine exécution : ${data.nextExecutionAt || "bientôt"}`);
      setIsSettingupCron(false);
    },
    onError: (error) => {
      toast.error(`Erreur : ${error.message}`);
      setIsSettingupCron(false);
    },
  });

  const handleSetupCron = async () => {
    setIsSettingupCron(true);
    await setupCronMutation.mutateAsync();
  };

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
          <CardHeader>
            <CardTitle>Accès refusé</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Vous devez être connecté pour accéder à cette page.</p>
          </CardContent>
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
            <p className="text-slate-600 mt-2">Gérez vos identifiants Google Business Profile</p>
          </div>
        </div>

        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="border-b border-slate-200 bg-slate-50">
            <CardTitle className="flex items-center gap-2">
              {credentials?.businessProfileId ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Identifiants configurés
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  Configuration requise
                </>
              )}
            </CardTitle>
            <CardDescription>
              Entrez vos identifiants OAuth2 Google pour permettre à l'agent de répondre automatiquement aux avis.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Client ID */}
            <div className="space-y-2">
              <Label htmlFor="clientId" className="font-medium">
                Client ID
              </Label>
              <Input
                id="clientId"
                name="clientId"
                type="text"
                placeholder="ex: 123456789-abcdef.apps.googleusercontent.com"
                value={formData.clientId}
                onChange={handleInputChange}
                className="font-mono text-sm"
              />
              <p className="text-xs text-slate-500">
                Trouvez cette valeur dans Google Cloud Console &gt; API et services &gt; Identifiants
              </p>
            </div>

            {/* Client Secret */}
            <div className="space-y-2">
              <Label htmlFor="clientSecret" className="font-medium">
                Client Secret
              </Label>
              <div className="relative">
                <Input
                  id="clientSecret"
                  name="clientSecret"
                  type={showSecrets ? "text" : "password"}
                  placeholder="••••••••••••••••"
                  value={formData.clientSecret}
                  onChange={handleInputChange}
                  className="font-mono text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showSecrets ? "Masquer" : "Afficher"}
                </button>
              </div>
              <p className="text-xs text-slate-500">Gardez cette valeur secrète et sécurisée</p>
            </div>

            {/* Refresh Token */}
            <div className="space-y-2">
              <Label htmlFor="refreshToken" className="font-medium">
                Refresh Token
              </Label>
              <div className="relative">
                <Input
                  id="refreshToken"
                  name="refreshToken"
                  type={showSecrets ? "text" : "password"}
                  placeholder="••••••••••••••••"
                  value={formData.refreshToken}
                  onChange={handleInputChange}
                  className="font-mono text-sm pr-10 h-24 align-top py-2"
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-700"
                >
                  {showSecrets ? "Masquer" : "Afficher"}
                </button>
              </div>
              <p className="text-xs text-slate-500">Obtenu via OAuth 2.0 Playground</p>
            </div>

            {/* Business Profile ID */}
            <div className="space-y-2">
              <Label htmlFor="businessProfileId" className="font-medium">
                ID de la fiche Business Profile
              </Label>
              <Input
                id="businessProfileId"
                name="businessProfileId"
                type="text"
                placeholder="ex: accounts/123456/locations/789012"
                value={formData.businessProfileId}
                onChange={handleInputChange}
                className="font-mono text-sm"
              />
              <p className="text-xs text-slate-500">
                Format: accounts/[ACCOUNT_ID]/locations/[LOCATION_ID]
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>💡 Conseil :</strong> Pour des raisons de sécurité, les identifiants précédemment sauvegardés ne sont pas affichés. Vous devez entrer vos nouvelles clés pour mettre à jour la configuration.
              </p>
            </div>

            {/* Save Button */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sauvegarde en cours...
                  </>
                ) : (
                  "Sauvegarder les identifiants"
                )}
              </Button>
              <Button variant="outline" onClick={() => navigate("/")}>
                Annuler
              </Button>
            </div>

            {/* Test Fetch Button */}
            <Button
              onClick={handleTestFetch}
              disabled={isTesting}
              variant="outline"
              className="w-full mt-2"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Test en cours...
                </>
              ) : (
                "Tester la récupération des avis"
              )}
            </Button>

            {/* Setup Cron Button */}
            <Button
              onClick={handleSetupCron}
              disabled={isSettingupCron}
              variant="outline"
              className="w-full mt-2"
            >
              {isSettingupCron ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Configuration en cours...
                </>
              ) : (
                "Configurer la tâche cron (toutes les 10 min)"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="mt-8 bg-slate-50 border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Besoin d'aide ?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>
              <strong>Où trouver le Client ID et Client Secret ?</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Allez sur <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
              <li>Sélectionnez votre projet</li>
              <li>Allez dans "API et services" &gt; "Identifiants"</li>
              <li>Créez un nouvel "ID de client OAuth" de type "Application Web"</li>
              <li>Copiez le Client ID et Client Secret</li>
            </ol>
            <p className="mt-3">
              <strong>Où trouver le Refresh Token ?</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Allez sur <a href="https://developers.google.com/oauthplayground/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OAuth 2.0 Playground</a></li>
              <li>Configurez avec votre Client ID et Client Secret</li>
              <li>Autorisez avec le scope: <code className="bg-white px-2 py-1 rounded text-xs">https://www.googleapis.com/auth/business.manage</code></li>
              <li>Copiez le Refresh Token généré</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
