# Déploiement de l'infrastructure
> Ce fichier reprend chaque étapes réalisée pour la mise en place de l'infrastrucure.

## Sommaire
### Fondation VMware Workstation Pro
*Ce n'est en aucun cas obligatoire de passer par ce virtualiseur mais cette documentation détail des étapes clés liées à ce logiciels*

### Routeur pfSense
*Le routeur sera administé à 100% grâce à l'interface web associé via le navigateur Windows Server 2025.*
* **Configuration Réseau**
* **Règles Par-Feu**

### Windows Server 2025
*Les testes de différents services du contrôleur de domaine se feront sur des clients windows 11 sur chaque services.*
* **Domain Name Service** (DNS):
  * alc.local
* **Dynamic Host Configuration Protocol** (DHCP):
* **Windows Exporter**:
* **Active Directory** (AD):
  * Group Policy Object (GPO)
* **Azure**:
  * Entra ID
  * alclaboutlook.onmicrosoft.com
* **Windows Deploiment Service** (WDS):
* **Windows Exporteur**

### Zone d'émilitarisé (DMZ)
*Hébergera le serveur web, monitoring réseau et ressources via container pour optimiser au maximum les ressources.*
* **Configuration Réseau**
* **Serveur SSH**
* **Docker**
  * Installation
  * Configuration Compose
    * *Loki*
    * *Promtail*
    * *Grafana*
    * *prometheus*
    * *Node Exporter*
* **Configuration Loki**
* **Configuration Promtail**
* **Configuration Prometheus**
* **Configuration Node Exporter**
* **DashBoards**
  * Réseau
    * *Graphique*
    * *Détail*
  * Ressources
    * *DMZ*
    * *Windows Server 2025*  
    * *pfSense*



---



### Fondation VMware Workstation Pro
<u>1. Il faut opérer les configs réseau et créer les switch virtuels via l'éditeur de réseau virtuel:</u>

J'ai donc fait en sorte que:
* **VMnet8** configuré en mode NAT* avec l'option de distribution DHCP cela permettra à mes machines virtuelles d'accéder au WAN*.

* **VMnet1** (exemple pour siège Aix-en-Provence) configuré en mode Host-Only pour permettre la communication entre les machines virtuelles sans accès WAN,
le service DHCP est désactiver pour que le serveur windows s'en charge. 
J'ai aussi enlever le fait de connecter un hôte à un adapteur virtuel pour éviter que mon pc hôte puisse communiquer avec les machines virtuelles.

* **VMnet2** (exemple pour l'agence Toulouse) marche sur exactement le même principe que VMnet1 mais cette fois ci sera connecter au machine dédier.

Cette exemple s'arrête donc ici mais on peut continuer en cascade à chaque nouvelle agence créer.

<u> 2. Maintenant créer les 6 VM nécessaire pour les projets avec leurs ressources adapter 
(voir schéma dans l'architecture).</u>  
Pour un déploiement plus conciencieux je ne met pas encore d'iso à cette étape, à ajouter au moment de la configuration de chaque machine respective.

Voici les liens vers les iso nécessaire plus tard, les versions utiliser ici seront mentionnées:
* **pfSense** : https://www.pfsense.org/download/
* **Debian 12** : https://www.debian.org/download
* **Windows 11** : https://www.microsoft.com/fr-fr/software-download/windows11
* **Windows Server** : https://www.microsoft.com/fr-fr/evalcenter/download-windows-server-2025



---



**Routeur pfSense siège (Aix-en-Provence):**  
<u>1. Installer l'iso de Pfsense ici version stable 2.8.</u>

<u>2. Configuration:</u>

* Prendre défaut Auto (ZFS) et installer.  
*Système de fichiers moderne recommandé par défaut.*

* Ensuite type de configuration de disque (vdev), avec stripe.  *La virtualisation permet de se passer de RAID.*

* **Important :** Le disque dur virtuel va apparaître dans une liste il faut le sélectionner (il s'appelle souvent da0 ou vtbd0).

- Conclure en détruisant les données et redémarrage machine.

* Maintenant aller dans la configuration ip (touche 2) et renseigné l'adresse ip en fonction du plan d'adressage definie(pland'adressage) et retirer dhcp car win srv s'en occupera.  

*Dans cet environnement virtualisé sous VMware, IPv6 n’est pas déployé afin d’éviter les problématiques liées à la double stack (surface d’attaque étendue, filtrage incomplet, incohérences de routage). L’ensemble des flux étant maîtrisé en IPv4 via le VPN, l’activation d’IPv6 n’apporterait pas de valeur fonctionnelle à ce stade.*  

<u>Test configuration réseau:</u> avec navigateur de la machine physique entrer ip du routeur pour voir si elle apparaît si oui erreur de configuration réseau.  
*Seul les machine dans l'infrastructure auront accès à l'interface.*



---



**Windows server 2025:**  
<u>1. Installer l'iso ici version stable 2025.</u>  

**Astuce:** 
* <a id="bypass-oobe">Bypass OOBE:</a> On peut passer l'expérience windows de démarrage avec shell (Shift + F10) et entrée la commande suivante:
```cmd
OOBE\BYPASSNRO
```
* Accèder à Executer pour passer par des commandes et éviter la navigation dans les interfaces windows (windows + r).

<u><a id="config-rs-win">2. Configuration:</a></u>  

* Dans le bureau avec Executer:  
```
ncpa.cpl
```
Ensuite dans les propriétés de la carte réseau, insérer ladresse du plan d'adressage et la passerelle et serveur dns du routeur siège.

![Configuration réseau windows serveur](images/configuration_réseau_win_srv.png)

<u>Test configuration réseau:</u> Nous somme dans le meme réseau que le routeur pfsens et nous pouvons donc accèder à son interface depuis le navigateur a son adresse.

<u>3. Configuration du routeur depuis navigateur:</u>

* Aller à `http://adresse.routeur` ici `http://10.0.10.10`.

* Indentifiant par défaut: 
  * nom: admin 
  * mot de passe: pfsense

* Configuration génrale du routeur (voir les images ci-dessous)
**Block RFC1918 Private Networks: Désactiver ABSOLUMENT !** 
*Par défaut, un pare-feu bloque les adresses IP privées arrivant sur son interface publique (WAN). Or ici, puisque l’environnement tourne sur VMware derrière une box Internet, l’adresse WAN utilisée est elle-même une adresse privée.
Si cette option reste activée, pfSense bloquera tout simplement votre propre accès à Internet.*

`Système/Configuration Générale`
![Configuration Générale du routeur pfSense siège depuis interface web](images/CONFIG_GENERALE.png)

`Interfaces/WAN`  
![Configuration Générale WAN du routeur pfSense siège depuis interface web](images/WAN_SIEGE_CONFIG.png)

<u>Test configuration réseau:</u> sur navigateur rechercher google.com si cela fonctionne la machine à un accès WAN.

* Verifier les mise a jour et redémarer le routeur.

* Création des VLANs: Depuis le menu d'assignation d'interface aller créer de nouvelles VLANs.

**Configuration VLAN 20:**  
`Interfaces/VLANs`
![Configuration VLAN 20](./images/vlan_20.png)

**Configuration VLAN 50:**  
`Interfaces/VLANs`
![Configuration VLAN 50](./images/vlan_50.png)

* Ajouter ensuite les deux VLAN aux interfaces d'assignations.  `Interfaces/Assignation d'interfaces`

* Créer deux nouvelles interfaces (USERS & DMZ) pour ajouter la configuration suivante.  

`Interfaces/USERS (em1.20)`  
![Configuration d'interface VLAN assigné](images/INTERFACES_ASSIGNATION_VLAN_USERS.png)

**Resultat attendue:**  
![Résultat](./images/interfaces_vlan_configurer.png)

* Avant de conclure il faut créer de nouvelles règles par feu qui permetrons à toutes les interfaces de communiquez entre elle si elle le souhaite (pour faciliter la phase de mise en place).

**Pour chaque VLANs:**
![Règle parfeu](./images/full_acces_parfeu_test.png)



---



**Windows serveur 2025 Active directory (AD):**
<u>1. Fondation système:</u>

* Renommer l'ordinateur par un nom cohérent ici `SRV-AD-SIEGE`.

<u>2. Installation du service Active Directory:</u>

* Depuis le gestionnaire de serveur ajouter une nouvelle fonctionnalitée (Service de domaine active directory).

* Commencez la configuration de déploiement du domaine en ajoutant une nouvelle forêt avec le nom de domaine (alc.local), continuer jusqu'à l'installation sans prêter attention à la délègation DNS.

<u>3. Installation du service DHCP:</u>

* Ajout une nouvelle fonctionnalitée (Serveur DHCP). 

* Bien pensée a terminer en sélectionnant le serveur windows pour utiliser DHCP dans Active directory.

<u>4. Configuration du service DHCP:</u>

* Créer les pool dans l'outil DHCP pour chaque VLANs avec l'étendue définie dans le plan pareil pour les exclusions (ici aucune).

* Un bail de 8 jours suffira (défaut).

* Ensuite ajouter la passerelle pour que tout le monde puisse bien communiquez avec le serveur windows.

<u>5. Relais DHCP routeur siège:</u>

* Aller dans l'interface pfsense et activer un relais DHCP pour le passage de configuration réseau.

![DHCP relais](./images/dhcp_relay.png)

<u>Test Active Directory:</u> Il faut configurer le client du siège.



---



**Client Siège windows 11**  
<u>1. Installer l'iso de Windows 11 ici version stable 25H2</u>  

**Astuce:** 
* On peut passer l'expérience windows de <a href="#bypass-oobe">démarrage.</a>

**Dépanage**:  
<a id="cli-vlan">Connection client - VLAN:</a> J'ai rencontrer un problème pour connecter le client siège à la VLAN USER à cause de la carte réseau intel qui n'avait pas le paramètre adapter.

* Dans les dossier de stockage de la VM spécifiquement dans le fichier format .vmx.

* Dans le fichier ligne (ethernet0.virtualDev = "e1000e") remplacer par (ethernet0.virtualDev = "vmxnet3") l'option VLAN ID dans les propriétés de la carte réseaux est disponible on peut connecter la VM à la VLAN USER.  

* Une fois le paramètre sélectionner il faut y ajouter le numéro de la VLAN 

* Ensuite via cmd redémarrer la configuration réseau de la machine:
```cmd
ipconfig /renew
```

<u>Test du dépanage:</u>

* Depuis le cmd vérifier si les adresses coïcide avec celle imposer par le server Windows:
```cmd
ipconfig /all
```

* Tester la conexion au domaine avec un ping du domaine:
```cmd
ping 10.0.10.10
```

* Tester la connexion WAN via la rcherche `google.com`.

<u>2. Configurations:</u> 

* Toujours dans le client renommer le et ajouter le domaine comme configuration statique pour une plus grande fiabilité.

![Configuration final avec domaine et nom](images/nom_domaine_client_siege.png)

* Après la configuration une fenêtre vas intéroger sur notre rôle, le but est de rentrer ses identifiant administrateur Active Directory pour que la machine fasse officiellement partie du domaine après redémarrage.


---


**Windows serveur 2025 AD:**  

<u>1. Configuration du service Atcive Directory:</u> 

* Créer une unité d'organisation pour nos machine client employées dans notre domaine.

`Utilisateurs et ordinateurs Active Directory`
![Interfaces de création et de gestion des groupes Active Directory](images/unite_orga_winsrv.png)

* Ici mettre en place deux unité d'organisation dans celle de l'entreprise pour le siège et l'exemple agence cela permettra une gestion plus avancée et précise.

* Créer ensuite un utilisateur teste dans chaque unitée

<u>Test client Active Directory:</u> Rallumer le client siège, dans autre utilisateur au démarage il devrait etre ALC domaine et le but est de se connecter avec l'utilisateur test.

`Utilisateurs et ordinateurs Active Directory/alc.local/ALC_Entreprise/Employes_Siege`
![Configuration Active Directory avec unités d'organisations séparées](images/USER_UNITE_ORGANISATION.png)


---


**Routeur Agence Toulouse**  
*La partie agence marchera sur le même principe que le siège c'est un exemple de fonctionnement qui peut être appliqué auntant de fois que d'agence sera créer. Se référer à la configuration routeur Siège*

<u>1. Installer l'iso de Pfsense ici version stable 2.8.</u>

<u>2. Configuration:</u>

* Ajouter l'adresse LAN uniquement du plan d'adressage


---


**Client Agence Windows 11**  

<u>1. Installer l'iso de Windows 11 ici version stable 25H2</u>  

**Astuce:** 
* On peut passer l'expérience windows de <a href="#bypass-oobe">démarrage.</a>

**Dépanage**:  
J'ai rencontrer un problème pour <a href="#cli-vlan">connecter le client siège à la VLAN USER </a> à cause de la carte réseau intel qui n'avait pas le paramètre adapter.

<u>2. Configurations:</u> 

* Lancer le client et via navigateur accèder à l'interface pfsense avec l'adresse LAN configuré.  
*L'interface n'est pas accessible depuis les pc du Siège grâce à la segmentation du réseau.*

* Suivez maintenant la configuration de windows serveur pour la <a href="#config-rs-win">configuration réseau étape deux</a> en suivant toujours le plan d'adressage avec rigueur.


<u>3. Configuration du routeur depuis navigateur:</u>

* Aller à `http://adresse.routeur` ici `http://10.1.10.10`.

* Indentifiant par défaut: 
  * nom: admin 
  * mot de passe: pfsense  

**Block RFC1918 Private Networks: Désactiver ABSOLUMENT vital pour le VPPN !**

* Serveur DHCP pour ne pas laisser le VPN comme single point of failure 

* Adresse du serveur DNS même si il ne communique pas encore au moins c'est fait pour plus tard.

`Services/DHCP Server/LAN`  
![Configuration du serveur DHCP routeur agence](images/dhcp_config_pfsense.png)

* Une fois la configuration terminé retourner dans les propriétés de la carte réseau interface étape 2, et remettre l'adresse servit automatiquement.


---


**Windows Serveur 2025 Réseau privé virtuel (VPN)**

<u>1. Configuration du VPN</u>

* Configuré le VPN comme sur l'image suivante.

* Une fois sauvegarder retourner dans l'interface pour voir la clé générer et enregistrer la, elle sera nécessaire pour configuré les clients VPN.

`Services/DHCP Server/LAN`  
![Configuration du server VPN sur le routeur siège](images/vpn_config_siege.png)

<u>2. Configuration du per-feu pour le VPN</u>

* Dans l'interface du routeur siège aller ajouter une nouvelle règles par feu, l'objectif est de laisser passer sur le port 1194 notre tunnel VPN par le Wan.

`Par-feu/Nouvelle règle`  
![Firewall config VPN siege](images/config_firewall_vpn_siege.png)


---


**Client Agence Windows 11 VPN**  
Client agence interface routeur client VPN:
Aller dans l'interface client VPN et mettait les même config que sur le serveur sauf la génération de clés pour y coller celle du serveur siège a la place et aussi dans les tunnel ajouter comme adresse distante celle de tout les VLAN avec les quelle l'agence doit communiquez.
Aller faire une règle parfeu pour laisser passer les connexion VPN qui sont bloqué par défaut. (Pareril pour le routeur siège)
![Firewall routeurs passage VPN](images/autorisation_vpn_config_routeurs.png)
Si tout est bien fait adressage copie des clés et règle par feu si vous vous rendez dans la section status de OpenVPN ce devrait etre UP. Le teste final sera de ping le server windows serveur si c'est OK alors les configuration domaine pouront être étendue aux agences via ce VPN, la connexion WAN devrait marcher dans le client agence tester sur le navigateur (pour après teste de ping le domaine).

Windows server 2025 config AD pour agence:
Aller dans le gestionnaire AD et dans l'unité d'organisation précédement créer ALC_Entreprise créer une nouvelle unitée d'organisation (Employes_Agence_Toulouse) et dedans un nouvelle utilisateur pour la jonction du client au domaine.

Client agence:
Rendez-vous propriétés du système et renommer la machine (PC-AGENCE-01), et aussi cocher l'option domaine et insérer le nom du domaine (alc.local) et l'ordinateur devra redémarrer après vérification.
Choisissez autre utilisateur et mettez les identifiant fraichement créer dans la nouvelle unité d'organisation et le client fera maintenant partie du domaine dans le bon endroit(Parfait pour les future GPO).

Windows serveur 2025 GPO teste wallpaper:
Cette étape est l'avant dernière avant l'intégration du server docker pour le monitoring et l'application.
Dans un premier temps nous allons mettre en place les fonds d'écran obligatoire pour repérer en un coup quelle client viens d'ou donc j'aurai deux image.
Aller dans la racine du serveur crer un dossier de partage et dedans mettre les image. Et ensuite dans les propriétés de partage avancée coher que ce dossier est partager en lecture à tout le réseau (chemin réseau exemple: \\SRV-AD-SIEGE\Partages_Entreprise\Fonds_Ecran\siege.jpg).
Aller dans l'outil de gestion de stratégie de groupe, déscendez l'arbre jusqu'au siège et faite click droit et ajouter une règle GPO nommer la par votre règle WallPaper en l'ocurence et ensuite click droit modifier et aller chercher la règle souhétez (processuce identique pour chaque nouvelle règle).
Pour le fond d'écran aller dans Configuration utilisateur > Stratégies > Modèles d'administration > Bureau > Bureau > Papier peint du Bureau, activer le et nommer le par le chemin réseau vu ci-dessus.
![GPO Wallpaper](images/gpo_wallpaper.png)
Répéter l'opération pour l'unité d'organisation de l'agence.

Debian docker DMZ:
Démarrer la machine debian (iso debian 12) et commencer les configuration en skipant la partie configuration réseau on la fera plus tard fait les user root et usuel, cochez pour les utilitaire de base système et c'est tout la machine se relance.
Connectez vous en root, aller dans le fichier `/etc/networks/interfaces` et ajouter la configuration suivante:
```
auto ens33.50
iface ens33.50 inet static
    address 10.0.50.10/24
    gateway 10.0.50.254
    dns-nameservers 1.1.1.1 1.0.0.1
    vlan-raw-device ens33
```
Ensuite redémarrer le service réseau `sytemctl restart networking` et faite un `ping google.com`pour tester la connexion réseau si la machine renvoie un echec temporaire dans la résolution du nom voir mini tuto en dessous.
(SI DEBIAN 12 NETISNT: le problème vient du fait que la machine n'aillant pas eu de configuration réseau le fichier annuaire de DNS ne résoue pas les nom en adresse alors aller dans `/etc/resolv.conf` ou créer le si pas présent et ajouter dedans:
```
nameserver 1.1.1.1
nameserver 1.0.0.1
```
Une fois fait redémarrer le service réseau et tester `ping google.com`).
Ensuite avant tout mettre a jour le systeme `apt update && apt upgrade -y`.
(ATTENTION NETISNT gène aussi pour apt car il pointe sur le CD-ROM local au lieu des serveurs mirroir debian alors aucune installation distante possible donc aller dans `/etc/apt/sources.list` et commenter la ligne 1 la seul présente qui pointe sur le disque local et ajouter les adresses des 3 dépots debain officiels:
```
deb http://deb.debian.org/debian/ bookworm main non-free-firmware
deb http://security.debian.org/debian-security bookworm-security main non-free-firmware
deb http://deb.debian.org/debian/ bookworm-updates main non-free-firmware
```
Une fois fait relancer la mise à jour tout devrait fonctionner).
Passons maintenant a l'installation de docker `apt install docker.io docker-compose -y`et ensuite l'activer au démarage `systemctl enable --now docker` et tester pour voir si elle sont bien installer avce `docker --version && docker-compose --version`.
L'étape suivante sera la partie codage je ne détaillerai pas la réflections je vais partager le fichier compose et j'associerai une documentation.
Pour simplifier l'administration de machine j'install un serveur ssh pour que ma machine personnel puisse s'y connecter.

Tuto serveur SSH: 
Installer avec `apt install openssh-server -y` verifier `systemctl status ssh` et lancer le service au démarage `systemctl enable ssh`.
(ATTENTION RÉSEAU: La configuration stricte du réseau empêche par défaut la connexion depuis notre machine physique au réseau alors aller dans le routeur de l'agence pour ajouter une nouvelle règle par feu NAT voir image).
Pour se connecter à la machine il faudra donc entrer la commande `ssh dmz@192.168.5.144`il pointera la config routeur avec "ssh" et saura avec username qu'il faudra pointer sur la machine server docker. L'adresse est la WAN du routeur siège justement.
![SSH for dmz](images/config_firewall_ssh.png).

Windows serveur 2025 moniteur réseau:
Avant de config les containeur on va activer le service de monitoring du trafic réseau via l'interface routeur siège depuis le serveur windows.
Rendez vous dans les paramètre des journeaux systeme et aller cocher l'activation de la journalisation distante et renseigner l'adresse du serveur docker debian et le port de Promptail qui s'occupera de les réceptionner.

Debian dmz docker:
On commence par créer un dossier qui centralisera les config monitoring.
```
mkdir -p /opt/monitoring/config
cd /opt/monitoring
```
On creer le fichier de config loki.
```YML
auth_enabled: false

server:
  http_listen_port: 3100

common:
  instance_addr: 127.0.0.1
  path_prefix: /tmp/loki
  storage:
    filesystem:
      chunks_directory: /tmp/loki/chunks
      rules_directory: /tmp/loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h
```

On enchaine avec la config promtail.
```YML
server:
  http_listen_port: 9080
  grpc_listen_port: 0

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: syslog
    syslog:
      listen_address: 0.0.0.0:1514
      listen_protocol: udp
      idle_timeout: 60s
      label_structured_data: yes
      labels:
        job: "pfsense-logs"
    relabel_configs:
      - source_labels: ['__syslog_message_hostname']
        target_label: 'host'
```

On fini par faire le docker compose pour (plus tard il évoluera pour la config ressources.)
```YML
services:
  loki:
    image: grafana/loki:latest
    container_name: loki
    volumes:
      - ./config/loki-config.yml:/etc/loki/local-config.yaml
    command: -config.file=/etc/loki/local-config.yaml
    ports:
      - "3100:3100"
    restart: unless-stopped

  promtail:
    image: grafana/promtail:latest
    container_name: promtail
    volumes:
      - ./config/promtail.yml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml
    ports:
      - "1514:1514/udp"
      - "1514:1514/tcp"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=AdminYmmo2026!
    restart: unless-stopped
```
On teste avec la commande de lancement `docker-compose up -d` voir si une erreur est présente `docker ps`.

HOT FIX: J'ai mit comme serveur DNS depuis mon windows serveur diretement au lieux de pfsense car c'est plus fiable pour ça aller dans l'outil DNS et dans les propriétés de redirections enlever l'adresse local et mettre 1.1.1.1 et 8.8.8.8.
![winsrv_dns_config](images/config_dns_winsrv.png).

Après avoir injecter notre configuration il faut ajouter à tout prix une configuration sur l'envoie des données de journaux c'est le format. Il faut le standart promtail RFC 5424, voir image.
![Format_transfer_de_donnée_journaux](images/format_envoie_log_routeur.png)
Il faut aussi faire en sorte que le parfeu journalise les logs même autorisé qu'il ne fait pas par défaut pour économiser de l'space disque mais nous stockons dans Loki et nous voulons une visualisation pro.
Pour ça aller dans la règle parfeu de la DMZ et LAN qui autorise le passage de cette VLAN dans le réseau et ajouter dans les options additionnelles et cochez `journaliser les paquets générés par cette règles`.

Ensuite rendez vous sur l'adresse de la dmz sur navigateur windows server et aller sur le port configuré pour (:3000) et connecter vous avec vos logs définie admin et aller ajouter la data sources loki.
![datasource_loki](images/datasource_loki_grafana.png)

Et aller dans explore voir si vous pouvez ajouter des filtre de requête "jobs" etc... si oui c'est tout bon.
On va donc pouvoir faire un dashboard pour rendre la lecture des logs agréable (sinon csv et c'est pas claire).

Place à la création des dashboards pour la visualisation du réseau il seront deux, un pour visualiser sous forme de graphique le nombre de passage et blockage et un tableau détailler "format excel" pour voir précisément chaque requête.

Dashboard graphique:
![Dashboard réseau graphique](images/tableau_graphique_réseau.png)
Pour créer ce tableau il faut déjà choisir le format et ce sera au format time series et on devra lui passer deux requête celle de la somme des blocker `sum(count_over_time({job="pfsense-logs"} |= "block" [1m]))` et la somme de requête accepter `sum(count_over_time({job="pfsense-logs"} |= "pass" [1m]))`. Ensuite les deux courbes se dessineront directement il manquera que a personnaliser le dashboard comme souhaiter.

Dashboard détail:
![Detail reseau dashboard](images/dashboard_detail_reseau.png)
Cette fois ci il faudra lui passer une seul requête plutôt technique (merci ChatGPT) qui va display notre format définie de de data et depuis notre propre affichage on peut récupérer uniquement le résultat dans notre propre case labéliser.
```
{job="pfsense-logs"} 
| pattern "<_>,<_>,<_>,<_>,<interface>,<_>,<action>,<_>,<_>,<_>,<_>,<_>,<_>,<_>,<_>,<_>,<_>,<_>,<src_ip>,<dst_ip>,<src_port>,<dst_port>,<_>"
| line_format `{"Action":"{{.action}}", "Source":"{{.src_ip}}", "Destination":"{{.dst_ip}}", "Port":"{{.dst_port}}"}`
```
Ensuite dans transformation il faut créer une extractions des champs avec source la ligne Line et le format JSON et ensuite la deuxième transformation l'organisation pas nom de champs et on garde nos 4 champ créer dans la requête "Action, Source, Destination, Port".
Reste plus que à styliser et c'est opérationnel.


Maintenant place à la configuration du monitoring des ressources utilisers par les machines (node_exporter / Prometheus / grafana):
Alors il faut donc aller dans la dmz pour créer les fichier de configuration. Commencon par prometheus.
Aller créer `nano /opt/monitoring/config/prometheus.yml` et dedans mettez:
```YML
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'debian-dmz'
    static_configs:
      - targets: ['node-exporter:9100']
```
Ensuite il faut mettre à jour le compose pour les nouveau containeurs `nano /opt/monitoring/docker-compose.yml` et coller:
```YML
prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
    ports:
      - "9090:9090"
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'
    ports:
      - "9100:9100"
    restart: unless-stopped
```
Ensuite aller à la racine où le fichier compose se trouve et tapez `docker-compose up -d` pour démarrer les nouvaux services.
Une fois fait `docker ps` pour voir si tout tourne bien.

Ensuite rendez vous windows server et retourner dans l'interface grafana et aller ajouter une nouvelle data source avec l'adresse `http://prometheus:9090` et si l'enregistrement est vert tout est bon.

Aller crer un nouveau dashboard mais avec l'import de node_exporter_full qui à une config complète déjà fait pour cela insérer l'ID 1860 et tout se fera seul. On a desormais en directe les ressources de la dmz on poura plus tard opérer plus de machine.

Montieur windows serveur:
Ouvrir cmd en admin et tapez pour avoir windows exporter:
```BASH
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ApiUrl = "https://api.github.com/repos/prometheus-community/windows_exporter/releases/latest"
$DownloadUrl = (Invoke-RestMethod -Uri $ApiUrl).assets | Where-Object { $_.name -match "amd64\.msi$" } | Select-Object -ExpandProperty browser_download_url

Invoke-WebRequest -Uri $DownloadUrl -OutFile "C:\windows_exporter.msi"

Start-Process -Wait -FilePath "msiexec.exe" -ArgumentList "/i C:\windows_exporter.msi /qn"

New-NetFirewallRule -DisplayName "Prometheus Windows Exporter" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 9182
``` 
Allez voir via navigateur si les metrics sont bien générés à cette adresse `http://localhost:9182/metrics` 

Aller dans l'interface routeur et ajouter une règle parfeu pour le passage des metrics de windows server.
![Firewall allow metrics](images/firewall_regle_monitoring_winsrv.png)

Ensuite dans la dmz ajouter dans mrometheus.yml:
```
- job_name: 'windows'
    static_configs:
      - targets: ['10.0.10.10:9182']
```
Redémarrer le service `docker-compose restart prometheus`.
Pour vérifier il y à une page dédier pour les adresse target de prometheus à `http://10.0.50.10:8080/targets`.

Importer un dashboard metric windows:
Pour cela on ira importer un nouveeau dashboard dans grafana avec ID 23942 et normalement tout devrais être up.

J'avais un big parasite le DHCP6 qui tourne en rond car pfsense n'arrive pas à communiquer avec son serveur de mise à jour a cause de son IPV6 (jai pas bien compris plus que ca).

Installer node exporteur sur le routeur du siège et aller activer le service.

Ensuite retour sur la dmz on vas dans prometheus.yml et on ajoute:
```YML
- job_name: 'pfsense-agence'
    static_configs:
      - targets: ['10.0.10.254:9100']
```
On sauvegarde et ensuite restart docker et voila aller dans le fichier des target et normalement pfsense-agence devrait apparaitre.
Ensuite sur grafana aller créer un dashboard en important le fichier dans src:
[config dashboard pfsense](../src/pfsense-agence-dashboard.json)


Microsoft Entra ID (Azure AD) sur windows server:
L'intéret et de centraliser un SSO pour tout les services microsoft en plus des sessions (teams, outlook ...).
Il faut aller sur `entra.microsoft.com` et créer un utilisateur dédier pour l'admin de ce domaine. Aller dans Microsoft Entra ID et le domaine principale devrais s'afficher `alclaboutlook.onmicrosoft.com`.
Pour la config on doit ajouter une suffixe UPN fictif au domaine car alc.local n'est pas routable et sera renommer par quelque chose de non cohérent si on ne touche pas au domaine pour avoir un résultat ciblé.
Alors sélectionner l'outil de domaines et approbations AD, aller dans les propriétés de l'outil et renseigner dans autre suffixes UPN: `alclaboutlook.onmicrosoft.com` ce domaine car c'est fourni gratuitement par microsoft.
Ensuite aller dans les utilisateurs et ordinateurs AD et choisissez un utilisateur pour tester ensuite aller dans l'onglet compte d'un utilisateur et la où est renseigner le domaine alc.local ouvrez le menu déroulant et le nouveau domaine devrais apparaitre sélectionner le.
Avant d'installer l'agent on crer un nouvelle utilisateur dans Entra ID "admin-sync" avec comme rôle admin générale pour qu'il s'occupe de la synchronisation AD.
Rendez vous dans Azure dans > Entra Connect > Cloud Sync, aller dans les outils de supervisions et sélectionner l'agent pour ensuite installer le .exe localement.
Connecter vous avec l'utilisateur créer pour l'occasion nous `admin-sync@alclaboutlook.microsoft.com` ensuite créer un gMSA et mettez vos idenfiant windows serveur 2025.
Une fois fait retrourner dans l'interface Azure Entra et dans le menu de synchronisation cloud créer une nouvelle config et normalement grâce à l'agent le domaine devrait être répertorier et créer le.
Une fois fait aller dans cloud sync à nouveau et dans approvisionnement à la demande aller chercher via DN name du client teste sa présance.
Tuto trouver le DN: outils>utilisateurs et ordinateurs AD > Affichage > Fonctionnalités avancée > aller trouver l'utilisateur de teste avec le domaine et clicker deux fois dessus pour le menu des propriétés et aller dans l'éditeur d'attributs et aller trouver Distinguish Name et copier le tout. Mettez le ensuite dans la source de provisionnement et bingo si tout est bien config.
Ensuite aller dans vue d'ensemble pour verifier et activer.
Pour être sur aller dans les utilisateur de Azure Entra et normalement il devrait apparaître, tout est maintenat OK l'infrastructure est désormais hybride !!!


WDS Windows serveur:
On va procéder au déploiement du service qui se chargera de proposer une image système (os > iso dans notre cas) à une machine dès son démarrage, pour enlever la manipulation humaine et gagner du temps.
Tuto nouveau disque:
Pour commencer on doit préparer notre VM windows serveur pour quelle puisse supporter la configuration.
Arrêter la VM, dans les paramètre de la VM depuis le virtualiseur ajouter un nouveau disque dure NVMe de 80Go.
Redémarrer la VM, dans le gestionnaire de disk un wizzard devrais apparaitre automatiquement continuer avec GPT. Aller créer un nouveau volume simple depuis le disk nouvellement créer qui n'est pas alloué en NTFS et formater avec lettre D: ou E: (pas important).

Retourner dans le serveur pour ajouter un nouveau rôle `Service de déploiement Windows` avec ces fonctionnalités nécessaire, et installer.
Aller ensuite dans l'outil de déploiement windows pour aller configurer le serveur depuis l'interface, intégrer active directory, sélectionner un nouveau disque dur E:\RemoteInstall, penser a bien cocher les deux case pour le DHCP car il fait serveur DHCP et WDS, ensuite pour les paramètre PXE on veux répondre à tout le monde connue et inconnue et on veux aussi exiger l'approbation de l'administrateur pour une sécurité supplémentaire.
Il faut maintenant reprendre notre iso windows 11 client clicker dessus pour autoriser notre machine à l'ouvrir et avoir accès à boot.wim, dans le disque dossier sources et prennez boot.wim.
Maintenant aller ajouter une image d'installation et créer un groupe d'image, aller chercher le fichier install.wim dans le même dossier sources, ensuite garder la version pro normal, et aller démarrer le serveur en clickant dessus.
Pour tester si WDS marche on créer une nouvelle VM sans ISO, on récupère son adresse MAC via les paramètre de l'hyperviseur, on vas sur l'outil dhcp de windows serveur et dans l'étendue des utilisateur on fait une nouvelle réservation pour les future clients PXE.

Sur WINDOWS SERVER DROIT DES EMPLOYER EN FONCTION DE LEURS POLE:  
Installation du serveur de fcihier:
Ajoutée un nouveau disk virtuel a la VM et monter le.
Dans le nouveau volume créer un dossier DATA et dans propriétés > onglet Partage > Partage avancé cochez "Partager ce dossier" et nommeez le partage DATA$.
(Le symbole $ rend le partage invisible sur le réseau. Les utilisateurs ne verront pas le dossier "racine", ils verront directement leurs dossiers de pôles via un lecteur réseau.)
Dans les autorisations il est absolument nécessaire d'activer le contôle total pour tout les user pour les restrictions seront appliqué au sous dossiers.

Dans utilisateurs et ordinateur AD  
Créer les 5 groupes pour respecter les règles de sécurités et droits imposées [ici](securite_droits.md)
![alt text](images/GROUPE_SECURITE_ACCESS_AD.png)

Ensuite dans l'unité d'organisation créer plus tôt nous avions configuré deux sous unités celle du siège et celle de l'agence toulouse le but est que dans chaqu'une il y ai les 5 pôle pour séparer les droits des utilisateurs en fonction de leur poste en unité d'organisation.  
![alt text](images/UNITE_ORGA_SIEGE_AD.png)

Créer maintenant un utilisateur par pôle pour les phase de testes.

Ensuite dans les propriétés>membre d'un groupe de sécurité ajouter les utilisateurs en fonctions des droits souhaitez
![alt text](images/PROPRIETE_GROUPE_AJOUT.png)

Ensuite DRV dans le dossier Partage_Entreprise créer pour l'application des GPO comme wallpapper.
Il faut dedans créer 5 dossiers nommés comme les pôles.
![alt text](images/DOSSIER_POLE_ACCES.png)

IT-Support > Propriétés > Onglet Sécurité > Avancé et commencez par désactiver l'éritage en convertissant celle hérité. Maintenant personne sauf admin à accès au dossier par défaut. Il faut impérativement que l'interface ci dessou ne comporte pas d'user lambda. Il va falloir maintenant ajoutée les droits de chaque pôle en fonction du plan.
![alt text](images/PROPRIETE_DOSSIER_POLE_DROITS.png)

Répéter l'opération pour chaque dossier et aller dans un clien win11 voir si dans le dossier entreprise en fonction des client AD choisit les droits sont bien respecté.

Connexion du client au disque S: pour récupérer les dossier d'affichage.  
Ouvre l'Explorateur de fichiers sur le client.  
Fais un clic droit sur Ce PC dans la barre de gauche.  
Choisis Connecter un lecteur réseau....  
Choisis une lettre (ex: S: pour Service ou P: pour Pôles).  
Dans "Dossier", tape : \\10.0.10.10\DATA$ (ou le nom de ton partage).  
Coche "Se connecter lors de la connexion".

Ajoute de l'app dans la DMZ:
Pour commencer installer git sur la DMZ pour clone le repo de l'app. `apt-get install git -y`.
On retourne dans /opt/ et on clone le repo avec git clone (url).
On va tout d'abord edit les .env et aussi un peu le compose pour passer tout les adresse mise en localhost vers les adresse de la DMZ pour pointer dessus en réseau.
On enlève les certificats tests mkcert pour des vrais OPENSSL avec cette commande:
```
 openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
-keyout docker/nginx/certs/localhost-key.pem \
-out docker/nginx/certs/localhost.pem \
-subj "/CN=10.0.50.10"
```
Après aller dans la racine du compose pour taper la commande `docker-compose up -d` pour lancer les containeur et OP l'app est dispo pour tout l'infra a l'adresse de la dmz.

App accesible WAN grace à un port forwarding routeur siège:
Dans interface routeur siège via win ad, parfeu>nat et créer une règle comme sur l'image ci-dessous.
![Règle par feu pour accès WAN](images/PARFEU_APP_ALLOW.png)

Règle GPO armonisation:
Plus tôt lors de la config des clients et leurs connexion au disque de donnée de win srv on a rencontrer un problème c'est de devoir aller les connecter manuellement au server de fichier mais une règle GPO existe pour automatiser cette manipulation nous allons donc commencer par cela.
Aller dans l'éditeur de gestion de stratégie de groupe et créer une nouvelle règle GPO pour les utilisateur et aller dans `Configuration utilisateur > Préférences > Paramètres Windows > Mappages de lecteurs`. Mapper un nouveau lecteur avec la config comme sur l'image suivante.
![GPO mappage lecteur](images/GPO_MAPPAGE_LECTEUR.png)

Maintenant règle GPO pour le verouillage automatique des sessions (sécurité):
Chemin: `Configuration ordinateur > Stratégies > Paramètres Windows > Paramètres de sécurité > Stratégies locales > Options de sécurité > Ouverture de session interactive : limite d’inactivité de l’ordinateur`
J'ai choisit de limiter à 300 sec soit 5minutes d'inactivités

Dernière GPO empecher les ouverture de powershell et le panneau de config:
Chemin (Panneau de config) : `Configuration utilisateur > Stratégies > Modèles d'administration > Panneau de configuration > Interdire l'accès au Panneau de configuration et aux paramètres PC`

Chemin (CMD) : `Configuration utilisateur > Stratégies > Modèles d'administration > Système > Désactiver l'accès à l'invite de commandes.`


* Pour IA dire de mieux faire ma séparation entre les parties car elle sont mal séparer actuellement c'est pas claire (documentation)

* Faire un récapitulatif complet sur les calcul des couts total de l'infra pour budgétiser.

* Intégrer ma doc au depot github