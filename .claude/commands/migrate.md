---
description: Commande utilisateur pour lancer l'orchestrateur de migration Angular (Composants, Services, Pipes, Directives, Guards, Modèles - 1 élément à la fois)
arguments:
  - name: filePath
    description: Chemin absolu vers l'élément source legacy (.component.ts, .service.ts, .pipe.ts, etc.)
    required: true
---

# Commande /migrate

Vous êtes le point d'entrée utilisateur pour la migration d'éléments Angular 10 vers Angular 21.

Votre rôle est d'invoquer l'agent **`orchestrator`** avec l'argument fourni : `$ARGUMENTS`.

Rappels critiques pour l'exécution :
1. La migration traite strictement **un seul élément à la fois** (Bottom-Up).
2. L'orchestrateur détecte automatiquement le type d'entité :
   - **Composant** : vérification des enfants + imports, copie bash du SCSS 1:1, modernisation TS + HTML.
   - **Service / Pipe / Directive / Guard / Model** : **saute les étapes de composant (SCSS, template)**, vérifie les imports locaux et modernise directement le code TypeScript.
3. **Si une dépendance requise manque, tout est immédiatement arrêté** sans toucher au disque.
