import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowLeft, Copy, Send, AlertCircle, Loader2, RefreshCw, Star, Pencil, Check, X } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";

export default function TrustedShopDashboard() {
  const [, navigate] = useLocation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedTexts, setEditedTexts] = useState<Record<number, string>>({});

  const listResponsesQuery = trpc.trustedshop.listResponses.useQuery({ limit: 50, offset: 0 });

  const processReviewsMutation = trpc.trustedshop.processReviews.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.result.processed} réponses générées !`);
      listResponsesQuery.refetch();
    },
    onError: (error) => toast.error(`Erreur : ${error.message}`),
  });

  const publishReplyMutation = trpc.trustedshop.publishReply.useMutation({
    onSuccess: () => {
      toast.success("Réponse publiée sur TrustedShop !");
      listResponsesQuery.refetch();
    },
    onError: (error) => toast.error(`Erreur de publication : ${error.message}`),
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Réponse copiée !");
  };

  const handlePublish = (response: any) => {
    const text = editedTexts[response.id] ?? response.responseText;
    publishReplyMutation.mutate({
      responseId: response.id,
      reviewId: response.reviewId,
      responseText: text,
    });
    setEditingId(null);
  };

  const startEdit = (response: any) => {
    setEditedTexts((prev) => ({ ...prev, [response.id]: response.responseText }));
    setEditingId(response.id);
  };

  const cancelEdit = (id: number) => {
    setEditingId(null);
    setEditedTexts((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published": return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Publiée</span>;
      case "draft": return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Brouillon</span>;
      case "failed": return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Erreur</span>;
      default: return null;
    }
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <Star key={s} className={`w-4 h-4 ${s <= rating ? "fill-orange-400 text-orange-400" : "text-slate-300"}`} />
      ))}
    </div>
  );

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
              <p className="text-sm text-slate-600">Gérez vos réponses TrustedShop</p>
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

      <div className="max-w-6xl mx-auto px-4 py-8">
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
            {responses.map((response: any) => {
              const isEditing = editingId === response.id;
              const currentText = editedTexts[response.id] ?? response.responseText;
              const isPublishing = publishReplyMutation.isPending;

              return (
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

                    {/* Avis client */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {renderStars(response.reviewRating)}
                          <span className="text-sm font-medium text-slate-700">{response.reviewAuthor}</span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {new Date(response.reviewDate).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 italic">"{response.reviewText}"</p>
                    </div>

                    {/* Réponse générée */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-slate-700">Réponse générée :</p>
                        {response.status !== "published" && !isEditing && (
                          <button onClick={() => startEdit(response)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition">
                            <Pencil className="w-3 h-3" />Modifier
                          </button>
                        )}
                      </div>
                      {isEditing ? (
                        <textarea
                          className="w-full border border-orange-300 rounded-lg p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                          rows={4}
                          value={currentText}
                          onChange={(e) => setEditedTexts((prev) => ({ ...prev, [response.id]: e.target.value }))}
                        />
                      ) : (
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                          <p className="text-slate-700 whitespace-pre-wrap">{currentText}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <Button variant="outline" className="flex-1" onClick={() => cancelEdit(response.id)}>
                            <X className="w-4 h-4 mr-2" />Annuler
                          </Button>
                          <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={() => handlePublish(response)} disabled={isPublishing}>
                            {isPublishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                            Publier
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" className="flex-1" onClick={() => handleCopy(currentText)}>
                            <Copy className="w-4 h-4 mr-2" />Copier
                          </Button>
                          {response.status !== "published" && (
                            <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={() => handlePublish(response)} disabled={isPublishing}>
                              {isPublishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                              Publier
                            </Button>
                          )}
                        </>
                      )}
                    </div>

                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
