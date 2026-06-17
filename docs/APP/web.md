# Documentation technique - Serveur web À la Casa

## Vue d'ensemble

Le serveur web est une application Node.js construite avec Express. Il sert les fichiers statiques du frontend et expose quelques routes de rendu de pages. Il écoute par défaut sur le port **3001**.

Il ne contient aucune logique métier. Toutes les opérations de données passent par l'API (`a-la-casa-api`) via des appels HTTP côté client.

Dépendances :

| Paquet | Version | Rôle |
|---|---|---|
| express | ^4.19 | Serveur HTTP |
| dotenv | ^16.4 | Variables d'environnement |

---

## Démarrage

```bash
# Production
node web.js

# Développement (rechargement automatique)
nodemon web.js
```

Variables d'environnement requises (fichier `.env`) :

```
PORT=3001
API_URL=http://localhost:3000
```

Si `API_URL` est absent, la valeur par défaut `http://localhost:3000` est utilisée.

---

## Routes du serveur

### GET /js/config.js

Génère dynamiquement un fichier JavaScript qui expose la variable globale `CONFIG` au navigateur.

Contenu retourné :

```js
const CONFIG = { API_URL: 'http://localhost:3000' };
```

Cette route est chargée en premier dans chaque page HTML pour que le client sache où envoyer ses requêtes API. La valeur de `API_URL` est lue depuis la variable d'environnement du serveur, ce qui permet de changer l'adresse de l'API sans modifier les fichiers statiques.

### GET /

Sert `public/index.html` (page d'accueil, liste des biens).

### GET /login

Sert `public/pages/login.html`.

### GET /register

Sert `public/pages/register.html`.

### GET /profile

Sert `public/pages/profile.html`.

### GET /property

Sert `public/pages/property.html` (détail d'un bien).

### GET /admin

Sert `public/pages/admin.html` (panneau d'administration).

### Fichiers statiques

Tous les fichiers du dossier `public/` sont servis directement (CSS, JavaScript, images, etc.) via le middleware `express.static`.

---

## Structure des fichiers

```
web/
  web.js                   Point d'entrée du serveur
  .env                     Variables d'environnement (non versionné)
  package.json
  public/
    index.html             Page d'accueil
    pages/
      login.html
      register.html
      profile.html
      property.html
      admin.html
    css/
      global.css           Styles communs
      home.css
      auth.css
      profile.css
      property.css
      admin.css
    js/
      api-client.js        Client HTTP vers l'API
      auth.js              Gestion du token (localStorage)
      home.js              Logique de la page d'accueil
      login.js
      register.js
      profile.js
      property.js
      admin.js
```

---

## Client HTTP (api-client.js)

Le fichier `public/js/api-client.js` encapsule toutes les communications avec l'API dans un objet global `Api`.

Il lit `CONFIG.API_URL` (injecté par `/js/config.js`) pour construire l'URL de base de chaque requête.

L'en-tête `Authorization: Bearer <token>` est ajouté automatiquement si un token est présent dans le stockage local du navigateur.

Les erreurs HTTP sont transformées en exceptions JavaScript (`throw new Error(...)`), ce qui permet à chaque page de les intercepter avec un bloc `try/catch`.

### Methodes disponibles

#### Authentification

| Methode | Appel API |
|---|---|
| `Api.login(email, password)` | POST /api/auth/login |
| `Api.register(username, email, password)` | POST /api/auth/register |

#### Biens immobiliers

| Methode | Appel API |
|---|---|
| `Api.getRealStates(params)` | GET /api/real-states |
| `Api.getRealState(id)` | GET /api/real-states/:id |
| `Api.getAllRealStates()` | GET /api/real-states/all |
| `Api.getSoldRealStates()` | GET /api/real-states/sold |
| `Api.createRealState(data)` | POST /api/real-states |
| `Api.updateRealState(id, data)` | PUT /api/real-states/:id |
| `Api.deleteRealState(id)` | DELETE /api/real-states/:id |
| `Api.buyRealState(id)` | POST /api/real-states/:id/sell |
| `Api.addPicture(id, formData)` | POST /api/real-states/:id/pictures |
| `Api.deletePicture(id, pictureId)` | DELETE /api/real-states/:id/pictures/:pictureId |

#### Utilisateurs

| Methode | Appel API |
|---|---|
| `Api.getUsers()` | GET /api/users |
| `Api.getUser(id)` | GET /api/users/:id |
| `Api.updateUser(id, data)` | PUT /api/users/:id |
| `Api.promoteUser(id, role)` | PUT /api/users/:id/promote |
| `Api.uploadUserPicture(id, formData)` | POST /api/users/:id/picture |
| `Api.deleteUser(id)` | DELETE /api/users/:id |

#### Agences

| Methode | Appel API |
|---|---|
| `Api.getAgencies()` | GET /api/agencies |
| `Api.getAgency(id)` | GET /api/agencies/:id |
| `Api.createAgency(data)` | POST /api/agencies |
| `Api.updateAgency(id, data)` | PUT /api/agencies/:id |
| `Api.deleteAgency(id)` | DELETE /api/agencies/:id |
| `Api.addManager(agencyId, userId)` | POST /api/agencies/:agencyId/managers |
| `Api.removeManager(agencyId, userId)` | DELETE /api/agencies/:agencyId/managers/:userId |

---

## Gestion de l'authentification côté client

Le token JWT est géré par `public/js/auth.js`. Il est stocké dans le `localStorage` du navigateur sous une clé définie par l'application. Les fonctions `getToken()` et `saveToken()` sont utilisées par `api-client.js` et par chaque page.

Lorsqu'une page protégée est chargée (profil, admin), le script vérifie la présence et la validité du token et redirige vers `/login` si nécessaire.

---

## Pages

### Accueil (/)

Affiche la liste des biens disponibles. Permet de filtrer par prix, surface, catégorie, ville et agence. Chaque bien renvoie vers `/property?id=<id>`.

### Detail d'un bien (/property)

Affiche les informations complètes d'un bien identifié par le paramètre `id` dans l'URL. Les utilisateurs authentifiés avec le rôle `client` peuvent acheter le bien.

### Connexion (/login) et inscription (/register)

Formulaires d'authentification. En cas de succes, le token est sauvegardé et l'utilisateur est redirigé vers la page d'accueil.

### Profil (/profile)

Affiche et permet de modifier les informations de l'utilisateur connecté (nom, email, mot de passe, adresse, photo de profil). Affiche également la liste des biens achetés.

### Panneau d'administration (/admin)

Accessible uniquement aux rôles `admin` et `manager`. Permet de gérer les biens immobiliers, les utilisateurs et les agences. Les actions disponibles varient selon le rôle.
