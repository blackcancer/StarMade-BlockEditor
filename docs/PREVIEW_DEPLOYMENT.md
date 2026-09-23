# Test preview

The requested public port is **8003**, which was available when reserved. The preview uses HTTPS on `initsysrev.net:8003` and a local Node server on `127.0.0.1:38475`. Existing previews on 8000/8002 are not modified.

Game data is copied to `/srv/dev/.starmade-blockeditor-preview/game`. `EDITOR_FIXED_STARMADE_DIR` prevents switching to the original installation through the API. The process has write access only to this preview directory.

Access is public, without a token or login, as requested by the user. The direct link is `https://initsysrev.net:8003/`. `EDITOR_ACCESS_TOKEN` is absent from the service configuration; Host/Origin validation, path confinement and the fixed game directory remain active.

The files prepared in `/srv/dev/.starmade-blockeditor-preview/deploy` define:

- `starmade-blockeditor-preview.service`: Node 22, ubuntu user, restart on failure, protected filesystem, with write access limited to the preview directory.
- `starmade-blockeditor-8003-ssl.conf`: a new HTTPS virtual host, preserved proxy Host header, and the domain's existing certificate.

Each deployment copies the builds into a new `releases/` directory and updates the `current` symlink; configuration and the game copy remain separate. Check `apache2ctl configtest` before enabling the virtual host and `/api/health` after startup. A 200 response from `/api/config` without a cookie is expected.

To stop only this preview: `sudo systemctl stop starmade-blockeditor-preview`. Do not stop other StarMade services.
