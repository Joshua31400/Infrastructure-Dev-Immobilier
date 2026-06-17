# Proposition d'une solution Cloud

> Ce document propose une évolution de l'infrastructure actuelle (on-premise + hybride AD) vers une intégration cloud plus poussée, en s'appuyant sur les briques déjà en place.

---

## 1. Existant : intégration cloud actuelle

L'infrastructure actuelle intègre déjà une première brique cloud :

- **Microsoft Entra ID (Azure AD)** en mode **hybride** : synchronisation de l'Active Directory local (`alc.local`) vers le cloud via Cloud Sync, permettant le SSO sur les services Microsoft 365 (Teams, Outlook, etc.) — cf. [Guide de configuration des serveurs](Guide_Configuration_Serveurs.md), section 5.

Cette base hybride permet d'envisager une extension progressive vers le cloud sans remettre en cause l'annuaire de référence on-premise, limitant les risques et les coûts de migration.

---

## 2. Axes d'évolution proposés

### 2.1 Sauvegarde externalisée (priorité haute)

**Objectif** : respecter la règle 3-2-1 (cf. [Plan de sauvegarde et supervision](Sauvegarde_Supervision.md)) en stockant une copie des données critiques hors site.

**Proposition** : utiliser **Azure Blob Storage** (tier *Cool* ou *Archive* selon la fréquence d'accès) pour :
- les exports `mysqldump` de la base applicative,
- les archives du partage `DATA$` (sauvegarde incrémentale),
- les exports de configuration (pfSense, Docker Compose, dashboards Grafana).

**Avantages** :
- Cohérent avec l'écosystème Microsoft déjà en place (Entra ID).
- Tarification à l'usage, adaptée à une PME.
- Chiffrement au repos natif.

### 2.2 Authentification renforcée (MFA cloud)

**Objectif** : combler le point identifié dans la [Politique de sécurité](Politique_Securite.md) (absence de MFA).

**Proposition** : activer **Microsoft Entra ID Multifactor Authentication (MFA)** pour :
- tous les comptes à privilèges (administrateurs du domaine, `admin-sync`),
- les connexions distantes (agence, télétravail) via VPN ou applications cloud.

Cette fonctionnalité s'appuie directement sur l'infrastructure Entra ID déjà déployée — aucun nouveau composant à provisionner.

### 2.3 Supervision cloud complémentaire (option)

**Objectif** : disposer d'une vue de supervision accessible même en cas d'indisponibilité du site DMZ local (panne réseau siège, etc.).

**Proposition** : exporter périodiquement un sous-ensemble de métriques/alertes critiques vers **Grafana Cloud** (offre gratuite disponible pour de faibles volumes), en complément — et non en remplacement — de la stack Loki/Prometheus locale qui reste l'outil de supervision principal et de coût nul en licences.

> Cette option reste **secondaire** : la stack locale (Loki/Prometheus/Grafana) répond déjà au besoin principal sans coût récurrent. L'intérêt du cloud ici est la **résilience** (accès aux dashboards même si la DMZ est down), pas le remplacement de l'existant.

### 2.4 Reprise après sinistre (PRA) — extension future

**Objectif** : disposer d'un plan de reprise en cas de sinistre majeur sur le site du siège (incendie, panne matérielle complète).

**Proposition** : envisager, à terme, une réplication de la VM Windows Server (contrôleur de domaine secondaire) vers une instance **Azure Virtual Machine**, jouant le rôle de contrôleur de domaine de secours en cas d'indisponibilité prolongée du siège.

> Cette piste est présentée comme une **perspective d'évolution** et non comme un livrable de la maquette actuelle : elle nécessiterait une étude de coûts et de bande passante VPN plus poussée (cf. [Liste du matériel et budgétisation](Budgetisation.md)).

---

## 3. Synthèse — priorisation

| Axe | Priorité | Coût estimé | Complexité | Bénéfice |
|:---|:---|:---|:---|:---|
| Sauvegarde externalisée (Azure Blob Storage) | Haute | Faible (€/mois, à l'usage) | Faible | Conformité 3-2-1, résilience |
| MFA Entra ID | Haute | Inclus / faible | Faible | Sécurité des accès à privilèges |
| Supervision cloud complémentaire | Basse | Faible (offre gratuite possible) | Moyenne | Résilience supervision |
| PRA via Azure VM (DC secondaire) | Basse (perspective) | Élevé | Élevée | Continuité d'activité en cas de sinistre majeur |

---

## Voir aussi

- [Politique de sécurité](Politique_Securite.md)
- [Plan de sauvegarde et supervision](Sauvegarde_Supervision.md)
- [Liste du matériel et budgétisation](Budgetisation.md)
