# Politique de sécurité

> Ce document formalise les règles de sécurité appliquées à l'ensemble de l'infrastructure (siège et agences). Il s'appuie sur les choix techniques détaillés dans les documents [Architecture & Adressage](Architecture_Adressage.md) et [Sécurité & Droits d'accès](Securite_et_droit.md).

---

## 1. Principes généraux

- **Deny by default** : tout flux réseau, tout accès fichier et tout droit applicatif est refusé par défaut. Seuls les flux et accès explicitement nécessaires sont autorisés.
- **Moindre privilège** : chaque utilisateur, groupe ou service dispose strictement des droits nécessaires à son activité, ni plus, ni moins.
- **Défense en profondeur** : la sécurité repose sur plusieurs couches indépendantes (segmentation réseau, pare-feu, AD/GPO, droits NTFS, supervision), de sorte qu'une seule défaillance ne compromette pas l'ensemble du système.
- **Traçabilité** : les flux réseau, les connexions et les actions d'administration significatives sont journalisés et centralisés (Loki/Grafana), pour permettre l'analyse et la détection d'anomalies.

---

## 2. Sécurité réseau

### 2.1 Segmentation

L'infrastructure est segmentée en VLANs selon leur fonction et leur niveau de confiance :

- **VLAN 10 (Serveurs)** : niveau de confiance le plus élevé, accès restreint aux seuls flux d'administration et de service (AD, DNS, DHCP, SMB).
- **VLAN 20 / 30 (LAN utilisateurs)** : niveau de confiance intermédiaire, accès aux ressources internes et à Internet, mais aucun accès direct entre postes utilisateurs ni accès non autorisé aux serveurs.
- **VLAN 50 (DMZ)** : niveau de confiance le plus faible côté exposition, héberge les services accessibles depuis Internet ; isolée du reste du réseau interne sauf flux explicitement requis (supervision, accès aux données).

### 2.2 Pare-feu (pfSense)

- Chaque site (siège, agence) dispose de son propre pare-feu pfSense, point d'entrée unique entre le LAN local et le WAN.
- Les interfaces d'administration des pfSense (WebGUI) ne sont accessibles **que depuis le LAN local**, jamais depuis le WAN.
- Toute exposition de service vers Internet (ex. application web) passe par une règle NAT/port-forwarding explicite et documentée (cf. [Sécurité & Droits d'accès](Securite_et_droit.md)).
- Le blocage par défaut des réseaux RFC1918 sur l'interface WAN est **désactivé uniquement dans l'environnement de maquette** (nécessaire car le WAN de test est lui-même une adresse privée). En production, sur une vraie adresse IP publique, cette protection doit être réactivée.

### 2.3 VPN inter-sites

- L'interconnexion entre le siège et les agences se fait via **OpenVPN** (port `1194/UDP`), avec chiffrement de bout en bout.
- Le siège joue le rôle de **serveur VPN** ; chaque agence dispose d'un **client VPN** dédié.
- Les règles pare-feu n'autorisent, via le tunnel, que les flux strictement nécessaires aux agences (authentification AD, partage de fichiers, accès aux services applicatifs de la DMZ).

### 2.4 IPv6

IPv6 est désactivé sur l'ensemble de l'infrastructure de maquette, pour éviter une double pile non maîtrisée (filtrage incomplet, surface d'attaque accrue). L'ensemble des flux transite en IPv4.

---

## 3. Sécurité des identités (Active Directory / Entra ID)

### 3.1 Annuaire

- Un domaine Active Directory unique (`alc.local`) centralise l'authentification de tous les utilisateurs, siège et agences confondus.
- L'annuaire est synchronisé en mode **hybride** vers **Microsoft Entra ID** (Azure AD), via un connecteur de synchronisation cloud (Cloud Sync) et un compte de service dédié (`admin-sync`) disposant du rôle Administrateur Général **uniquement côté Entra ID**, dans le cadre strict de la synchronisation.
- Le suffixe UPN `alclaboutlook.onmicrosoft.com` est utilisé pour permettre une authentification cohérente côté cloud (le domaine `alc.local` n'étant pas routable).

### 3.2 Comptes et groupes

- Les utilisateurs sont répartis en unités d'organisation par site (`Employes_Siege`, `Employes_Agence_Toulouse`), elles-mêmes subdivisées en 5 pôles métier.
- 5 groupes de sécurité (un par pôle) portent les droits d'accès aux ressources partagées (cf. [Sécurité & Droits d'accès](Securite_et_droit.md)).
- Le compte `admin-sync` et tout compte à privilèges élevés doivent être utilisés exclusivement pour les tâches d'administration correspondantes, et jamais comme compte utilisateur quotidien.

### 3.3 Politique de verrouillage de session

- Verrouillage automatique de session après **5 minutes d'inactivité**, appliqué par GPO sur l'ensemble des postes du domaine.

### 3.4 Restriction des outils systèmes

- Accès au **Panneau de configuration** et à l'**invite de commandes / PowerShell** désactivé par GPO pour les comptes utilisateurs standards, afin de limiter le contournement des politiques de sécurité et l'installation de logiciels non autorisés.

---

## 4. Sécurité des accès aux données

- Le partage de fichiers `DATA$` applique un modèle d'accès par pôle, avec héritage NTFS désactivé et droits explicites par groupe de sécurité (cf. [Sécurité & Droits d'accès](Securite_et_droit.md)).
- Le partage est masqué de la navigation réseau (`$`), réduisant la surface de découverte pour un utilisateur non autorisé.
- L'accès au partage est mappé automatiquement par GPO, évitant toute configuration manuelle source d'erreur ou de contournement.

---

## 5. Sécurité applicative (DMZ)

- Les services applicatifs (site web, base de données, stockage MinIO) sont conteneurisés (Docker) sur une machine Debian 12 dédiée, isolée dans la DMZ (VLAN 50).
- Les certificats TLS de test (mkcert) sont remplacés par des certificats générés via OpenSSL avant toute mise en production / démonstration.
- Les accès d'administration à la DMZ (SSH) sont restreints via une règle NAT dédiée sur le pare-feu du siège, et non exposés de manière permanente.
- Les mises à jour système (Debian, paquets Docker) sont appliquées avant le déploiement des services.

---

## 6. Supervision et détection

- L'ensemble des journaux (logs pare-feu pfSense, journaux Windows Server, métriques systèmes) est centralisé via la stack **Loki / Promtail / Grafana** et **Prometheus / Node Exporter / Windows Exporter**, hébergée dans la DMZ.
- Les règles pare-feu autorisant le passage entre VLANs sont configurées pour **journaliser également le trafic autorisé**, afin d'alimenter les tableaux de bord réseau (cf. [Plan de sauvegarde et supervision](Sauvegarde_Supervision.md)).
- Les tableaux de bord Grafana permettent une analyse rapide des flux acceptés/bloqués et des ressources consommées par chaque machine.

---

## 7. Sauvegarde et continuité

Voir le document dédié : [Plan de sauvegarde et supervision](Sauvegarde_Supervision.md).

---

## 8. Axes d'amélioration identifiés (hors périmètre de la maquette actuelle)

Cette section liste des points connus, à mentionner dans une démarche d'amélioration continue (valorisant pour l'évaluation) :

- **Réactivation du blocage RFC1918** sur les interfaces WAN en cas de passage en production avec adresse IP publique réelle.
- **MFA (authentification multifacteur)** sur les comptes à privilèges et sur l'accès Entra ID, non implémenté dans la maquette actuelle par contrainte de temps/matériel.
- **Politique de mots de passe renforcée** (longueur minimale, complexité, rotation) à formaliser explicitement via GPO (Default Domain Policy).
- **Chiffrement des disques** (BitLocker) sur les postes clients, notamment pour les machines en agence.
- **Sauvegarde hors-site / cloud** des données critiques (cf. [Solution Cloud](Solution_Cloud.md)).
- **Tests d'intrusion / audit de sécurité** périodiques, à planifier une fois l'infrastructure stabilisée.