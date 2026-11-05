# Skill: Analyse Technique des Services et Éléments Non-Composants (Lecture Seule)

Ce skill guide l'agent analyste pour inspecter, déconstruire et établir le **plan d'action de modernisation** d'un Service, Guard, Interceptor, Pipe, Directive ou Modèle Angular 10 vers Angular 21.

> ⛔ **RÈGLE CRITIQUE : NE RIEN MODIFIER SUR LE DISQUE**.
> Cet agent est strictement en lecture seule (`view`). Il n'écrit aucun fichier et n'exécute aucune commande. Sa mission unique est d'analyser le code legacy et de produire un récapitulatif clair et structuré.

---

## 1. Ce qu'il faut Analyser

### A. Services (`*.service.ts`)
1. **Décorateur `@Injectable`** :
   - Présence de `{ providedIn: 'root' }` ou scoping dans un module legacy.
2. **Injections du Constructeur** :
   - Recenser chaque paramètre du constructeur : nom de la variable, modificateur d'accès (`private`, `protected`, `public`), type du service injecté.
   - Préparer la correspondance vers `inject(NomDuService)`.
3. **Flux RxJS & État** :
   - Repérer les propriétés réactives (`BehaviorSubject`, `Subject`, `Observable`).
   - Identifier les méthodes publiques, signatures et types de retour.
   - Détecter les éventuels `any` à typer strictement.
4. **Imports locaux** :
   - Identifier les modèles, interfaces ou autres services importés localement.

### B. Guards (`*.guard.ts`)
1. **Forme legacy** : Vérifier s'il s'agit d'une classe implémentant `CanActivate`, `CanDeactivate`, `Resolve`, etc.
2. **Services dépendants** : Repérer les services injectés dans le constructeur (ex: `AuthService`, `Router`).
3. **Logique de décision** : Extraire la condition retournée (`boolean`, `UrlTree`, `Observable`).

### C. Interceptors (`*.interceptor.ts`)
1. **Forme legacy** : Classe implémentant `HttpInterceptor`.
2. **Dépendances** : Services utilisés pour récupérer les tokens ou headers.
3. **Manipulation de requête** : Clônage de `req`, ajout de headers, gestion des erreurs.

### D. Pipes & Directives (`*.pipe.ts`, `*.directive.ts`)
1. **Pipes** : Nom du pipe (`@Pipe({ name: '...' })`), signature de `transform()`.
2. **Directives** : Sélecteur CSS, entrées `@Input()`, injection de `ElementRef` ou `Renderer2`.

### E. Modèles et Utilitaires (`*.model.ts`, `*.types.ts`, `*.ts`)
1. Interfaces, types, énumérations déclarés.
2. Détection des types laxistes (`any`, `object`) nécessitant un typage strict.

---

## 2. Format du Récapitulatif d'Analyse à Produire

L'analyste doit formuler et renvoyer à l'orchestrateur un bilan structuré comme suit :

```markdown
### 🔍 Récapitulatif d'Analyse - [Nom du Service / Fichier]

- **Type d'entité** : Service / Guard / Interceptor / Pipe / Directive / Modèle
- **Fichier source** : `<chemin_source>`
- **Fichier cible prévu** : `<chemin_cible>`

#### 1. Injections à Moderniser
| Paramètre Constructeur Legacy | Modificateur | Service | Syntaxe Cible `inject()` |
| :--- | :--- | :--- | :--- |
| `private http: HttpClient` | `private readonly` | `HttpClient` | `inject(HttpClient)` |
| `protected router: Router` | `protected readonly` | `Router` | `inject(Router)` |

#### 2. Architecture & Patterns Cibles
- Décorateur : `@Injectable({ providedIn: 'root' })`
- RxJS : Conservation des BehaviorSubjects / Observables existants
- Typage : [Liste des interfaces à typer strictement]

#### 3. Dépendances Locales Requises
- [ ] `src/app/.../model.ts` (vérifié présent / manquant)

#### 4. Plan de Transformation
- Résumé des étapes précises que l'agent builder devra appliquer pour écrire le fichier modernisé.
```
