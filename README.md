# À La Casa — Plateforme Immobilière & Infrastructure

> Dépôt central regroupant le code source de l'application web "À La Casa" et l'intégralité de la documentation d'infrastructure réseau et système.
Ce projet illustre une démarche DevOps complète : du développement de la solution logicielle jusqu'à son déploiement sécurisé au sein d'une architecture d'entreprise distribuée (Siège à Aix-en-Provence et Agence à Toulouse).

## 🧭 Navigateur du Dépôt

Ce dépôt est divisé en deux grands pôles : le volet **Applicatif (Dev)** et le volet **Infrastructure (Ops)**.

### 💻 1. Pôle Applicatif
Le code source de la plateforme de recherche de biens immobiliers.
* 📂 **`/api`** : Code source de l'API backend (Node.js).
* 📂 **`/web`** : Code source du frontend (HTML/CSS/JS) et interface utilisateur.
* 📂 **`/docker`** : Fichiers de conteneurisation (`docker-compose.yml`), configuration du reverse proxy Nginx et scripts d'initialisation de la base de données.

### 🛡️ 2. Pôle Infrastructure & Sécurité
Toute la documentation technique, les choix d'architecture et les guides de déploiement du réseau d'entreprise.
* 📂 **`/docs/INFRA`** : Point d'entrée de la documentation système et réseau.
  * 📄 [Architecture & Adressage](docs/INFRA/Architecture_Adressage.md) : Topologie réseau, VLANs et adressage IP.
  * 📄 [Sécurité & Droits](docs/INFRA/Securite_et_droit.md) : Matrice NTFS, Active Directory et règles pare-feu pfSense.
  * 📄 [Politique de Sécurité](docs/INFRA/Politique_Securite.md) : Principes de défense en profondeur appliqués à l'entreprise.
  * 📄 [Guide de Déploiement](docs/INFRA/Guide_Deploiement.md) : Procédure pas-à-pas pour remonter l'infrastructure.
* 📂 **`/docs/INFRA/src`** : Fichiers de configuration bruts (Supervision Loki/Prometheus, tableaux de bord Grafana, etc.).

---

<h2 id="credits" align="center">Crédits</h2>

<div align="center">
    <a href="https://github.com/joshua31400">
        <img src="https://avatars.githubusercontent.com/u/189393167?v=4" alt="Joshua BUDGEN" width="80" height="80" style="border-radius: 50%"/>
    </a>
    <br>
    <p><i>"Adapted and developed by Joshua BUDGEN"</i></p>

<br>

Remerciements particuliers à **<a href="https://www.ynov.com/campus/toulouse" target="_blank">Toulouse Ynov Campus</a>**.

</div>

---

<div align="center">
    <p>Copyright © 2026 Joshua BUDGEN. All Rights Reserved.</p>
</div>