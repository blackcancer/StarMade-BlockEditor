# Correctif de l’en-tête PC — 23 septembre 2026

Le conteneur natif `details` des réglages était aplati avec `display: contents`. Son contenu ne participait pas comme prévu au flex de l’en-tête : les listes et boutons se répartissaient sur plusieurs lignes dans une barre de hauteur fixe, et certains contrôles étaient coupés.

Le correctif donne aux réglages un conteneur flex explicite, avec espacement et alignement central. Sur PC, la barre adapte sa hauteur et autorise un retour à la ligne si nécessaire. Les réglages mobiles conservent leur grille et leur ouverture à la demande.

## Vérifications exécutées

- Reproduction du défaut sur les 30 combinaisons de six langues et cinq largeurs PC (1025, 1100, 1280, 1440, 1920 px).
- Après correction : aucun contrôle hors de l’en-tête ni superposé sur ces 30 combinaisons.
- Réglages mobiles à 360, 390, 768 et 1024 px : commandes visibles, dimensions tactiles d’au moins 44 px, aucun débordement horizontal ; retour au mode PC validé.
- `npm run validate` : 425 tests applicatifs et 6 tests d’outillage réussis, 100 % des lignes et branches par fichier sur les 46 sources exécutables ; build réussi.
- Recette répétée sur https://initsysrev.net:8003/ après publication, sans injection de CSS. Aucune donnée du jeu modifiée.

Les preuves, captures et le script de recette sont conservés dans `release/header-fix/`. La vérification graphique utilise Chromium sous Linux. Le correctif est limité à la feuille de style.
