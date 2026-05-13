import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function TrustedShopSettings() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [channelId, setChannelId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const saveTrustedShopMutation = trpc.trustedshop.saveCredentials.useMutation();

  const handleSave = async () => {
    if (!clientId.trim() || !clientSecret.trim() || !channelId.trim()) {
      toast.error("Tous les champs sont obligatoires");
      return;
    }

    setIsSaving(true);
    try {
      await saveTrustedShopMutation.mutateAsync({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        channelId: channelId.trim(),
      });
      toast.success("Identifiants TrustedShop sauvegardés avec succès !");
      setTimeout(() => navigate("/"), 1500);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la sauvegarde"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Configuration TrustedShop</h1>
            <p className="text-sm text-slate-600">Gérez vos identifiants eTrusted</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card className="border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle>Identifiants eTrusted</CardTitle>
            <CardDescription>
              Entrez vos identifiants API eTrusted pour permettre à l'agent de récupérer vos avis TrustedShop
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Info Alert */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Mode lecture seule</p>
                <p>
                  L'agent récupère vos avis TrustedShop et génère des réponses. Vous devrez les publier manuellement en cliquant sur un bouton dans le tableau de bord.
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="clientId" className="text-slate-700 font-medium">
                  Client ID
                </Label>
                <Input
                  id="clientId"
                  type="text"
                  placeholder="Votre Client ID eTrusted"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Trouvez-le dans les paramètres API de votre compte eTrusted
                </p>
              </div>

              <div>
                <Label htmlFor="clientSecret" className="text-slate-700 font-medium">
                  Client Secret
                </Label>
                <Input
                  id="clientSecret"
                  type="password"
                  placeholder="Votre Client Secret eTrusted"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Gardez-le secret et sécurisé
                </p>
              </div>

              <div>
                <Label htmlFor="channelId" className="text-slate-700 font-medium">
                  Channel ID
                </Label>
                <Input
                  id="channelId"
                  type="text"
                  placeholder="chl-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 mt-1">
                  L'ID unique de votre boutique sur eTrusted
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving || !clientId.trim() || !clientSecret.trim() || !channelId.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/")}
              >
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card className="mt-8 bg-slate-50 border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Besoin d'aide ?</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-700 space-y-3 text-sm">
            <div>
              <p className="font-semibold mb-1">Comment obtenir vos identifiants ?</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-600">
                <li>Allez sur https://app.etrusted.com/</li>
                <li>Connectez-vous à votre compte</li>
                <li>Allez dans les paramètres API</li>
                <li>Créez une nouvelle clé API</li>
                <li>Copiez le Client ID et Client Secret</li>
                <li>Trouvez votre Channel ID dans les paramètres généraux</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
