# Skill: Analyse Technique de Composant Angular (Lecture Seule)

Ce skill guide l'agent analyste (`migration-analyzer`) pour inspecter le composant source, analyser ses fichiers (`.ts`, `.html`, `.scss`), et produire le **plan d'action détaillé** destiné au `component-builder`.

> ⛔ **RÈGLE CRITIQUE : L'AGENT ANALYSTE NE MODIFIE RIEN SUR LE DISQUE**.
> Cet agent dispose uniquement de l'outil `view`. Il n'écrit aucun fichier, ne crée aucun dossier et n'exécute aucune commande de modification. Sa mission est d'**analyser** et de **produire le récapitulatif technique**.

---

## 🏛️ 1. Chemins et Contexte Projet

- **Projet Legacy** : `<workspace>\<legacy-project>\sources\frontend\src\app\`
- **Projet Cible** : `<workspace>\<target-project>\sources\frontend\src\app\`
- **Intégrité absolue** : Reproduire le comportement EXACT du composant source, ne SUPPRIMER AUCUNE fonctionnalité.

---

## 🧱 2. Configuration du Composant (`@Component`)

```typescript
// AVANT (Legacy Angular 10)
import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-mono-composant',
  templateUrl: './mono-composant.component.html',
  styleUrls: ['./mono-composant.component.scss']
})
export class MonComposantComponent implements OnInit { ... }

// APRES (Angular 21 Cible)
import { Component, ChangeDetectionStrategy, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mono-composant',
  templateUrl: './mono-composant.component.html',
  styleUrl: './mono-composant.component.scss', // string unique, pas de tableau
  changeDetection: ChangeDetectionStrategy.OnPush, // ou Eager selon composant d'origine
  imports: [CommonModule], // déclarer TOUS les composants/pipes/directives utilisés dans le template
})
export class MonComposantComponent { ... }
```

### Règles d'Analyse pour le Décorateur :
1. **Standalone** : Déclarer `standalone: true` et lister dans `imports: [...]` tous les composants/directives/pipes du template.
2. **`styleUrls` ➔ `styleUrl`** : String unique, pas de tableau `[]`.
3. **ChangeDetection (Eager / OnPush)** :
   - Identifier la stratégie d'origine du composant.
   - **Règle AG-Grid** : Si absente sur un composant cell renderer AG-Grid, planifier `ChangeDetectionStrategy.Eager`.
   - Si présente (ex: `OnPush`), conserver `ChangeDetectionStrategy.OnPush`.

---

## 🚫 3. Pas de Signals : Conservation de l'API Décorateurs Classique

- ⛔ **INTERDICTION D'UTILISER LES SIGNALS** : Pas de `signal()`, `computed()`, `input()`, `output()`, `model()`, `viewChild()`.
- **Inputs à recenser** :
  ```typescript
  @Input() public title: string = '';
  @Input({ required: true }) public id!: string;
  ```
- **Outputs à recenser** :
  ```typescript
  @Output() public readonly clicked = new EventEmitter<void>();
  ```
- **ViewChild / ViewChildren à recenser** :
  ```typescript
  @ViewChild('inputRef') public inputRef!: ElementRef;
  @ViewChildren(ItemComponent) public items!: QueryList<ItemComponent>;
  ```
- **Template** : Les variables doivent être accédées directement sans parenthèses (ex: `@if (isLoggedIn)`, `{{ user.name }}`).

---

## 💉 4. Injections de Services avec `inject()`

L'analyste doit recenser tous les services injectés dans le constructeur legacy et préparer leur conversion en déclarations `inject()` en haut de classe :

```typescript
// AVANT (constructeur)
constructor(
  private monSuperService: SuperService,
  protected unDeuxiemeService: DeuxiemeService
) {}

// PLAN D'ACTION (inject function)
private readonly monSuperService = inject(SuperService);
protected readonly unDeuxiemeService = inject(DeuxiemeService);
```

**Règles :**
- Identifier TOUS les paramètres de type service du constructeur.
- Conserver les modificateurs d'accès (`private`, `protected`).
- Ajouter systématiquement le mot-clé `readonly`.

---

## 🔀 5. Template : `*ngIf` ➔ `@if`, `*ngFor` ➔ `@for`

L'analyste recense toutes les directives structurelles legacy du template :

```html
<!-- AVANT -->
<div *ngIf="condition">Visible</div>
<div *ngFor="let item of items">{{ item }}</div>

<!-- PLAN D'ACTION -->
@if (condition) {
  <div>Visible</div>
}

@for (item of items; track item) {
  <div>{{ item }}</div>
} @empty {
  <div>Aucun élément</div>
}
```

---

## 🎨 6. SCSS : `@import` ➔ `@use` & Vérification Croisée

```scss
// AVANT (Legacy)
@import "variables";
@use '@org/design-system/assets/styles/_variables.scss' as vars;

// PLAN D'ACTION CIBLE
@use 'assets/styles/variables' as vars;
@use '@org/design-system/assets/styles/variables' as varsDs;
```

**Points de contrôle SCSS :**
1. `@use '@org/design-system/assets/styles/_variables.scss' as vars` ➔ `@use '@org/design-system/assets/styles/variables' as varsDs;`
2. `@import "variables"` ➔ `@use 'assets/styles/variables' as vars;`
3. Autres `@import` ➔ `@use '...' as *;`
4. Préfixes de variables ➔ renommer `vars.$ds-color` en `varsDs.$ds-color` si applicable.
5. **0 classe CSS supprimée**, même si elle paraît redondante.

---

## 🧬 7. Dépendances de Classe de Base (ex: `CellAbstractComponent`)

Quand le composant dérive d'une classe de base :
- **Propriété `cellOptions`** : planifier `override` + initializer :
  ```typescript
  @Input()
  public override cellOptions: ExampleCellOptions = {} as ExampleCellOptions;
  ```
- **Type générique** : spécifier sur la classe de base (`extends CellAbstractComponent<ExampleCellOptions>`).
- **Composants design system du template** : vérifier que `<ds-select>`, `<ds-lookup>`, etc. sont listés pour l'import.

---

## 📋 8. Format Obligatoire du Récapitulatif d'Analyse

À l'issue de son inspection, l'agent `migration-analyzer` produit et renvoie le récapitulatif suivant :

```markdown
### 🔍 Récapitulatif d'Analyse du Composant - [NomComposant]

- **Sélecteur** : `<app-...>`
- **Fichier TS source** : `<chemin_source_ts>`
- **Fichier HTML source** : `<chemin_source_html>`
- **Fichier SCSS source** : `<chemin_source_scss>`

#### 1. Configuration du Composant
- Standalone : `standalone: true`
- Style : `styleUrl: './<nom>.component.scss'`
- ChangeDetection : `ChangeDetectionStrategy.[OnPush|Eager]` (raison : [préservé d'origine / cell renderer])
- Imports requis : `[CommonModule, DsSelectComponent, ...]`

#### 2. Injections à Moderniser
- `private serviceA: ServiceA` ➔ `private readonly serviceA = inject(ServiceA);`
- `protected serviceB: ServiceB` ➔ `protected readonly serviceB = inject(ServiceB);`

#### 3. Décorateurs Classiques (Sans Signals)
- Inputs : `@Input() ...`
- Outputs : `@Output() clicked = new EventEmitter<void>();`
- Base classe : `public override cellOptions = {} as ...` (si applicable)

#### 4. Template & Control Flow
- [Nombre] conditions `*ngIf` à migrer en `@if (...)`
- [Nombre] boucles `*ngFor` à migrer en `@for (...; track ...)`

#### 5. Styles SCSS
- Règles `@import` à convertir en `@use`
- Variables Design System `varsDs` à vérifier
```
