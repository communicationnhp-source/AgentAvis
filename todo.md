# Google Reviews Auto-Responder - TODO

## Phase 1 : Architecture et Planification
- [x] Initialiser le projet WebDev avec db, server, user
- [x] Créer le plan de développement
- [x] Lire la skill automation-and-scheduling pour la tâche cron

## Phase 2 : Schéma de Base de Données
- [x] Créer table `google_credentials` (Client ID, Client Secret, Refresh Token, Business ID)
- [x] Créer table `reviews` (avis Google récupérés)
- [x] Créer table `responses` (réponses générées et publiées)
- [x] Générer et appliquer les migrations SQL
- [x] Ajouter les query helpers dans server/db.ts

## Phase 3 : Interface de Configuration
- [x] Créer page Settings avec formulaire sécurisé pour les identifiants Google
- [x] Implémenter la validation et le chiffrement des credentials
- [x] Ajouter les procédures tRPC pour sauvegarder/récupérer les credentials
- [x] Restreindre l'accès au propriétaire uniquement (adminProcedure)
- [ ] Ajouter tests unitaires pour la sécurité

## Phase 4 : Script de Récupération et Réponse
- [x] Implémenter l'authentification OAuth2 avec Refresh Token
- [x] Créer la fonction pour récupérer les avis non traités via l'API Google
- [x] Implémenter la génération de réponses avec LLM (adaptation du ton selon la note)
- [x] Créer la fonction pour publier les réponses via l'API Google
- [x] Gérer les erreurs et les retry
- [ ] Ajouter les tests unitaires pour le traitement des avis

## Phase 5 : Tableau de Bord
- [x] Créer la page Dashboard affichant l'historique des réponses
- [x] Afficher : avis original, réponse générée, date, note
- [x] Implémenter la pagination et le tri
- [ ] Ajouter les filtres UI (par date, par note, par statut)
- [ ] Ajouter les tests unitaires pour les filtres

## Phase 6 : Tâche Cron et Notifications
- [x] Créer le handler pour la tâche cron
- [x] Intégrer les notifications au propriétaire (notifyOwner)
- [x] Créer la tâche cron toutes les 10 minutes (après déploiement)
- [x] Tester la tâche cron en mode test

## Phase 7 : Tests et Livraison
- [ ] Tester l'ensemble du flux (config → récupération → génération → publication)
- [ ] Valider la sécurité des credentials
- [ ] Valider la prévention des doublons
- [ ] Tester les notifications
- [ ] Créer un checkpoint final
- [ ] Livrer la solution à l'utilisateur

## Phase 8 : Tableau de Bord TrustedShop Séparé (Read-Only)
- [x] Créer une page TrustedShopDashboard.tsx complètement séparée
- [x] Afficher les avis TrustedShop récupérés
- [x] Afficher les réponses générées
- [x] Ajouter un bouton "Publier manuellement" pour chaque réponse
- [x] Ajouter la route dans App.tsx
- [x] Ajouter un lien vers le dashboard TrustedShop sur la page d'accueil

## Phase 9 : Scraping TrustedShop (Automatisation Complète)
- [ ] Implémenter le scraping Playwright pour TrustedShop
- [ ] Automatiser la connexion au compte TrustedShop
- [ ] Automatiser la publication des réponses
- [ ] Créer la tâche cron TrustedShop toutes les 10 minutes
- [ ] Tester le scraping en mode test

## Bugs à Corriger
- [x] Les identifiants Google ne restent pas enregistrés dans la page Settings (disparaissent lors de la saisie)
- [ ] Tester la sauvegarde des identifiants Google
- [x] Import manquant useAuth dans Dashboard.tsx
- [x] Syntaxe Drizzle pour les filtres
