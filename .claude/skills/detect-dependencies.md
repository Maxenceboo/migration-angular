# Skill: Détection des Dépendances (Enfants & Imports) - Approche Bottom-Up

Ce skill définit la méthode d'analyse pour vérifier si **toutes les dépendances requises** par un composant Angular sont déjà migrées dans le nouveau repository avant d'autoriser sa migration.

---

## 1. Principe Bottom-Up (Feuilles vers Racines)

En Angular 21 (Standalone), un composant déclare ses dépendances dans `imports: [...]` et injecte ses services via `inject()`.
Pour qu'un composant puisse être migré, compiler et fonctionner :
1. **Tous ses composants enfants** (balises `<app-...>` instanciées dans son template) doivent déjà exister dans le nouveau repository.
2. **Tous ses imports locaux** (services, modèles/interfaces, pipes, directives, utilitaires) doivent déjà être présents dans le nouveau repository.

> ⛔ **RÈGLE DU COMPOSANT UNIQUE** : Nous migrons rigoureusement **un seul composant à la fois**. Si ne serait-ce qu'une seule dépendance (enfant ou import local) n'est pas encore migrée, **on arrête tout immédiatement** et on renvoie la liste précise des éléments manquants à l'utilisateur.

---

## 2. Éléments Analysés

### A. Composants Enfants (Template HTML)
- Analyse des balises custom dans le fichier `.component.html` (ex: `<app-user-avatar>`, `<app-badge>`).
- Recherche de chaque sélecteur dans l'ancien repository pour identifier le composant source correspondant.
- Vérification de l'existence du fichier `.component.ts` de l'enfant dans le nouveau repository.
- *(Note : les balises de bibliothèques tierces comme Angular Material `<mat-...>` ou PrimeNG `<p-...>` sont identifiées comme externes et ne bloquent pas).*

### B. Imports Locaux (Fichier TypeScript)
- Analyse des `import { ... } from '...'` dans le `.component.ts`.
- Exclusion des packages npm externes (`@angular/...`, `rxjs`, etc.).
- Résolution des chemins relatifs (`./...`, `../../...`) et alias de chemin (`@shared/...`, `@app/...`).
- Vérification de l'existence des fichiers cibles dans le nouveau repository.

---

## 3. Règle de Décision Stricte

Exécution via :
```bash
node scripts/detect-dependencies.js "$SOURCE_PATH" --target . --json
```

- **Si au moins UN enfant ou UN import local n'est pas migré** :
  1. Générer un récapitulatif détaillé sous forme de tableau :
     | Type | Nom / Sélecteur | Fichier Source Legacy | Statut Nouveau Repo |
     | :--- | :--- | :--- | :--- |
     | 👶 Enfant | `<app-user-avatar>` (`UserAvatarComponent`) | `src/app/shared/avatar/...` | ❌ Non migré |
     | 💉 Service | `UserService` (`../../services/user.service`) | `src/app/core/user.service.ts` | ❌ Non migré |
  2. **STOP TOTAL ET IMMÉDIAT** : La migration du composant s'interrompt net.
  3. L'utilisateur reçoit l'instruction de migrer d'abord ces dépendances feuilles.

- **Si TOUTES les dépendances sont déjà migrées (ou composant feuille sans dépendances)** :
  1. Afficher : *"✅ Toutes les dépendances (enfants et imports) sont déjà en place. Autorisation de migrer ce composant."*
  2. Poursuivre vers l'analyse et la reconstruction.
