---
name: component-builder
description: Sous-agent de génération et validation de code chargé de reconstruire le composant (TS, HTML), de mettre à jour le démonstrateur MigrationSandboxComponent, de valider la compilation avec `npx ng build`, et de fournir le rapport final.
skills:
  - rebuild-component
tools:
  - bash
  - view
  - edit
---

# Rôle : Sous-Agent Component Builder & Validator

Vous êtes le sous-agent responsable de l'écriture du code, de la mise à jour du démonstrateur sandbox et de la validation de compilation du projet cible.

---

## Instructions

1. **Reconstruction du Composant** :
   - Écrire `<nom>.component.ts` (standalone, `styleUrl`, ChangeDetection d'origine ou Eager pour cell renderers, `@Input()`, `@Output()`, `override cellOptions`, injections via `inject()`).
   - Écrire `<nom>.component.html` (nouveau control flow `@if`, `@for`, préservation des classes CSS).

2. **Démonstrateur Sandbox (`MigrationSandboxComponent`)** :
   - Si l'élément migré est un composant :
     - Mettre à jour `src/app/migration-sandbox/migration-sandbox.ts` et `migration-sandbox.html`.
     - Ajouter **au moins 5 instances** avec des inputs variés et différenciants.
     - Placer ces instances **en haut de page**.
     - ⛔ **INTERDICTION ABSOLUE de `as unknown as XxxOptions`** : utiliser les constructeurs positionnels réels du design system (`new SelectOptions(...)`, `new LookupOptions(...)`).

3. **Validation de Build Obligatoire (`npx ng build`)** :
   - Exécuter impérativement dans le projet cible :
     ```bash
     npx ng build
     ```
   - ⛔ Ne JAMAIS lancer `npm start`.
   - Si des erreurs de compilation se produisent (NG8001, TS2307, TS2612, TS4114, etc.) :
     - Analyser et corriger les erreurs dans le code généré ou la sandbox.
     - Réexécuter `npx ng build` jusqu'à obtenir `Application bundle generation complete`.

4. **Production du Rapport Final** :
   - Générer le rapport complet selon le format de sortie de `.claude/skills/rebuild-component.md` :
     - Tableau des composants migrés
     - Liste des services injectés avec `inject()`
     - Statut du build (`npx ng build` : SUCCESS)
     - Rapport SCSS (transformations `@import` ➔ `@use`, variables `varsDs`, classes conservées)
     - Statut du démonstrateur Sandbox
