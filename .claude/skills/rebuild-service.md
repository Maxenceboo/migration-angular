# Skill: Reconstruction et Validation de Services (Angular 21)

Ce skill guide l'agent constructeur pour écrire le code TypeScript modernisé d'un Service, Guard, Interceptor, Pipe, Directive ou Modèle à partir du récapitulatif fourni par l'analyste, et valider la compilation via `npx ng build`.

---

## 1. Principes d'Écriture

1. **Reproduction à l'identique de la logique métier** : Ne supprimer aucune méthode, conserver scrupuleusement le comportement fonctionnel.
2. **Services** :
   - Déclarer `@Injectable({ providedIn: 'root' })`.
   - Utiliser `private/protected readonly nom = inject(Service)` en haut de classe.
   - Conserver les flux RxJS (`BehaviorSubject`, `Observable`, etc.).
3. **Guards** : Écrire sous forme de fonction exportée `export const monGuard: CanActivateFn = (route, state) => { ... };`.
4. **Interceptors** : Écrire sous forme de fonction exportée `export const monInterceptor: HttpInterceptorFn = (req, next) => { ... };`.
5. **Pipes / Directives** : Déclarer `standalone: true`.
6. **Typage strict** : Éliminer tout `any` superflu.

---

## 2. Validation Obligatoire de Compilation (`npx ng build`)

Après avoir écrit le fichier modernisé :
```bash
npx ng build
```

> ⛔ **NE JAMAIS UTILISER `npm start`**. Seule la commande `npx ng build` est autorisée.

- Vérifier que `Application bundle generation complete` est obtenu.
- Corriger toute erreur de typage ou d'import jusqu'à succès.

---

## 3. Format du Rapport de Sortie

```markdown
## Rapport de migration - [Nom du Service / Fichier]

### Fichier migré
- **Source** : `<chemin_source>`
- **Cible** : `<chemin_cible>`
- **Statut** : Migré avec succès

### Injections de services via inject()
- ServiceA → private readonly a = inject(ServiceA)
- ServiceB → protected readonly b = inject(ServiceB)

### Build : SUCCESS / ERREUR
- Résultat de `npx ng build` : Application bundle generation complete.
```
