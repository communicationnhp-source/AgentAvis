# Déploiement sur Railway

## Prérequis
- Compte Railway (railway.app)
- Repo GitHub connecté à Railway
- Clé API Anthropic (console.anthropic.com)
- Credentials Google OAuth2 (voir Settings dans l'app)

---

## 1. Créer le projet Railway

1. New Project → Deploy from GitHub repo → sélectionner ce repo
2. Railway détecte automatiquement Node.js

---

## 2. Ajouter MySQL

Dans votre projet Railway :
1. **+ New** → **Database** → **MySQL**
2. Railway génère automatiquement `DATABASE_URL` et l'injecte dans votre service — rien à faire manuellement

---

## 3. Configurer les variables d'environnement

Dans Railway : votre service → **Variables** → ajouter :

| Variable | Valeur | Notes |
|----------|--------|-------|
| `ADMIN_PASSWORD` | mot de passe fort | Pour se connecter à l'interface |
| `JWT_SECRET` | chaîne aléatoire 64 chars | `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Depuis console.anthropic.com |
| `CRON_SECRET` | chaîne aléatoire | `openssl rand -hex 16` |
| `NODE_ENV` | `production` | |
| `NOTIFY_WEBHOOK_URL` | URL webhook Slack/Discord | Optionnel |

> `DATABASE_URL` est injecté automatiquement par le plugin MySQL.

---

## 4. Configurer le build

Dans Railway : votre service → **Settings** → **Build**

- **Build Command** : `pnpm install && pnpm build`
- **Start Command** : `pnpm start`

---

## 5. Configurer le Cron Job Railway

Railway a un service Cron natif pour déclencher le traitement des avis automatiquement.

1. Dans votre projet : **+ New** → **Cron Job**
2. Configuration :
   - **Schedule** : `*/10 * * * *` (toutes les 10 minutes)
   - **Command** :
     ```
     curl -s -X POST https://VOTRE_APP.railway.app/api/scheduled/process-reviews \
       -H "Authorization: Bearer $CRON_SECRET" \
       -H "Content-Type: application/json"
     ```
   - Remplacer `VOTRE_APP.railway.app` par l'URL de votre déploiement
   - Ajouter la variable `CRON_SECRET` dans ce service Cron (même valeur que dans le service principal)

---

## 6. Premier déploiement

1. Push sur GitHub → Railway déclenche automatiquement le build
2. Les migrations DB sont appliquées automatiquement au démarrage
3. Vérifier les logs Railway pour confirmer le démarrage

---

## 7. Configurer les credentials Google

1. Aller sur `https://VOTRE_APP.railway.app`
2. Se connecter avec `ADMIN_PASSWORD`
3. Aller dans **Configuration** et entrer :
   - Client ID / Client Secret (Google Cloud Console)
   - Refresh Token (OAuth Playground)
   - Business Profile ID (format : `accounts/XXX/locations/YYY`)
4. Cliquer **Tester** pour vérifier que tout fonctionne

---

## 8. Vérifier

- Health check : `GET https://VOTRE_APP.railway.app/api/health`
- Test manuel du cron :
  ```bash
  curl -X POST https://VOTRE_APP.railway.app/api/scheduled/process-reviews \
    -H "Authorization: Bearer VOTRE_CRON_SECRET"
  ```

---

## Structure des APIs Google utilisées

| Opération | Endpoint |
|-----------|----------|
| Refresh token → access token | `POST https://oauth2.googleapis.com/token` |
| Lister les avis | `GET https://mybusiness.googleapis.com/v1/{businessProfileId}/reviews` |
| Publier une réponse | `PUT https://mybusiness.googleapis.com/v1/{reviewName}/reply` |

> ⚠️ L'ancienne API `mybusiness.googleapis.com/v4` est dépréciée. Ce projet utilise la v1.

---

## Dépannage

**L'app démarre mais la DB est vide**
→ Les migrations se lancent au démarrage, vérifier les logs. Si erreur, vérifier `DATABASE_URL`.

**Erreur 403 sur le cron**
→ Vérifier que `CRON_SECRET` est identique dans le service principal et le service Cron.

**Erreur Google API 401**
→ Le refresh token a expiré. Regénérer via OAuth Playground et mettre à jour dans Settings.

**Erreur Google API 404**
→ Vérifier le format du Business Profile ID : `accounts/ACCOUNT_ID/locations/LOCATION_ID`.

**Anthropic API 401**
→ Vérifier que `ANTHROPIC_API_KEY` commence par `sk-ant-` et est valide.
