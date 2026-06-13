# Documentation technique - API À la Casa

## Vue d'ensemble

L'API est une application Node.js construite avec Express. Elle expose des ressources REST sous le préfixe `/api` et écoute par défaut sur le port **3000**.

Dépendances principales :

| Paquet | Version | Rôle |
|---|---|---|
| express | ^4.19 | Serveur HTTP |
| mysql2 | ^3.9 | Connexion MySQL |
| jsonwebtoken | ^9.0 | Authentification JWT |
| bcrypt | ^5.1 | Hachage des mots de passe |
| multer | ^2.1 | Téléversement de fichiers |
| minio | ^7.1 | Stockage objet des images |
| cors | ^2.8 | Politique CORS |
| dotenv | ^16.4 | Variables d'environnement |

---

## Démarrage

```bash
# Production
node api.js

# Développement (rechargement automatique)
nodemon api.js
```

Variables d'environnement requises (fichier `.env`) :

```
PORT=3000
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
JWT_SECRET=
MINIO_ENDPOINT=
MINIO_PORT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=
```

---

## Authentification

La plupart des routes nécessitent un jeton JWT transmis dans l'en-tête `Authorization` :

```
Authorization: Bearer <token>
```

Le jeton est obtenu lors de la connexion ou de l'inscription. Il est signé avec `JWT_SECRET` et expire après 7 jours. Il contient les champs `id`, `email` et `role`.

Les rôles possibles sont `client`, `manager` et `admin`.

### Middleware verifyToken

Le middleware `src/middlewares/verifyToken.js` extrait et vérifie le jeton. En cas d'absence ou d'invalidité, il retourne :

```json
{ "error": "Token required" }
```
ou
```json
{ "error": "Invalid or expired token" }
```

---

## Structure des ressources

### Adresse

```json
{
  "number": "12",
  "street": "Rue de la Paix",
  "neighborhood": "Centre",
  "city": "Paris",
  "postalCode": "75001"
}
```

### Bien immobilier (real state)

```json
{
  "id": 1,
  "description": "Appartement lumineux",
  "price": 250000,
  "area": 65,
  "category": "apartment",
  "address": { ... },
  "agency": { "name": "Agence Sud", "address": { ... } },
  "pictures": [{ "id": 1, "url": "https://..." }],
  "sold": false
}
```

### Utilisateur

```json
{
  "id": 1,
  "username": "jdupont",
  "email": "j@example.com",
  "role": "client",
  "picture": "https://...",
  "created_at": "2025-01-01T00:00:00.000Z",
  "address": { ... },
  "real_states": [ ... ]
}
```

### Agence

```json
{
  "id": 1,
  "name": "Agence Sud",
  "address": { ... },
  "managers": [{ "username": "jdupont", "email": "j@example.com" }]
}
```

---

## Codes de réponse communs

| Code | Signification |
|---|---|
| 200 | Succès |
| 201 | Ressource créée |
| 400 | Données manquantes ou invalides |
| 401 | Authentification requise ou invalide |
| 403 | Autorisation insuffisante |
| 404 | Ressource introuvable |
| 409 | Conflit (doublon) |
| 500 | Erreur interne du serveur |

---

## Routes

### /api/auth

#### POST /api/auth/login

Connexion d'un utilisateur existant.

Authentification requise : non

Corps de la requête :

```json
{
  "email": "j@example.com",
  "password": "motdepasse"
}
```

Réponse 200 :

```json
{
  "success": true,
  "user": { "id": 1, "username": "jdupont", "email": "j@example.com", "role": "client", ... },
  "token": "<jwt>"
}
```

Réponses d'erreur :

- 400 : email ou mot de passe absent
- 401 : identifiants incorrects

---

#### POST /api/auth/register

Inscription d'un nouvel utilisateur. Le rôle attribué par défaut est `client`.

Authentification requise : non

Corps de la requête :

```json
{
  "username": "jdupont",
  "email": "j@example.com",
  "password": "motdepasse"
}
```

Réponse 201 :

```json
{
  "success": true,
  "user": { "id": 2, "username": "jdupont", "email": "j@example.com", "role": "client", ... },
  "token": "<jwt>"
}
```

Réponses d'erreur :

- 400 : champ manquant
- 409 : email ou nom d'utilisateur déjà utilisé

---

### /api/real-states

#### GET /api/real-states

Liste les biens disponibles (non vendus). Accessible sans authentification.

Paramètres de requête optionnels :

| Paramètre | Type | Description |
|---|---|---|
| search | string | Recherche dans description, catégorie, ville |
| min_price | number | Prix minimum |
| max_price | number | Prix maximum |
| min_area | number | Surface minimum (m²) |
| max_area | number | Surface maximum (m²) |
| category | string | Catégorie exacte |
| agency_id | number | Identifiant de l'agence |

Réponse 200 : tableau de biens immobiliers.

---

#### GET /api/real-states/all

Liste tous les biens, y compris les vendus, avec les informations de vente. Réservé aux rôles `admin` et `manager`.

Authentification requise : oui

Chaque bien contient un champ `sold` supplémentaire :

```json
"sold": { "sold_to": 5, "sold_at": "2025-06-01T10:00:00.000Z" }
```

Si le bien n'est pas vendu, `sold` vaut `null`.

---

#### GET /api/real-states/sold

Liste uniquement les biens vendus avec leurs informations de vente. Réservé aux rôles `admin` et `manager`.

Authentification requise : oui

Chaque entrée contient le champ `sold_infos` :

```json
"sold_infos": { "sold_to": 5, "sold_at": "2025-06-01T10:00:00.000Z" }
```

---

#### GET /api/real-states/:id

Retourne le détail d'un seul bien. Le champ `sold` est un booléen.

Authentification requise : non

Réponses d'erreur :

- 404 : bien introuvable

---

#### POST /api/real-states

Crée un nouveau bien immobilier. Réservé aux rôles `admin` et `manager`. Un manager ne peut créer un bien que pour une agence qu'il gère.

Authentification requise : oui

Corps de la requête :

```json
{
  "description": "Appartement lumineux",
  "price": 250000,
  "area": 65,
  "category": "apartment",
  "agency_id": 1,
  "address": {
    "number": "12",
    "street": "Rue de la Paix",
    "neighborhood": "Centre",
    "city": "Paris",
    "postalCode": "75001"
  }
}
```

Réponse 201 :

```json
{ "success": true, "id": 42 }
```

Réponses d'erreur :

- 400 : champ manquant
- 403 : rôle insuffisant ou manager sans droit sur l'agence

---

#### PUT /api/real-states/:id

Met à jour un bien. Seuls les champs fournis sont modifiés. Réservé aux rôles `admin` et `manager`. Un manager ne peut modifier que les biens de ses agences.

Authentification requise : oui

Corps de la requête (tous les champs sont optionnels) :

```json
{
  "description": "Nouvelle description",
  "price": 270000,
  "area": 70,
  "category": "house",
  "agency_id": 2,
  "address": { ... }
}
```

Réponse 200 :

```json
{ "success": true, "id": 42 }
```

---

#### DELETE /api/real-states/:id

Supprime un bien et toutes ses images associées dans MinIO. Réservé aux rôles `admin` et `manager`. Un manager ne peut supprimer que les biens de ses agences.

Authentification requise : oui

Réponse 200 :

```json
{ "success": true }
```

---

#### POST /api/real-states/:id/sell

Enregistre l'achat d'un bien par l'utilisateur authentifié. Réservé au rôle `client`.

Authentification requise : oui

Corps de la requête : aucun

Réponse 200 :

```json
{ "success": true, "id": 42 }
```

Réponses d'erreur :

- 403 : l'utilisateur n'est pas un client
- 404 : bien introuvable
- 409 : bien déjà vendu

---

#### POST /api/real-states/:id/pictures

Téléverse une image pour un bien. L'image est stockée dans MinIO. Réservé aux rôles `admin` et `manager`.

Authentification requise : oui

Corps de la requête : `multipart/form-data` avec le champ `image` (fichier).

Réponse 201 :

```json
{ "success": true, "id": 7, "url": "https://..." }
```

Réponses d'erreur :

- 400 : fichier absent
- 404 : bien introuvable

---

#### DELETE /api/real-states/:id/pictures/:pictureId

Supprime une image d'un bien depuis la base de données et depuis MinIO. Réservé aux rôles `admin` et `manager`.

Authentification requise : oui

Réponse 200 :

```json
{ "success": true }
```

Réponses d'erreur :

- 404 : image introuvable

---

### /api/users

#### GET /api/users

Liste tous les utilisateurs avec leur adresse et leurs achats immobiliers. Réservé aux rôles `admin` et `manager`.

Authentification requise : oui

Réponse 200 : tableau d'utilisateurs.

---

#### GET /api/users/:id

Retourne le profil d'un utilisateur. Un utilisateur peut consulter son propre profil. Les rôles `admin` et `manager` peuvent consulter n'importe quel profil.

Authentification requise : oui

Réponses d'erreur :

- 403 : accès refusé
- 404 : utilisateur introuvable

---

#### PUT /api/users/:id

Met à jour le profil d'un utilisateur. Un utilisateur peut modifier son propre compte. Un admin peut modifier n'importe quel compte, sauf celui d'un autre admin.

Authentification requise : oui

Corps de la requête (tous les champs sont optionnels) :

```json
{
  "username": "nouveau_nom",
  "email": "nouveau@example.com",
  "password": "nouveau_mdp",
  "picture": "https://...",
  "address": { ... }
}
```

Réponse 200 :

```json
{ "success": true, "id": 1 }
```

---

#### PUT /api/users/:id/promote

Modifie le rôle d'un utilisateur. Réservé au rôle `admin`. Un admin ne peut pas changer le rôle d'un autre admin.

Authentification requise : oui

Corps de la requête :

```json
{ "role": "manager" }
```

Valeurs acceptées pour `role` : `client`, `manager`, `admin`.

Réponse 200 :

```json
{ "success": true, "id": 1 }
```

---

#### POST /api/users/:id/picture

Téléverse la photo de profil d'un utilisateur. L'ancienne image est supprimée de MinIO si elle existe. Un utilisateur peut modifier sa propre photo. Un admin peut modifier n'importe quelle photo.

Authentification requise : oui

Corps de la requête : `multipart/form-data` avec le champ `image` (fichier).

Réponse 200 :

```json
{ "success": true, "url": "https://..." }
```

---

#### DELETE /api/users/:id

Supprime un compte. Un utilisateur peut supprimer son propre compte. Un admin peut supprimer n'importe quel compte, sauf celui d'un autre admin.

Authentification requise : oui

Réponse 200 :

```json
{ "success": true }
```

---

### /api/agencies

#### GET /api/agencies

Liste toutes les agences avec leur adresse et leurs gestionnaires.

Authentification requise : oui

Réponse 200 : tableau d'agences.

---

#### GET /api/agencies/:id

Retourne le détail d'une agence.

Authentification requise : oui

Réponses d'erreur :

- 404 : agence introuvable

---

#### POST /api/agencies

Crée une nouvelle agence. Réservé au rôle `admin`.

Authentification requise : oui

Corps de la requête :

```json
{
  "name": "Agence Sud",
  "address": {
    "number": "5",
    "street": "Avenue du Marché",
    "neighborhood": "Bastide",
    "city": "Bordeaux",
    "postalCode": "33000"
  }
}
```

Réponse 201 :

```json
{ "success": true, "id": 3 }
```

---

#### PUT /api/agencies/:id

Met à jour une agence. Seuls les champs fournis sont modifiés. Réservé au rôle `admin`.

Authentification requise : oui

Corps de la requête (tous les champs sont optionnels) :

```json
{
  "name": "Nouveau nom",
  "address": { ... }
}
```

Réponse 200 :

```json
{ "success": true, "id": 3 }
```

---

#### DELETE /api/agencies/:id

Supprime une agence. Réservé au rôle `admin`.

Authentification requise : oui

Réponse 200 :

```json
{ "success": true }
```

---

#### POST /api/agencies/:id/managers

Associe un gestionnaire à une agence. L'utilisateur ciblé doit avoir le rôle `manager`. Réservé au rôle `admin`.

Authentification requise : oui

Corps de la requête :

```json
{ "user_id": 4 }
```

Réponse 200 :

```json
{ "success": true }
```

Réponses d'erreur :

- 400 : `user_id` absent ou utilisateur sans le rôle `manager`
- 404 : agence ou utilisateur introuvable
- 409 : lien déjà existant

---

#### DELETE /api/agencies/:id/managers/:userId

Retire un gestionnaire d'une agence. Réservé au rôle `admin`.

Authentification requise : oui

Réponse 200 :

```json
{ "success": true }
```

Réponses d'erreur :

- 404 : agence, utilisateur ou lien introuvable