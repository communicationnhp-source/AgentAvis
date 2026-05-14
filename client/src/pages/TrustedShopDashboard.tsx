import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Copy, Send, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function TrustedShopDashboard() {
  const [, navigate] = useLocation();

  const listResponsesQuery = trpc.trustedshop.listResponses.useQuery({ limit: 50, offset: 0 });
  const processReviewsMutation = trpc.trustedshop.processReviews.useMutation({
    onSuccess: (data) => {
      const r = data.result;
      toast.success(`${r.processed} réponses générées !`);
      listResponsesQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Réponse copiée !");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published": return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Publiée</span>;
      case "draft": return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Brouillon</span>;
      case "failed": return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Erreur</span>;
      default: return null;
    }
  };

  const responses = listResponsesQuery.data || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="p-2 hover:bg-slate-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Tableau de Bord TrustedShop</h1>
              <p className="text-sm text-slate-600">Gérez vos réponses TrustedShop manuellement</p>
            </div>
          </div>
          <Button
            onClick={() => processReviewsMutation.mutate()}
            disabled={processReviewsMutation.isPending}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {processReviewsMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Génération...</>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-2" />Générer les réponses</>
            )}
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <Card className="mb-8 bg-orange-50 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-900">
                <p className="font-semibold mb-1">Mode Manuel</p>
                <p>Cliquez sur "Générer les réponses" pour récupérer vos avis et générer des réponses IA. Ensuite copiez et publiez manuellement sur TrustedShop.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {listResponsesQuery.isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
          </div>
        ) : responses.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-slate-600 mb-4">Aucune réponse générée pour le moment.</p>
              <Button onClick={() => processReviewsMutation.mutate()} className="bg-orange-600 hover:bg-orange-700">
                Générer les réponses maintenant
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {responses.map((response: any) => (
              <Card key={response.id} className="border-slate-200 shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    {getStatusBadge(response.status)}
                    <p className="text-xs text-slate-500">
                      {new Date(response.createdAt).toLocaleDateString("fr-FR", {
                        year: "numeric", month: "long", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">Réponse générée :</p>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <p className="text-slate-700 whitespace-pre-wrap">{response.responseText}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => handleCopy(response.responseText)}>
                      <Copy className="w-4 h-4 mr-2" />Copier
                    </Button>
                    {response.status !== "published" && (
                      <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={() => {
                        handleCopy(response.responseText);
                        toast.info("Réponse copiée — collez-la sur TrustedShop !");
                      }}>
                        <Send className="w-4 h-4 mr-2" />Publier
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
