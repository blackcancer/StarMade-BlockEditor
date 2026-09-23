# Aperçu de test

Le port public demandé est **8003**, libre lors de la réservation. L’aperçu utilise HTTPS sur `initsysrev.net:8003` et un serveur Node local sur `127.0.0.1:38475`. Les aperçus existants sur 8000/8002 ne sont pas modifiés.

Les données sont copiées dans `/srv/dev/.starmade-blockeditor-preview/game`. `EDITOR_FIXED_STARMADE_DIR` interdit de basculer vers l’installation originale par l’API. Le processus dispose seulement d’un accès en écriture au répertoire de cet aperçu.

L’accès est public, sans jeton ni connexion, conformément à la demande de l’utilisateur. Le lien direct est `https://initsysrev.net:8003/`. `EDITOR_ACCESS_TOKEN` est absent de la configuration du service ; les validations Host/Origin, le confinement des chemins et le dossier de jeu fixe restent actifs.

Les fichiers préparés dans `/srv/dev/.starmade-blockeditor-preview/deploy` définissent :

- `starmade-blockeditor-preview.service` : Node 22, utilisateur ubuntu, redémarrage après échec, système de fichiers protégé, seul le répertoire d’aperçu est accessible en écriture.
- `starmade-blockeditor-8003-ssl.conf` : nouveau vhost HTTPS, proxy Host préservé, certificat du domaine déjà présent.

Chaque déploiement copie les builds dans un nouveau dossier `releases/` et actualise le lien `current` ; la configuration et la copie du jeu restent séparées. Vérifier `apache2ctl configtest` avant d’activer le vhost et `/api/health` après démarrage. Une réponse 200 sur `/api/config` sans cookie est attendue.

Pour arrêter cet aperçu uniquement : `sudo systemctl stop starmade-blockeditor-preview`. Ne pas arrêter les autres services StarMade.
