import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Star, MessageSquare, Calendar } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  // Fetch responses
  const { data: responses, isLoading: responsesLoading } = trpc.responses.list.useQuery({
    limit: itemsPerPage,
    offset: currentPage * itemsPerPage,
  });

  // Fetch reviews for display
  const { data: reviews } = trpc.reviews.list.useQuery({
    limit: 100,
    offset: 0,
  });

  if (authLoading || responsesLoading) {
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

  // Create a map of reviews for quick lookup
  const reviewsMap = new Map(reviews?.map((r) => [r.id, r]));

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i <= rating ? "fill-yellow-400 text-yellow-400" : "text-slate-300"}`}
          />
        ))}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      published: { bg: "bg-green-100", text: "text-green-800", label: "Publié" },
      draft: { bg: "bg-blue-100", text: "text-blue-800", label: "Brouillon" },
      failed: { bg: "bg-red-100", text: "text-red-800", label: "Erreur" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-slate-600 mt-2">Historique des réponses publiées aux avis Google</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-slate-200 shadow-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <MessageSquare className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-slate-900">{responses?.length || 0}</p>
                <p className="text-sm text-slate-600">Réponses publiées</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <Star className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-slate-900">{reviews?.length || 0}</p>
                <p className="text-sm text-slate-600">Avis reçus</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <Calendar className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-slate-900">
                  {responses?.filter((r) => r.status === "published").length || 0}
                </p>
                <p className="text-sm text-slate-600">Publiées avec succès</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Responses List */}
        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="border-b border-slate-200 bg-slate-50">
            <CardTitle>Historique des réponses</CardTitle>
            <CardDescription>Les réponses générées automatiquement par l'agent IA</CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            {responses && responses.length > 0 ? (
              <div className="space-y-4">
                {responses.map((response) => {
                  const review = reviewsMap.get(response.reviewId);
                  return (
                    <div key={response.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {review && renderStars(review.rating)}
                            <span className="text-sm font-medium text-slate-700">{review?.authorName || "Auteur inconnu"}</span>
                          </div>
                          <p className="text-sm text-slate-600 mb-3">{review?.reviewText}</p>
                        </div>
                        <div className="ml-4">{getStatusBadge(response.status)}</div>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3 mb-3">
                        <p className="text-xs font-semibold text-slate-700 mb-1">Réponse générée :</p>
                        <p className="text-sm text-slate-700">{response.responseText}</p>
                      </div>

                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>
                          Créée le {new Date(response.createdAt).toLocaleDateString("fr-FR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {response.publishedAt && (
                          <span>
                            Publiée le {new Date(response.publishedAt).toLocaleDateString("fr-FR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                        {response.errorMessage && (
                          <span className="text-red-600 font-medium">{response.errorMessage}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">Aucune réponse publiée pour le moment.</p>
                <p className="text-sm text-slate-500">Les réponses apparaîtront ici une fois que l'agent aura traité les avis.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {responses && responses.length > 0 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              Précédent
            </Button>
            <span className="flex items-center px-4 text-sm text-slate-600">
              Page {currentPage + 1}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={responses.length < itemsPerPage}
            >
              Suivant
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
