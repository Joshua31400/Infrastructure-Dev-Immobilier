# Liste du matériel et budgétisation

> Ce document propose une estimation budgétaire pour le déploiement de l'infrastructure en environnement de production, à partir de la maquette virtualisée décrite dans [Architecture & Adressage](Architecture_Adressage.md). Les montants sont des **ordres de grandeur** (prix publics constatés, hors négociation/remise volume), à affiner avec des devis fournisseurs réels.

---

## 1. Matériel physique (siège)

L'infrastructure de maquette fonctionne sur une seule machine hôte (16 Go RAM / 500 Go), mais une mise en production nécessite une séparation physique minimale pour la résilience et la performance.

| Élément | Rôle | Spécification recommandée | Quantité | Prix unitaire estimé | Sous-total |
|:---|:---|:---|:---:|---:|---:|
| Serveur physique principal | Hyperviseur (héberge VM Windows Server, Debian DMZ) | Rack 1U, CPU 8 cœurs, 64 Go RAM, 2× SSD 1 To (RAID1) | 1 | 2 500 € | 2 500 € |
| Pare-feu matériel (siège) | Routeur/pare-feu pfSense dédié | Appliance type Netgate (4-6 ports) | 1 | 450 € | 450 € |
| Pare-feu matériel (agence) | Routeur/pare-feu pfSense dédié | Appliance type Netgate (2-4 ports) | 1 | 350 € | 350 € |
| Switch manageable (siège) | Segmentation VLAN physique | Switch 24 ports, gigabit, VLAN 802.1Q | 1 | 300 € | 300 € |
| Switch manageable (agence) | Segmentation VLAN physique | Switch 8 ports, gigabit, VLAN 802.1Q | 1 | 120 € | 120 € |
| Onduleur (UPS) | Protection coupure secteur — serveur + pare-feu | UPS 1000 VA | 1 | 200 € | 200 € |
| **Total matériel siège + agence** | | | | | **3 920 €** |

> **Postes clients et imprimantes** : non chiffrés ici, considérés comme déjà en place (parc existant de l'entreprise). À ajouter si renouvellement nécessaire (~700-900 € par poste Windows 11 standard).

---

## 2. Licences logicielles

| Élément | Détail | Quantité | Prix unitaire estimé | Sous-total |
|:---|:---|:---:|---:|---:|
| **Windows Server 2022 Standard** (16 cœurs) | Licence par cœur, contrôleur de domaine siège | 1 | 510 € | 510 € |
| **CAL Windows Server** (Device CAL) | Licences d'accès client, par poste/utilisateur | ~30 | 35 € | 1 050 € |
| **Windows 11 Pro** | OS postes clients (déjà inclus si parc existant en Pro) | — | 0 € (existant) | 0 € |
| **pfSense CE** | Firewall (logiciel libre, open source) | 2 | 0 € | 0 € |
| **Debian 12** | OS hôte Docker (libre, open source) | 1 | 0 € | 0 € |
| **Stack supervision** (Grafana, Loki, Prometheus, Promtail, Node/Windows Exporter) | Versions Community / open source | — | 0 € | 0 € |
| **Microsoft 365 / Entra ID** (plan incluant SSO + MFA) | Abonnement par utilisateur/mois — *cf. section 3, coûts récurrents* | — | — | — |
| **Total licences (achat unique)** | | | | **1 560 €** |

> **Remarque** : les coûts Microsoft 365 / Entra ID (nécessaires pour le SSO hybride et le MFA, cf. [Solution Cloud](Solution_Cloud.md)) sont récurrents (abonnement) et présentés séparément en section 3.

---

## 3. Coûts récurrents (mensuels / annuels)

| Élément | Détail | Coût unitaire | Quantité | Coût mensuel | Coût annuel |
|:---|:---|---:|:---:|---:|---:|
| Microsoft 365 Business Basic (Entra ID + Teams + Outlook) | Par utilisateur, nécessaire pour SSO hybride et MFA | 5,60 €/mois | 30 utilisateurs | 168 € | 2 016 € |
| Connexion Internet fibre (siège) | Débit symétrique pro, nécessaire pour VPN + exposition app web | 60 €/mois | 1 | 60 € | 720 € |
| Connexion Internet fibre (agence) | Pour le tunnel VPN sortant | 45 €/mois | 1 | 45 € | 540 € |
| Sauvegarde externalisée (Azure Blob Storage, tier Cool) | Estimation ~500 Go (données + configs), cf. [Solution Cloud](Solution_Cloud.md) | ~5 €/mois | 1 | 5 € | 60 € |
| Nom de domaine + certificat (si certificat commercial souhaité) | Renouvellement annuel — *(en l'état, OpenSSL auto-signé = 0 €)* | — | 1 | — | 12 € |
| **Total coûts récurrents** | | | | **278 €/mois** | **3 348 €/an** |

> **Maintenance / support** : non chiffré ici (dépend du modèle interne vs prestataire externe). À prévoir : un contrat de support pour le matériel réseau (pare-feu, switch) est généralement recommandé (~10-15 % du coût matériel/an).

---

## 4. Synthèse budgétaire globale

| Catégorie | Montant (première année) |
|:---|---:|
| Matériel physique (investissement initial) | 3 920 € |
| Licences logicielles (achat unique) | 1 560 € |
| Coûts récurrents (année 1) | 3 348 € |
| **Total budget première année** | **≈ 8 828 €** |
| **Coût récurrent les années suivantes** | **≈ 3 348 €/an** (+ renouvellement matériel à amortir sur ~5 ans, soit ~784 €/an) |

> Ces montants constituent une **estimation de référence pour un déploiement à l'échelle d'une PME** (1 siège + 1 agence, ~30 utilisateurs). Ils doivent être affinés par des devis fournisseurs réels avant validation budgétaire définitive. Les coûts liés aux pistes du document [Solution Cloud](Solution_Cloud.md) (MFA — déjà inclus dans Microsoft 365 ci-dessus, supervision cloud complémentaire, PRA Azure VM) sont à ajouter séparément selon les arbitrages retenus.

---

## Voir aussi

- [Architecture & Adressage](Architecture_Adressage.md)
- [Solution Cloud](Solution_Cloud.md)
