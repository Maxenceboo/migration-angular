# Skill: Reconstruction du Composant, Démonstrateur Sandbox et Validation de Build

Ce skill guide la reconstruction du composant modernisé, la création du démonstrateur interactif dans la Sandbox (`MigrationSandboxComponent`), et la validation impérative de la compilation avec `npx ng build`.

---

## 1. Principes de Génération du Composant

1. **Pas de Signals** : Utiliser `@Input()`, `@Output() = new EventEmitter<T>()`, `@ViewChild()`, `@ViewChildren()`.
2. **ChangeDetection** : Conserver la stratégie d'origine (Eager / OnPush). Si absente et qu'il s'agit d'un cell renderer AG-Grid, utiliser `ChangeDetectionStrategy.Eager`.
3. **Injections** : Remplacer les paramètres du constructeur par `inject()` en haut de classe (`private/protected readonly`).
4. **Base class (`CellAbstractComponent`)** : Ajouter `override` et un initializer sur `cellOptions` :
   ```typescript
   @Input()
   public override cellOptions: ExampleCellOptions = {} as ExampleCellOptions;
   ```
5. **Template** : Remplacer `*ngIf` par `@if`, `*ngFor` par `@for (item of items; track item)`.
6. **Imports du template** : Ajouter tous les composants utilisés dans le HTML (`<ds-select>`, `<ds-lookup>`, etc.) dans le tableau `imports: [...]`.

---

## 2. Démonstrateur : Mise à jour de `MigrationSandboxComponent`

Si l'élément migré est un composant, il doit être **immédiatement ajouté au démonstrateur** pour validation visuelle.

- **Fichier TypeScript** : `src/app/migration-sandbox/migration-sandbox.ts`
- **Fichier HTML** : `src/app/migration-sandbox/migration-sandbox.html`
- **Route** : `/sandbox`

### Structure Type du Démonstrateur (MigrationSandbox) :

#### TypeScript (`src/app/migration-sandbox/migration-sandbox.ts`)
```typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MonComposantComponent, MonComposantOptions } from '@shared/cells/mon-composant/mon-composant.component';

@Component({
  selector: 'app-migration-sandbox',
  templateUrl: './migration-sandbox.html',
  styleUrl: './migration-sandbox.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MonComposantComponent],
})
export class MigrationSandbox {
  // Données de démonstration
  public demoRow1 = { /* ... */ };
  public demoRow2 = { /* ... */ };

  // Factory pour les options (évite les références partagées)
  public getDemoOptions1(): MonComposantOptions {
    return new MonComposantOptions({ /* ... */ });
  }
}
```

#### HTML (`src/app/migration-sandbox/migration-sandbox.html`)
```html
<h3>Migration Sandbox - Composant: app-mono-composant</h3>

<h4>app-mono-composant - Description brève</h4>
<p><strong>Instance 1 - Cas 1 :</strong></p>
<app-mono-composant [cellOptions]="getDemoOptions1()" [row]="demoRow1" [colId]="'prop'"></app-mono-composant>

<p><strong>Instance 2 - Cas 2 :</strong></p>
<app-mono-composant [cellOptions]="getDemoOptions1()" [row]="demoRow2" [colId]="'prop'"></app-mono-composant>

<!-- 5 instances minimales avec des inputs variés -->
```

### Règles Obligatoires du Démonstrateur :
1. **Au moins 5 instances différentes** présentant des variations d'inputs significatives (cas nominal, cas vide, cas avec options complexes, cas désactivé, etc.).
2. **Texte explicatif court et concis** avant chaque instance.
3. **Placer les nouvelles instances EN HAUT de la page** du sandbox pour une validation visuelle immédiate.
4. ⛔ **INTERDICTION ABSOLUE de `as unknown as XxxOptions`** :
   - Toujours utiliser les vrais constructeurs positionnels (`new SelectOptions(key, placeholder, ...)`, `new LookupOptions(key, bindingKey, ...)`).
   - Consulter les signatures de constructeurs dans les fichiers de déclarations `.d.ts` du design system (`@org/design-system`).
5. **Factory de démonstration** : Utiliser des méthodes factory pour instancier les options dans le TS du sandbox (ex: `getDemoOptions1()`) afin d'éviter les mutations de références partagées.
6. 🚫 **Pas d'explications théoriques** : se concentrer uniquement sur le code, le rapport SCSS et le démonstrateur.

---

## 3. Validation Obligatoire par `npx ng build`

Une fois le composant et la sandbox mis à jour :

```bash
npx ng build
```

> ⛔ **NE JAMAIS UTILISER `npm start`**. Seule la commande `npx ng build` est autorisée.

### Comportement attendu :
- Message de succès : `Application bundle generation complete`.
- Si des erreurs surviennent (NG8001, TS2307, TS2612, TS4114, etc.) :
  - Corriger immédiatement les imports ou les déclarations `override`.
  - Réitérer `npx ng build` jusqu'à succès complet de la compilation.

---

## 4. Format du Rapport Final de Sortie

À la fin de la migration, fournir le rapport formaté suivant :

```markdown
## Rapport de migration - [Nom du Composant]

### Composants migrés
| # | Composant | Fichiers | Statut |
|---|---|---|---|
| 1 | app-x-cell | .ts, .html, .scss | Migré (existant ou créé) |

### Rapports de services injectés via inject()
- ServiceA → private readonly a = inject(ServiceA)
- ServiceB → protected readonly b = inject(ServiceB)

### Build : SUCCESS / ERREUR (détail)
- Résultat de `npx ng build` : Application bundle generation complete.

### Rapport SCSS
- fichier.scss : transformations @import ➔ @use, variables utilisées (varsDs), classes CSS conservées.

### Démonstrateur Sandbox
- 5 instances configurées dans src/app/migration-sandbox/ (route /sandbox).
```
