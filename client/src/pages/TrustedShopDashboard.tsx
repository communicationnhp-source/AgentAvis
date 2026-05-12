import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Copy, Send, AlertCircle, Star } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface TrustedShopResponse {
  id: number;
  userId: number;
  reviewId: number;
  trustedshopResponseId: string | null;
  responseText: string;
  status: "draft" | "published" | "failed";
  errorMessage: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function TrustedShopDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [responses, setResponses] = useState<TrustedShopResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const listResponsesQuery = trpc.trustedshop.listResponses.useQuery({
    limit: 50,
    offset: 0,
  });

  useEffect(() => {
    if (listResponsesQuery.data) {
      setResponses(listResponsesQuery.data);
      setIsLoading(false);
    }
  }, [listResponsesQuery.data]);

  const handleCopyResponse = (responseText: string) => {
    navigator.clipboard.writeText(responseText);
    toast.success("Réponse copiée dans le presse-papiers");
  };

  const handlePublishManually = (responseText: string) => {
    // Open TrustedShop in a new tab with the response text
    // In a real scenario, this would open the TrustedShop website
    // For now, we'll just show a toast and copy the text
    handleCopyResponse(responseText);
    toast.info("La réponse a été copiée. Allez sur TrustedShop et collez-la manuellement.");
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-600";
    if (rating === 3) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Publiée</span>;
      case "draft":
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Brouillon</span>;
      case "failed":
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Erreur</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tableau de Bord TrustedShop</h1>
            <p className="text-sm text-slate-600">Gérez vos réponses TrustedShop manuellement</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Info Alert */}
        <Card className="mb-8 bg-orange-50 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-900">
                <p className="font-semibold mb-1">Mode Manuel</p>
                <p>
                  L'agent génère les réponses automatiquement. Vous devez les publier manuellement en cliquant sur "Publier" pour chaque réponse.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Responses List */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Chargement des réponses...</p>
          </div>
        ) : responses.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-slate-600 mb-4">Aucune réponse générée pour le moment.</p>
              <p className="text-sm text-slate-500">
                Les réponses apparaîtront ici une fois que l'agent aura récupéré et traité vos avis TrustedShop.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {responses.map((response) => (
              <Card key={response.id} className="border-slate-200 shadow-md hover:shadow-lg transition">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(response.status)}
                      </div>
                      <p className="text-sm text-slate-600">
                        Créée le {(response.createdAt instanceof Date ? response.createdAt : new Date(response.createdAt)).toLocaleDateString("fr-FR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Response Text */}
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">Réponse générée :</p>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <p className="text-slate-700 whitespace-pre-wrap">{response.responseText}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleCopyResponse(response.responseText)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copier
                    </Button>
                    {response.status !== "published" && (
                      <Button
                        className="flex-1 bg-orange-600 hover:bg-orange-700"
                        onClick={() => handlePublishManually(response.responseText)}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Publier
                      </Button>
                    )}
                  </div>

                  {response.status === "published" && response.publishedAt && (
                    <p className="text-xs text-green-600 text-center">
                      ✓ Publiée le {(response.publishedAt instanceof Date ? response.publishedAt : new Date(response.publishedAt)).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Section */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Comment publier une réponse ?</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-900 space-y-3 text-sm">
            <div className="flex gap-3">
              <span className="font-bold text-blue-600">1.</span>
              <p>Cliquez sur le bouton "Publier" pour la réponse que vous souhaitez publier</p>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-blue-600">2.</span>
              <p>La réponse sera copiée dans votre presse-papiers</p>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-blue-600">3.</span>
              <p>Allez sur votre compte TrustedShop et collez la réponse manuellement</p>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-blue-600">4.</span>
              <p>Cliquez sur "Publier" sur TrustedShop pour confirmer</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
