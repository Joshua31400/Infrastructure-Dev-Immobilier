# Documentation Infrastructure — Projet ALC

> Documentation technique complète du projet d'infrastructure (siège Aix-en-Provence + agence Toulouse), domaine `alc.local`.

## Sommaire

| # | Document | Description |
|:---:|:---|:---|
| 01 | [Architecture & Adressage](docs/INFRA/Architecture_Adressage.md) | Schéma d'architecture réseau, allocation des ressources VM, plan d'adressage IP par VLAN |
| 02 | [Sécurité & Droits d'accès](docs/INFRA/Securite_et_droit.md) | Organisation Active Directory, groupes de sécurité, droits NTFS par pôle, règles pare-feu |
| 03 | [Politique de sécurité](docs/INFRA/Politique_Securite.md) | Principes de sécurité globaux (Deny by default, défense en profondeur, axes d'amélioration) |
| 04 | [Guide de configuration des serveurs](docs/INFRA/Guide_Configuration_Serveurs.md) | Configuration AD DS, DHCP, WDS, Entra ID hybride, Debian DMZ |
| 05 | [Plan de sauvegarde et supervision](docs/INFRA/Sauvegarde_Supervision.md) | Stack Loki/Promtail/Prometheus/Grafana, plan de sauvegarde 3-2-1 |
| 06 | [Solution Cloud](docsINFRA/Solution_Cloud.md) | Propositions d'évolution cloud (sauvegarde externalisée, MFA, PRA) |
| 07 | [Guide de déploiement](docs/INFRA/Guide_Deploiement.md) | Étapes pas-à-pas de mise en place de l'infrastructure complète |
| 08 | [Liste du matériel et budgétisation](docs/INFRA/Budgetisation.md) | Estimation budgétaire matériel, licences et coûts récurrents |

## Structure du dépôt

```
.
│   README.md
│   
├───INFRA
│   │   Architecture_Adressage.md
│   │   Budgetisation.md
│   │   Guide_Configuration_Serveurs.md
│   │   Guide_Deploiement.md
│   │   Politique_Securite.md
│   │   Sauvegarde_Supervision.md
│   │   Securite_et_droit.md
│   │   Solution_Cloud.md
│   │
│   └───images
│
└── src/
    ├── docker-compose.yml
    ├── prometheus.yml
    ├── loki-config.yml
    ├── promtail.yml
    └── pfsense-agence-dashboard.json
```

<h2 id="credits" align="center">Credits</h2>

<div align="center">
    <a href="https://github.com/joshua31400">
        <img src="https://avatars.githubusercontent.com/u/189393167?v=4" alt="Joshua BUDGEN" width="80" height="80" style="border-radius: 50%"/>
    </a>
    <br>
    <p><i>"Adapted and developed by Joshua BUDGEN"</i></p>

<br>

Special thanks to **<a href="https://www.ynov.com/campus/toulouse" target="_blank">Toulouse Ynov Campus</a>**.

</div>

---

<div align="center">
    <p>Copyright © 2026 Joshua BUDGEN. All Rights Reserved.</p>
</div>