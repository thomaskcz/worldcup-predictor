# Database Audit Report

**Date**: 2026-06-24
**Project**: worldcup-predictor
**Scope**: Complete database schema and security audit
**Base de données**: Supabase PostgreSQL

---

## 1. Executive Summary

### État global de la base

La base de données du projet worldcup-predictor est globalement **bien structurée** avec une séparation claire des responsabilités entre :
- Tables de données métier (matches, predictions, user_scores)
- Tables de configuration (rules, competition_visibility_settings)
- Tables de cache/agrégation (competition_leaderboard, user_scores)
- Vues pour l'affichage (leaderboard_detailed_view, user_prediction_tracking)

### Points forts

✅ **RLS activé sur toutes les tables** avec des policies bien définies
✅ **Contraintes d'intégrité** présentes (UNIQUE sur external_id, CHECK sur points)
✅ **Fonctions utilitaires robustes** (is_admin, validate_prediction)
✅ **Triggers automatiques** pour updated_at et validation
✅ **Indexation cohérente** pour les requêtes courantes
✅ **Event trigger rls_auto_enable** pour sécurité par défaut

### Principaux problèmes identifiés

🔴 **P0 - Critiques**:
- **DB-001**: `matches.home_team`/`away_team` sont des text sans FK vers `teams` (duplication de données)
- **DB-002**: `competition_results.stage` est un text avec CHECK, pas d'enum (incohérence avec `matches.stage`)
- **DB-003**: `competition_results.group_name` sans validation (incohérence possible avec `teams.group_name`)

🟡 **P1 - Importants**:
- **DB-004**: Vue `leaderboard_view` obsolète et non utilisée (confusion avec `leaderboard_detailed_view`)
- **DB-005**: `competition_predictions_with_users` expose les emails (risque de fuite de données)
- **DB-006**: `user_prediction_tracking` utilise un CROSS JOIN (potentiellement très lent)
- **DB-007**: `breakdown_json` et `predictions_json` sans validation de structure

🟢 **P2 - Améliorations**:
- **DB-008**: `teams.flag_url` toujours NULL (colonne inutilisée)
- **DB-009**: Manque d'index sur certaines colonnes fréquentes
- **DB-010**: Doublon de policy SELECT sur certaines tables

### Niveau de confiance sur la cohérence actuelle

**Moyen** - La base est fonctionnelle mais présente des incohérences de design qui pourraient causer des problèmes à long terme, notamment :
- Duplication de noms d'équipes en text vs références teams
- Incohérence de types entre tables similaires
- Vues potentiellement obsolètes ou dangereuses

---

## 2. Cartographie de la base

### Tables principales

| Table | Rôle | Clé primaire | Relations principales |
|-------|------|--------------|----------------------|
| `users_profiles` | Profils utilisateurs | `id` (uuid) | FK → `auth.users(id)` |
| `matches` | Matchs de la coupe du monde | `id` (uuid) | Utilisé par `predictions`, `user_scores` |
| `predictions` | Prédictions par match | `id` (uuid) | FK → `auth.users(id)`, `matches(id)` |
| `user_scores` | Scores calculés par match | `id` (uuid) | FK → `auth.users(id)`, `matches(id)` |
| `teams` | Équipes participantes | `id` (uuid) | Référencé par `competition_results` |
| `rules` | Règles de scoring | `id` (uuid) | Utilisé par le calcul de scores |
| `competition_predictions` | Prédictions bracket/compétition | `id` (uuid) | FK → `auth.users(id)`, UNIQUE sur `user_id` |
| `competition_results` | Résultats officiels tournoi | `id` (uuid) | FK → `teams(id)` |
| `competition_leaderboard` | Classement agrégé compétition | `id` (uuid) | FK → `auth.users(id)`, UNIQUE sur `user_id` |
| `competition_visibility_settings` | Settings visibilité UI (singleton) | `id` (uuid) | Singleton global |

### Vues principales

| Vue | Rôle | Utilisation |
|-----|------|-------------|
| `leaderboard_detailed_view` | Classement détaillé avec stats | ✅ Utilisé par le front (`app/leaderboard/page.tsx`) |
| `leaderboard_view` | Classement simple (obsolète) | ❌ Non utilisé (remplacé par detailed_view) |
| `competition_predictions_with_users` | Prédictions compétition + infos users | ✅ Utilisé par API (`app/api/competition-predictions/others/route.ts`) |
| `user_prediction_tracking` | Tracking continuité prédictions | ✅ Utilisé par admin (`components/admin/UserPredictionTracking.tsx`) |

### Fonctions / Triggers importants

| Fonction | Rôle | Sécurité |
|----------|------|----------|
| `handle_new_user()` | Crée automatiquement le profil utilisateur | SECURITY DEFINER |
| `is_admin()` | Vérifie si l'utilisateur est admin | SECURITY DEFINER |
| `set_updated_at()` | Met à jour `updated_at` automatiquement | SECURITY INVOKER |
| `validate_prediction()` | Valide les prédictions avant insert/update | SECURITY INVOKER |
| `rls_auto_enable()` | Active RLS automatiquement sur nouvelles tables | SECURITY DEFINER + search_path pg_catalog |

### Relations structurantes du système

```
auth.users (Supabase Auth)
    ↓ (1:1)
users_profiles
    ↓ (1:N)
    ├── predictions → matches
    ├── user_scores → matches
    ├── competition_predictions (1:1)
    └── competition_leaderboard (1:1)

matches
    ├── predictions (1:N)
    └── user_scores (1:N)

teams
    └── competition_results (1:N)

rules
    └── Utilisé par calcul de scores (relation implicite)

competition_visibility_settings
    └── Singleton global
```

---

## 3. Problèmes identifiés

### DB-001: matches.home_team / away_team sont des text sans FK vers teams

**Gravité**: P0
**Zone**: Schema / Data model / Foreign keys

**Description**:
Les colonnes `matches.home_team` et `matches.away_team` sont de type `text` et stockent les noms des équipes directement. Il n'y a pas de foreign key vers la table `teams`. Les équipes sont insérées dans `teams` (avec IDs UUID) mais les matchs utilisent les noms en texte.

**Pourquoi c'est un problème**:
- **Duplication de données**: Le même nom d'équipe est stocké plusieurs fois (dans teams et dans chaque match)
- **Incohérence possible**: Si un nom d'équipe change dans `teams`, il faut mettre à jour tous les matchs
- **Pas de validation**: Aucune garantie que `home_team`/`away_team` correspondent à des équipes existantes
- **Risque d'erreurs**: Fautes de frappe possibles lors de l'insertion des matchs
- **Jointures inefficaces**: Les jointures entre matches et teams doivent se faire sur des text, pas des UUID

**Impact concret possible**:
- Matchs avec des noms d'équipes qui n'existent pas dans `teams`
- Différentes variations du même nom d'équipe (ex: "Brésil" vs "Brazil")
- Impossibilité de garantir l'intégrité référentielle
- Calculs de scores incorrects si les noms ne correspondent pas

**Recommandation de correction**:
1. Ajouter des colonnes `home_team_id` et `away_team_id` (UUID) avec FK vers `teams(id)`
2. Migrer les données existantes en faisant un mapping nom → ID
3. Marquer les colonnes `home_team`/`away_team` comme obsolètes ou les supprimer après migration
4. Mettre à jour toutes les requêtes, vues et fonctions qui utilisent ces colonnes
5. Mettre à jour le front pour utiliser les IDs au lieu des noms

**Type de correction**: Nécessite une migration prudente avec backfill de données

---

### DB-002: competition_results.stage est un text avec CHECK, pas d'enum

**Gravité**: P0
**Zone**: Schema / Data consistency / Enums

**Description**:
La table `competition_results` utilise un type `text` pour la colonne `stage` avec une contrainte CHECK qui limite les valeurs à `['groups', 'semi_final', 'final']`. Pourtant, la table `matches` utilise l'enum `match_stage` qui a des valeurs plus détaillées (incluant `round_of_16`, `round_of_32`, `quarter_final`, `third_place`).

**Pourquoi c'est un problème**:
- **Incohérence de types**: Deux tables représentant des concepts similaires utilisent des types différents
- **Perte d'information**: `competition_results` ne peut pas représenter les rounds de 16, 32, quarts de finale, 3ème place
- **Maintenance difficile**: Si l'enum `match_stage` change, la contrainte CHECK doit être mise à jour manuellement
- **Pas de type safety**: Le text est plus sujet aux erreurs qu'un enum

**Impact concret possible**:
- Impossible de stocker les résultats des rounds de 16/32/quarts dans `competition_results`
- Erreurs si on essaie d'insérer une valeur non valide
- Confusion pour les développeurs sur quel type utiliser

**Recommandation de correction**:
1. Créer un nouvel enum `competition_stage` ou réutiliser `match_stage` (si compatible)
2. Modifier `competition_results.stage` pour utiliser l'enum
3. Mettre à jour la contrainte CHECK ou la supprimer (l'enum assure déjà la validation)
4. Vérifier que toutes les valeurs existantes sont compatibles avec le nouvel enum
5. Mettre à jour le code qui utilise cette colonne

**Type de correction**: Safe avec migration de type (si compatible) ou nécessite une décision produit

---

### DB-003: competition_results.group_name sans validation

**Gravité**: P0
**Zone**: Schema / Data consistency / Foreign keys

**Description**:
La colonne `competition_results.group_name` est de type `text` sans aucune validation ni foreign key vers `teams.group_name`. Il est possible d'insérer un nom de groupe qui n'existe pas dans la table `teams`.

**Pourquoi c'est un problème**:
- **Pas de validation**: Aucune garantie que `group_name` correspond à un groupe réel
- **Incohérence possible**: On pourrait avoir "group X" dans `competition_results` mais aucune équipe dans `teams` avec ce groupe
- **Jointures non vérifiées**: Les jointures entre `competition_results` et `teams` sur `group_name` ne sont pas garanties

**Impact concret possible**:
- Résultats de groupe pour un groupe qui n'existe pas
- Erreurs de calcul si les groupes ne correspondent pas
- Données incohérentes entre `competition_results` et `teams`

**Recommandation de correction**:
1. Ajouter une contrainte CHECK sur `group_name` pour limiter aux valeurs valides (A-L)
2. Ou ajouter une foreign key vers une table de référence des groupes
3. Ou utiliser un enum pour les noms de groupes
4. Vérifier que toutes les valeurs existantes sont valides

**Type de correction**: Safe (ajout de contrainte CHECK ou enum)

---

### DB-004: Vue leaderboard_view obsolète et non utilisée

**Gravité**: P1
**Zone**: Views / Maintenabilité

**Description**:
La vue `leaderboard_view` existe mais n'est pas utilisée par le front. Le front utilise exclusivement `leaderboard_detailed_view` (vérifié dans `app/leaderboard/page.tsx`). `leaderboard_view` est une version simplifiée sans les statistiques détaillées.

**Pourquoi c'est un problème**:
- **Confusion**: Les développeurs ne savent pas quelle vue utiliser
- **Maintenance inutile**: Deux vues similaires à maintenir
- **Risque d'erreurs**: Si quelqu'un utilise `leaderboard_view` par erreur, il n'aura pas les stats détaillées
- **Code mort**: La vue consomme des ressources sans être utilisée

**Impact concret possible**:
- Développeur utilise la mauvaise vue et manque de fonctionnalités
- Temps perdu à maintenir une vue inutile
- Confusion sur la source de vérité pour le leaderboard

**Recommandation de correction**:
1. Supprimer `leaderboard_view` si elle n'est vraiment pas utilisée
2. Ou documenter clairement son utilité si elle a un cas d'usage spécifique
3. Vérifier dans tout le codebase qu'elle n'est pas utilisée ailleurs

**Type de correction**: Safe (suppression de vue non utilisée)

---

### DB-005: competition_predictions_with_users expose les emails

**Gravité**: P1
**Zone**: Views / Security / Data privacy

**Description**:
La vue `competition_predictions_with_users` expose la colonne `up.email` depuis `users_profiles`. Cette vue est utilisée par l'API `app/api/competition-predictions/others/route.ts` qui est accessible aux utilisateurs authentifiés. Cela signifie que n'importe quel utilisateur authentifié peut voir les emails des autres utilisateurs.

**Pourquoi c'est un problème**:
- **Fuite de données personnelles**: Les emails sont des données sensibles (RGPD)
- **Pas de politique d'accès**: La vue ne filtre pas par admin
- **Risque de scraping**: Un utilisateur pourrait scraper tous les emails
- **Violation de confidentialité**: Les utilisateurs ne s'attendent pas à ce que leur email soit visible

**Impact concret possible**:
- Un utilisateur malveillant récupère tous les emails des participants
- Problème de conformité RGPD
- Plaintes d'utilisateurs concernant la confidentialité

**Recommandation de correction**:
1. Retirer `up.email` de la vue `competition_predictions_with_users`
2. Garder uniquement `up.nickname` pour l'affichage
3. Si l'email est nécessaire pour l'admin, créer une vue admin-only
4. Vérifier les policies RLS sur cette vue

**Type de correction**: Safe (modification de vue)

---

### DB-006: user_prediction_tracking utilise un CROSS JOIN

**Gravité**: P1
**Zone**: Views / Performance

**Description**:
La vue `user_prediction_tracking` utilise un `CROSS JOIN` entre `users_profiles` et `ordered_matches` dans la CTE `user_prediction_status`. Cela crée un produit cartésien de tous les utilisateurs avec tous les matchs futurs, ce qui peut être très lent avec beaucoup d'utilisateurs ou de matchs.

**Pourquoi c'est un problème**:
- **Performance**: CROSS JOIN est O(N*M) où N = utilisateurs, M = matchs
- **Scalabilité**: Avec 1000 utilisateurs et 50 matchs, ça fait 50 000 lignes avant filtrage
- **Blocage potentiel**: La vue peut être très lente à calculer
- **Ressources**: Consomme beaucoup de CPU/mémoire

**Impact concret possible**:
- La page admin qui utilise cette vue est très lente
- Timeout de la requête
- Impact sur les autres requêtes

**Recommandation de correction**:
1. Repenser la logique pour éviter le CROSS JOIN
2. Utiliser une approche par utilisateur avec une sous-requête
3. Ou créer une table matérialisée rafraîchie périodiquement
4. Ajouter des indexes pour optimiser les jointures

**Type de correction**: Nécessite une refonte de la vue (risque de changement de comportement)

---

### DB-007: breakdown_json et predictions_json sans validation de structure

**Gravité**: P1
**Zone**: Schema / Data validation

**Description**:
Les colonnes `user_scores.breakdown_json`, `competition_predictions.predictions_json` et `rules.rules_json` sont de type `jsonb` avec une validation minimale (`jsonb_typeof = 'object'`). Il n'y a pas de validation de la structure interne des JSON (schéma JSON, contraintes sur les champs, etc.).

**Pourquoi c'est un problème**:
- **Pas de validation**: On peut insérer n'importe quel JSON valide
- **Erreurs runtime**: Le code qui lit ces JSON peut échouer si la structure n'est pas celle attendue
- **Difficile à debugger**: Les erreurs de structure sont détectées tardivement
- **Pas de documentation**: La structure attendue n'est pas documentée dans le schéma

**Impact concret possible**:
- Insertion de JSON malformés qui cassent le front
- Erreurs de calcul si le JSON n'a pas les champs attendus
- Difficulté à comprendre quelles sont les structures valides

**Recommandation de correction**:
1. Ajouter des contraintes CHECK pour vérifier la présence de champs obligatoires
2. Utiliser jsonb_path_query pour valider la structure
3. Ou documenter clairement la structure attendue dans les commentaires
4. envisager d'utiliser un schéma JSON (PostgreSQL 12+)

**Type de correction**: Safe (ajout de contraintes CHECK)

---

### DB-008: teams.flag_url toujours NULL

**Gravité**: P2
**Zone**: Schema / Unused columns

**Description**:
La colonne `teams.flag_url` existe mais est toujours NULL dans les données d'insertion (`supabase/data/teams.sql`). Il n'y a pas de logique pour remplir cette colonne.

**Pourquoi c'est un problème**:
- **Colonne inutilisée**: Elle occupe de l'espace sans être utilisée
- **Confusion**: Les développeurs peuvent penser qu'elle est fonctionnelle
- **Maintenance inutile**: Colonne à maintenir sans valeur ajoutée

**Impact concret possible**:
- Confusion sur l'utilité de cette colonne
- Espace disque inutile (mineur)

**Recommandation de correction**:
1. Supprimer la colonne si elle n'est pas utilisée
2. Ou l'implémenter correctement (ajouter les URLs des drapeaux)
3. Ou documenter pourquoi elle existe

**Type de correction**: Safe (suppression de colonne)

---

### DB-009: Manque d'index sur certaines colonnes fréquentes

**Gravité**: P2
**Zone**: Indexes / Performance

**Description**:
Certaines colonnes fréquemment utilisées dans les filtres ou jointures n'ont pas d'index :
- `matches.winner` (utilisé pour les calculs de scores)
- `users_profiles.nickname` (utilisé pour l'affichage leaderboard)
- `user_scores.stage` (utilisé pour filtrer par stage)

**Pourquoi c'est un problème**:
- **Performance**: Requêtes plus lentes sans index
- **Scalabilité**: Problème avec beaucoup de données
- **Incohérence**: D'autres colonnes similaires ont des index

**Impact concret possible**:
- Leaderboard plus lent à charger
- Calculs de scores plus lents
- Timeout sur les requêtes

**Recommandation de correction**:
1. Ajouter des index sur `matches.winner`
2. Ajouter un index sur `users_profiles.nickname`
3. Ajouter un index sur `user_scores.stage`
4. Analyser les requêtes du front pour identifier d'autres colonnes qui nécessitent des index

**Type de correction**: Safe (ajout d'index)

---

### DB-010: Doublon de policy SELECT sur certaines tables

**Gravité**: P2
**Zone**: Policies / Security / Maintenabilité

**Description**:
Certaines tables ont des policies SELECT redondantes :
- `matches`: "Authenticated users can view matches" ET "Matches are publicly readable"
- `user_scores`: "Authenticated users can view user scores" ET "Scores are publicly readable"
- `users_profiles`: "Authenticated users can view user profiles" ET "Profiles are publicly readable for leaderboard"

**Pourquoi c'est un problème**:
- **Confusion**: Difficile de savoir quelle policy s'applique
- **Maintenance**: Deux policies à maintenir au lieu d'une
- **Comportement imprévu**: Les policies sont combinées avec OR, donc si l'une est trop permissive, l'autre ne sert à rien

**Impact concret possible**:
- Erreur de compréhension des droits d'accès
- Policy trop permissive non détectée parce que l'autre la cache
- Difficile de debuguer les problèmes d'accès

**Recommandation de correction**:
1. Fusionner les policies SELECT redondantes en une seule
2. Garder la policy la plus permissive si c'est le comportement voulu
3. Documenter clairement les intentions

**Type de correction**: Safe (fusion de policies)

---

## 4. Analyse détaillée par catégorie

### Schéma / Tables

#### Points positifs
- ✅ Noms de tables cohérents et clairs
- ✅ Types de données appropriés (UUID pour les IDs, timestamp avec timezone)
- ✅ Contraintes NOT NULL bien placées
- ✅ Clés primaires claires
- ✅ Default values appropriées (created_at, updated_at, finished=false)

#### Points à améliorer
- 🔴 `matches.home_team`/`away_team` devraient être des FK vers `teams` (DB-001)
- 🔴 `competition_results.stage` devrait être un enum (DB-002)
- 🔴 `competition_results.group_name` devrait être validé (DB-003)
- 🟡 `teams.flag_url` inutilisée (DB-008)
- 🟡 `competition_visibility_settings` est un singleton mais pas de contrainte pour garantir l'unicité

#### Redondances
- `matches.finished` + `matches.home_score`/`away_score` : on pourrait déduire finished si les scores sont NULL
- `competition_leaderboard` + `user_scores` : les deux stockent des scores, mais à différents niveaux d'agrégation

#### Colonnes potentiellement manquantes
- `matches` n'a pas de lien vers `teams` (home_team_id, away_team_id)
- `predictions` n'a pas de colonne pour stocker si la prédiction était correcte
- `user_scores` n'a pas de lien vers `rules` pour savoir quelles règles ont été utilisées

---

### Relations / FKs / Contraintes

#### Points positifs
- ✅ Foreign keys bien définies vers `auth.users(id)`
- ✅ Contrainte UNIQUE sur `matches.external_id` (empêche les doublons)
- ✅ Contrainte CHECK sur `competition_leaderboard.total_points` (cohérence des points)
- ✅ Contrainte CHECK sur `matches.winner` (valeurs valides)
- ✅ Index UNIQUE sur `predictions(user_id, match_id)` (une prédiction par utilisateur par match)
- ✅ Index UNIQUE sur `user_scores(user_id, match_id)` (un score par utilisateur par match)

#### Points à améliorer
- 🔴 Manque de FK `matches.home_team_id` → `teams(id)` (DB-001)
- 🔴 Manque de FK `matches.away_team_id` → `teams(id)` (DB-001)
- 🔴 Manque de validation sur `competition_results.group_name` (DB-003)
- 🟡 `competition_results.stage` utilise un text avec CHECK au lieu d'un enum (DB-002)
- 🟡 Pas de contrainte pour garantir que `competition_visibility_settings` est un singleton

#### Contraintes CHECK existantes
- `matches.winner`: NULL ou 'home'/'away' ✅
- `competition_results.stage`: 'groups'/'semi_final'/'final' 🟡 (devrait être un enum)
- `competition_results.position`: >= 1 ✅
- `user_scores.score`: >= 0 ✅
- `competition_leaderboard.total_points`: >= 0 ✅
- `competition_leaderboard.group_points`: >= 0 ✅
- `competition_leaderboard.knockout_points`: >= 0 ✅
- `competition_leaderboard.total_points = group_points + knockout_points` ✅
- `rules.rules_json`: doit être un object ✅
- `competition_predictions.predictions_json`: doit être un object ✅

---

### Vues

#### Vue `leaderboard_detailed_view`
**Utilisation**: ✅ Utilisée par le front (`app/leaderboard/page.tsx`)
**Qualité**: ✅ Bonne design avec CTE pour les stats
**Problèmes**: Aucun majeur
**Recommandation**: Garder telle quelle

#### Vue `leaderboard_view`
**Utilisation**: ❌ Non utilisée (remplacée par `leaderboard_detailed_view`)
**Qualité**: 🟡 Version simplifiée sans stats détaillées
**Problèmes**: Obsolète, crée de la confusion (DB-004)
**Recommandation**: Supprimer ou documenter clairement son utilité

#### Vue `competition_predictions_with_users`
**Utilisation**: ✅ Utilisée par l'API (`app/api/competition-predictions/others/route.ts`)
**Qualité**: 🟡 Jointure simple mais expose des données sensibles
**Problèmes**: Expose les emails (DB-005)
**Recommandation**: Retirer `up.email`, garder uniquement `up.nickname`

#### Vue `user_prediction_tracking`
**Utilisation**: ✅ Utilisée par l'admin (`components/admin/UserPredictionTracking.tsx`)
**Qualité**: 🔴 Logique complexe avec CROSS JOIN
**Problèmes**: Performance avec CROSS JOIN (DB-006)
**Recommandation**: Refondre pour éviter le CROSS JOIN ou utiliser une table matérialisée

---

### Fonctions

#### `handle_new_user()`
**Rôle**: Crée automatiquement le profil utilisateur lors de l'inscription
**Sécurité**: SECURITY DEFINER ✅
**Qualité**: ✅ Bonne gestion du conflit avec ON CONFLICT
**Problèmes**: Aucun
**Recommandation**: Garder telle quelle

#### `is_admin()`
**Rôle**: Vérifie si l'utilisateur connecté est admin
**Sécurité**: SECURITY DEFINER ✅
**Qualité**: ✅ Simple et efficace
**Problèmes**: Aucun
**Recommandation**: Garder telle quelle

#### `set_updated_at()`
**Rôle**: Met à jour `updated_at` automatiquement
**Sécurité**: SECURITY INVOKER ✅
**Qualité**: ✅ Simple et efficace
**Problèmes**: Aucun
**Recommandation**: Garder telle quelle

#### `validate_prediction()`
**Rôle**: Valide les prédictions avant insert/update
**Sécurité**: SECURITY INVOKER ✅
**Qualité**: ✅ Logique de validation complète
**Validations**:
- Match existe ✅
- Match non terminé ✅
- Deadline non passée ✅
- predicted_winner requis pour knockout draw ✅
- predicted_winner null pour group stage ✅
**Problèmes**: Aucun
**Recommandation**: Garder telle quelle

#### `rls_auto_enable()`
**Rôle**: Active RLS automatiquement sur les nouvelles tables
**Sécurité**: SECURITY DEFINER + SET search_path TO 'pg_catalog' ✅
**Qualité**: ✅ Bonne pratique de sécurité
**Problèmes**: Aucun
**Recommandation**: Garder telle quelle

---

### Triggers

#### Triggers `set_updated_at`
**Tables**: matches, predictions, rules, users_profiles
**Qualité**: ✅ Cohérent sur toutes les tables
**Problèmes**: Aucun
**Recommandation**: Garder tels quels

#### Triggers `validate_prediction`
**Tables**: predictions (INSERT et UPDATE)
**Qualité**: ✅ Validation avant insertion/modification
**Problèmes**: Aucun
**Recommandation**: Garder tels quels

#### Event trigger `ensure_rls`
**Fonction**: `rls_auto_enable()`
**Qualité**: ✅ Bonne pratique de sécurité par défaut
**Problèmes**: Aucun
**Recommandation**: Garder tel quel

---

### Policies / Sécurité

#### Table `users_profiles`
**Policies**:
- SELECT: Authenticated + public ✅
- INSERT: own profile ✅
- UPDATE: own profile ✅
- DELETE: Aucune ⚠️
**Problèmes**: Pas de policy DELETE (intentionnel ?)
**Recommandation**: Vérifier si c'est intentionnel, sinon ajouter policy DELETE pour own profile

#### Table `matches`
**Policies**:
- SELECT: Authenticated + public ✅
- INSERT: Admin only ✅
- UPDATE: Admin only ✅
- DELETE: Admin only ✅
**Problèmes**: Doublon de policy SELECT (DB-010)
**Recommandation**: Fusionner les policies SELECT

#### Table `predictions`
**Policies**:
- SELECT: own predictions ✅
- INSERT: own predictions ✅
- UPDATE: own predictions ✅
- DELETE: own predictions ✅
**Problèmes**: Aucun
**Recommandation**: Garder telles quelles

#### Table `user_scores`
**Policies**:
- SELECT: Authenticated + public ✅
- INSERT/UPDATE/DELETE: Admin only ✅
**Problèmes**: Doublon de policy SELECT (DB-010)
**Recommandation**: Fusionner les policies SELECT

#### Table `teams`
**Policies**:
- SELECT: Public ✅
- INSERT/UPDATE/DELETE: Aucune ⚠️
**Problèmes**: Pas de policies pour modifications (intentionnel ?)
**Recommandation**: Vérifier si c'est intentionnel, sinon ajouter policies admin-only

#### Table `rules`
**Policies**:
- SELECT: Public ✅
- INSERT/UPDATE/DELETE: Admin only ✅
**Problèmes**: Aucun
**Recommandation**: Garder telles quelles

#### Table `competition_predictions`
**Policies**:
- SELECT: own predictions ✅
- INSERT: own predictions ✅
- UPDATE: own predictions ✅
- DELETE: own predictions ✅
**Problèmes**: Aucun
**Recommandation**: Garder telles quelles

#### Table `competition_results`
**Policies**:
- SELECT: Authenticated ✅
- INSERT/UPDATE/DELETE: Service role only ✅
**Problèmes**: Aucun
**Recommandation**: Garder telles quelles

#### Table `competition_leaderboard`
**Policies**:
- SELECT: own entry ✅
- INSERT/UPDATE/DELETE: Admin only ✅
**Problèmes**: Aucun
**Recommandation**: Garder telles quelles

#### Table `competition_visibility_settings`
**Policies**:
- SELECT: Authenticated ✅
- INSERT/UPDATE/DELETE: Admin only ✅
**Problèmes**: Aucun
**Recommandation**: Garder telles quelles

---

### Index / Performance

#### Index existants
**matches**:
- external_id ✅
- finished ✅
- stage ✅
- start_time ✅

**predictions**:
- user_id ✅
- match_id ✅
- (user_id, match_id) UNIQUE ✅

**user_scores**:
- user_id ✅
- match_id ✅
- computed_at ✅
- (user_id, match_id) UNIQUE ✅

**teams**:
- group_name ✅

**competition_results**:
- group_name ✅
- stage ✅
- team_id ✅

**competition_leaderboard**:
- total_points ✅
- user_id ✅

**rules**:
- is_active ✅

#### Index manquants (DB-009)
- `matches.winner` (utilisé pour les calculs de scores)
- `users_profiles.nickname` (utilisé pour l'affichage leaderboard)
- `user_scores.stage` (utilisé pour filtrer par stage)

#### Index redondants
- `predictions.user_id` et `predictions.match_id` sont couverts par l'index composite (user_id, match_id)
- `user_scores.user_id` et `user_scores.match_id` sont couverts par l'index composite (user_id, match_id)

---

### Maintenabilité / Dette technique

#### Points positifs
- ✅ Séparation claire des fichiers SQL (schema, functions, triggers, policies, views, indexes)
- ✅ Commentaires explicites dans le code
- ✅ Noms cohérents et descriptifs
- ✅ Event trigger pour sécurité par défaut

#### Points à améliorer
- 🟡 Vue `leaderboard_view` obsolète (DB-004)
- 🟡 Doublon de policies SELECT (DB-010)
- 🟡 Colonne `teams.flag_url` inutilisée (DB-008)
- 🟡 `competition_results.stage` utilise text + CHECK au lieu d'enum (DB-002)
- 🟡 JSON sans validation de structure (DB-007)

#### Code mort / Legacy
- Vue `leaderboard_view` non utilisée (DB-004)
- Colonne `teams.flag_url` toujours NULL (DB-008)

#### Points confus
- Design singleton de `competition_visibility_settings` pas garanti par une contrainte
- Incohérence entre `matches.stage` (enum) et `competition_results.stage` (text + CHECK)
- Duplication de noms d'équipes en text vs références teams

---

## 5. Liste des incohérences / redondances / éléments suspects

### Colonnes inutiles ou ambiguës
- `teams.flag_url` - Toujours NULL, jamais utilisée (DB-008)
- `competition_visibility_settings.id` - Pour un singleton, l'ID n'est pas vraiment nécessaire

### Tables qui doublonnent une logique
- `user_scores` et `competition_leaderboard` - Les deux stockent des scores, mais à différents niveaux d'agrégation (match vs compétition). C'est intentionnel mais pourrait être confus.

### Vues qui exposent des colonnes bancales
- `competition_predictions_with_users` - Expose `up.email` (données sensibles) (DB-005)
- `leaderboard_view` - Vue obsolète qui pourrait être utilisée par erreur (DB-004)

### Fonctions obsolètes
- Aucune fonction obsolète détectée

### Policies incohérentes
- Doublon de policies SELECT sur `matches`, `user_scores`, `users_profiles` (DB-010)
- Pas de policies DELETE sur `users_profiles` (intentionnel ?)
- Pas de policies INSERT/UPDATE/DELETE sur `teams` (intentionnel ?)

### Logique métier répartie à plusieurs endroits
- Calcul des scores: Logique dans `lib/scoring/recalculateCompetition.ts` et `lib/recalculateScores.ts` (code TypeScript), pas dans la base
- Validation des prédictions: Trigger `validate_prediction()` dans la base ✅
- Mise à jour de `updated_at`: Trigger `set_updated_at()` dans la base ✅

---

## 6. Plan d'action recommandé

### P0 - À corriger en premier

#### DB-001: matches.home_team / away_team sont des text sans FK vers teams
**Type**: Nécessite une migration prudente avec backfill de données
**Correction**:
1. Ajouter `home_team_id` et `away_team_id` (UUID) avec FK vers `teams(id)`
2. Migrer les données existantes en faisant un mapping nom → ID
3. Marquer les colonnes `home_team`/`away_team` comme obsolètes
4. Mettre à jour toutes les requêtes, vues et fonctions
5. Mettre à jour le front
**Risque**: Élevé - impact sur tout le système
**Délai estimé**: 2-3 jours de développement + tests

#### DB-002: competition_results.stage est un text avec CHECK, pas d'enum
**Type**: Safe avec migration de type (si compatible) ou nécessite une décision produit
**Correction**:
1. Créer un nouvel enum `competition_stage` ou réutiliser `match_stage`
2. Modifier `competition_results.stage` pour utiliser l'enum
3. Mettre à jour ou supprimer la contrainte CHECK
4. Vérifier la compatibilité des données existantes
**Risque**: Moyen - impact sur le code qui utilise cette colonne
**Délai estimé**: 1 jour de développement + tests

#### DB-003: competition_results.group_name sans validation
**Type**: Safe (ajout de contrainte CHECK ou enum)
**Correction**:
1. Ajouter une contrainte CHECK sur `group_name` pour limiter aux valeurs A-L
2. Ou créer un enum pour les noms de groupes
3. Vérifier que toutes les valeurs existantes sont valides
**Risque**: Faible - si des données invalides existent, la migration échouera
**Délai estimé**: 0.5 jour de développement + tests

---

### P1 - Important mais pas bloquant immédiat

#### DB-004: Vue leaderboard_view obsolète et non utilisée
**Type**: Safe (suppression de vue non utilisée)
**Correction**:
1. Vérifier dans tout le codebase qu'elle n'est pas utilisée
2. Supprimer la vue
**Risque**: Faible - vue non utilisée
**Délai estimé**: 0.5 jour

#### DB-005: competition_predictions_with_users expose les emails
**Type**: Safe (modification de vue)
**Correction**:
1. Retirer `up.email` de la vue
2. Garder uniquement `up.nickname`
3. Tester l'API qui utilise cette vue
**Risque**: Faible - modification mineure
**Délai estimé**: 0.5 jour + tests

#### DB-006: user_prediction_tracking utilise un CROSS JOIN
**Type**: Nécessite une refonte de la vue (risque de changement de comportement)
**Correction**:
1. Repenser la logique pour éviter le CROSS JOIN
2. Utiliser une approche par utilisateur avec une sous-requête
3. Ou créer une table matérialisée rafraîchie périodiquement
4. Tester la performance avant/après
**Risque**: Moyen - changement de logique potentiel
**Délai estimé**: 1-2 jours + tests

#### DB-007: breakdown_json et predictions_json sans validation de structure
**Type**: Safe (ajout de contraintes CHECK)
**Correction**:
1. Ajouter des contraintes CHECK pour vérifier la présence de champs obligatoires
2. Utiliser jsonb_path_query pour valider la structure
3. Documenter la structure attendue
**Risque**: Faible - si des données invalides existent, la migration échouera
**Délai estimé**: 1 jour + tests

---

### P2 - Amélioration utile

#### DB-008: teams.flag_url toujours NULL
**Type**: Safe (suppression de colonne)
**Correction**:
1. Supprimer la colonne `flag_url`
2. Ou l'implémenter correctement
**Risque**: Faible - colonne inutilisée
**Délai estimé**: 0.25 jour

#### DB-009: Manque d'index sur certaines colonnes fréquentes
**Type**: Safe (ajout d'index)
**Correction**:
1. Ajouter des index sur `matches.winner`, `users_profiles.nickname`, `user_scores.stage`
2. Analyser les requêtes du front pour identifier d'autres colonnes
**Risque**: Faible - amélioration de performance uniquement
**Délai estimé**: 0.5 jour

#### DB-010: Doublon de policy SELECT sur certaines tables
**Type**: Safe (fusion de policies)
**Correction**:
1. Fusionner les policies SELECT redondantes sur `matches`, `user_scores`, `users_profiles`
2. Garder la policy la plus permissive
3. Documenter clairement les intentions
**Risque**: Faible - clarification uniquement
**Délai estimé**: 0.5 jour

---

### P3 - Dette technique / confort / nettoyage

#### Documentation manquante
- Documenter la structure attendue des JSON (`breakdown_json`, `predictions_json`, `rules_json`)
- Documenter pourquoi `teams.flag_url` existe mais n'est pas utilisée
- Documenter l'intention du design singleton de `competition_visibility_settings`

#### Contrainte pour garantir singleton
- Ajouter une contrainte pour garantir qu'une seule ligne existe dans `competition_visibility_settings`
- Ou utiliser un trigger pour empêcher l'insertion de plusieurs lignes

#### Index redondants
- Évaluer si les index simples `predictions.user_id`, `predictions.match_id` sont nécessaires (couverts par l'index composite)
- Évaluer si les index simples `user_scores.user_id`, `user_scores.match_id` sont nécessaires (couverts par l'index composite)

---

## Résumé

### Nombre de problèmes par gravité
- **P0 (Critiques)**: 3 problèmes
- **P1 (Importants)**: 4 problèmes
- **P2 (Améliorations)**: 3 problèmes
- **P3 (Dette technique)**: 4 problèmes

### Sujets les plus critiques à traiter en priorité

1. **DB-001**: `matches.home_team`/`away_team` sont des text sans FK vers `teams`
   - Impact: Duplication de données, incohérence possible, pas de validation
   - Correction: Migration vers des FK avec backfill de données

2. **DB-002**: `competition_results.stage` est un text avec CHECK, pas d'enum
   - Impact: Incohérence de types, perte d'information, maintenance difficile
   - Correction: Migration vers un enum

3. **DB-003**: `competition_results.group_name` sans validation
   - Impact: Pas de validation, incohérence possible
   - Correction: Ajout de contrainte CHECK ou enum

4. **DB-005**: `competition_predictions_with_users` expose les emails
   - Impact: Fuite de données personnelles, problème RGPD
   - Correction: Retirer l'email de la vue

5. **DB-006**: `user_prediction_tracking` utilise un CROSS JOIN
   - Impact: Performance, scalabilité
   - Correction: Refondre la vue ou utiliser une table matérialisée

### Incohérences potentiellement dangereuses pour la prod

1. **DB-001**: Duplication de noms d'équipes en text vs références teams
   - Risque: Matchs avec des noms d'équipes qui n'existent pas, calculs de scores incorrects

2. **DB-005**: Exposition des emails dans la vue `competition_predictions_with_users`
   - Risque: Fuite de données personnelles, problème de conformité RGPD

3. **DB-006**: CROSS JOIN dans `user_prediction_tracking`
   - Risque: Performance dégradée, timeout, impact sur l'expérience admin

4. **DB-007**: JSON sans validation de structure
   - Risque: Insertion de JSON malformés qui cassent le front, erreurs runtime

5. **DB-003**: `competition_results.group_name` sans validation
   - Risque: Incohérence entre `competition_results` et `teams`, erreurs de calcul

---

## 7. Business & Product Analysis

Cette section analyse la pertinence métier du modèle de données, sa cohérence avec les fonctionnalités du produit, et son évolutivité fonctionnelle.

### 7.1 Table-by-table business relevance

#### users_profiles
**Rôle métier**: Profil utilisateur avec identité et permissions admin
**Indispensable**: ✅ OUI
**Séparation**: Bien séparée de `auth.users` (Supabase Auth) pour stocker les métadonnées métier
**Utilisation**: Correctement utilisée pour l'affichage leaderboard, la gestion admin, et les prédictions
**Adaptation features actuelles**: Adaptée, avec `nickname` pour l'affichage public et `is_admin` pour la gestion
**Futur**: Peut nécessiter d'autres métadonnées (avatar, préférences, stats historiques)

**Verdict**: "utile et nécessaire" - Modèle simple et efficace pour les besoins actuels

---

#### matches
**Rôle métier**: Matchs de la coupe du monde avec scores et résultats
**Indispensable**: ✅ OUI - Cœur du produit
**Séparation**: Bien séparée mais **problème métier majeur**: `home_team`/`away_team` sont des text sans FK vers `teams`
**Utilisation**: Correctement utilisée par `predictions` et `user_scores`
**Adaptation features actuelles**: Adaptée mais la duplication de noms d'équipes est un problème métier (DB-001)
**Futur**: Si on ajoute des features comme "parcours d'une équipe", "stats par équipe", le modèle actuel sera très limitant

**Verdict**: "utile mais simplifiable" - Structure de base correcte mais la duplication de noms d'équipes est une dette métier importante

---

#### predictions
**Rôle métier**: Prédictions de matchs par utilisateur
**Indispensable**: ✅ OUI - Cœur du produit
**Séparation**: Bien séparée avec FK claires vers `auth.users` et `matches`
**Utilisation**: Correctement utilisée avec validation trigger (`validate_prediction`)
**Adaptation features actuelles**: Adaptée pour les pronostics de matchs
**Futur**: Si on veut ajouter des features comme "prédictions de buteurs", "prédictions de corners", le modèle actuel devra être étendu

**Verdict**: "utile et nécessaire" - Modèle clair et bien pensé pour les prédictions de matchs

---

#### user_scores
**Rôle métier**: Scores calculés par match pour chaque utilisateur
**Indispensable**: ⚠️ PARTIEL - C'est une table de cache/agrégation
**Séparation**: Séparée mais fait doublon avec `competition_leaderboard` (agrégation à différents niveaux)
**Utilisation**: Utilisée pour le leaderboard global mais la logique de calcul est dans le code TypeScript (`lib/scoringEngine.ts`)
**Adaptation features actuelles**: Adaptée mais la séparation entre `user_scores` (matchs) et `competition_leaderboard` (compétition) peut être confuse
**Futur**: Si on ajoute d'autres types de scores (bonus, streaks, etc.), la logique d'agrégation deviendra complexe

**Verdict**: "utile mais simplifiable" - Table de cache nécessaire mais la logique d'agrégation est éclatée entre plusieurs tables

---

#### competition_predictions
**Rôle métier**: Prédictions de compétition (groupes, phases finales) par utilisateur
**Indispensable**: ✅ OUI - Feature spécifique importante
**Séparation**: Bien séparée avec contrainte UNIQUE sur `user_id` (une prédiction de compétition par utilisateur)
**Utilisation**: Correctement utilisée avec JSON structuré pour les prédictions de groupes et phases finales
**Adaptation features actuelles**: Adaptée pour les prédictions de compétition actuelles
**Futur**: Si on veut ajouter d'autres types de prédictions de compétition (top scorer, golden boot, etc.), le JSON sera plus complexe

**Verdict**: "utile et nécessaire" - Modèle bien pensé pour les prédictions de compétition avec JSON flexible

---

#### competition_results
**Rôle métier**: Résultats officiels du tournoi (groupes, phases finales)
**Indispensable**: ✅ OUI - Nécessaire pour calculer les scores de compétition
**Séparation**: Bien séparée avec FK vers `teams`
**Utilisation**: Correctement utilisée par `recalculateCompetition.ts`
**Adaptation features actuelles**: Adaptée mais **problème métier**: `stage` est un text avec CHECK limité à 3 valeurs (`groups`, `semi_final`, `final`) alors que l'enum `match_stage` a plus de valeurs (DB-002)
**Futur**: Si on veut tracker tous les rounds (round_of_16, quarter_final, third_place), le modèle actuel ne le supporte pas

**Verdict**: "utile mais simplifiable" - Structure correcte mais limitée par le manque de stages complets

---

#### competition_leaderboard
**Rôle métier**: Classement agrégé de la compétition (groupes + phases finales)
**Indispensable**: ⚠️ PARTIEL - C'est une table de cache/agrégation
**Séparation**: Séparée mais fait doublon avec `user_scores` (agrégation à différents niveaux)
**Utilisation**: Correctement utilisée pour le leaderboard de compétition
**Adaptation features actuelles**: Adaptée pour les features actuelles
**Futur**: Si on ajoute d'autres types de classements (par groupe, par phase, par région), le modèle actuel devra être étendu

**Verdict**: "utile mais complexité excessive pour la valeur métier" - Table de cache nécessaire mais la duplication avec `user_scores` crée de la confusion

---

#### rules
**Rôle métier**: Règles de scoring dynamiques
**Indispensable**: ✅ OUI - Permet de modifier les règles sans code
**Séparation**: Bien séparée avec JSON flexible pour les règles
**Utilisation**: Correctement utilisée par `lib/scoringEngine.ts`
**Adaptation features actuelles**: Adaptée pour les règles actuelles
**Futur**: Si on veut ajouter d'autres types de règles (bonus, pénalités, streaks), le JSON sera plus complexe

**Verdict**: "utile et nécessaire" - Modèle flexible et bien pensé pour les règles dynamiques

---

#### teams
**Rôle métier**: Équipes participantes avec groupe et FIFA code
**Indispensable**: ✅ OUI - Référence pour les matchs et résultats
**Séparation**: Bien séparée mais **problème métier majeur**: pas utilisée par `matches` (DB-001)
**Utilisation**: Utilisée par `competition_results` mais sous-exploitée par `matches`
**Adaptation features actuelles**: Partiellement adaptée - devrait être la source de vérité pour les équipes
**Futur**: Si on ajoute des features comme "stats par équipe", "parcours d'une équipe", le modèle actuel devra être relié à `matches`

**Verdict**: "utile mais sous-exploitée" - Table indispensable mais mal intégrée avec `matches`

---

#### competition_visibility_settings
**Rôle métier**: Settings globaux pour la visibilité des prédictions de compétition
**Indispensable**: ⚠️ PARTIEL - Singleton pour configurer l'UI
**Séparation**: Bien séparée comme singleton global
**Utilisation**: Correctement utilisée pour contrôler l'affichage des prédictions
**Adaptation features actuelles**: Adaptée pour les features actuelles
**Futur**: Si on ajoute d'autres settings globaux (deadlines, notifications, etc.), le modèle actuel devra être étendu

**Verdict**: "utile mais simplifiable" - Singleton fonctionnel mais pourrait être plus généralisé pour d'autres settings

---

### 7.2 Feature mapping (tables ↔ fonctionnalités)

#### Pronostics de matchs
**Tables utilisées**: `matches`, `predictions`, `user_scores`, `rules`
**Complexité**: Moyenne - 4 tables impliquées, logique de scoring dans le code TypeScript
**Duplication**: Pas de duplication significative
**Logique**: Bien répartie - `matches` pour les données, `predictions` pour les user inputs, `user_scores` pour les résultats, `rules` pour la logique de scoring

**Verdict**: Cohérent et bien pensé

---

#### Score en live
**Tables utilisées**: `matches`, `predictions`, `user_scores`
**Complexité**: Moyenne - Les scores sont recalculés via API (`/api/recalculate-scores`)
**Duplication**: `user_scores` est une table de cache, donc duplication intentionnelle
**Logique**: Scores calculés dans le code TypeScript (`lib/scoringEngine.ts`) puis stockés dans `user_scores`

**Verdict**: Cohérent mais dépend de la fréquence de recalcul

---

#### Leaderboard global
**Tables utilisées**: `users_profiles`, `user_scores`, `leaderboard_detailed_view`
**Complexité**: Faible - Vue `leaderboard_detailed_view` agrège tout
**Duplication**: La vue calcule à la volée, pas de duplication
**Logique**: Vue bien conçue avec stats détaillées (exact_score_count, correct_predictions_count)

**Verdict**: Cohérent et bien pensé

---

#### Leaderboard compétition
**Tables utilisées**: `competition_predictions`, `competition_results`, `competition_leaderboard`, `leaderboard_detailed_view`
**Complexité**: Moyenne - 4 tables impliquées, logique de scoring dans le code TypeScript (`lib/scoring/simpleScoring.ts`)
**Duplication**: `competition_leaderboard` est une table de cache, donc duplication intentionnelle
**Logique**: Scores calculés dans le code TypeScript puis stockés dans `competition_leaderboard`

**Verdict**: Cohérent mais complexité due à la séparation match/compétition

---

#### Pronostics de compétition (groupes / phases finales)
**Tables utilisées**: `competition_predictions`, `competition_results`, `teams`
**Complexité**: Faible - 3 tables, JSON structuré pour les prédictions
**Duplication**: Pas de duplication significative
**Logique**: JSON flexible dans `competition_predictions` pour supporter différents types de prédictions

**Verdict**: Cohérent et bien pensé

---

#### Tracking utilisateur / progression
**Tables utilisées**: `users_profiles`, `predictions`, `competition_predictions`, `user_prediction_tracking` (vue)
**Complexité**: Élevée - Vue `user_prediction_tracking` avec CROSS JOIN potentiellement lent (DB-006)
**Duplication**: Vue calcule à la volée, pas de duplication
**Logique**: Vue complexe pour calculer la continuité des prédictions

**Verdict**: Cohérent mais problème de performance (CROSS JOIN)

---

#### Règles de scoring dynamiques
**Tables utilisées**: `rules`
**Complexité**: Faible - 1 table avec JSON flexible
**Duplication**: Pas de duplication
**Logique**: JSON flexible permet de modifier les règles sans changer le schéma

**Verdict**: Cohérent et bien pensé

---

### 7.3 Redondances et complexité inutile

#### Redondances identifiées

1. **`competition_leaderboard` vs `user_scores`**
   - **Problème**: Deux tables de cache pour des scores à différents niveaux (match vs compétition)
   - **Impact**: Confusion sur la source de vérité, duplication de logique d'agrégation
   - **Verdict**: "complexité excessive pour la valeur métier" - Pourrait être unifié ou clarifié

2. **`leaderboard_view` vs `leaderboard_detailed_view`**
   - **Problème**: Deux vues similaires, une obsolète (DB-004)
   - **Impact**: Confusion pour les développeurs, maintenance inutile
   - **Verdict**: "probablement inutile / redondant" - Supprimer `leaderboard_view`

3. **`matches.home_team`/`away_team` vs `teams`**
   - **Problème**: Duplication de noms d'équipes en text vs références teams (DB-001)
   - **Impact**: Incohérence possible, pas de validation, jointures inefficaces
   - **Verdict**: "dette produit" - Migration nécessaire vers FK vers `teams`

4. **`competition_results.stage` vs `match_stage` enum**
   - **Problème**: Incohérence de types (text avec CHECK vs enum) (DB-002)
   - **Impact**: Perte d'information, maintenance difficile
   - **Verdict**: "dette produit" - Unifier les types

---

#### Complexité inutile

1. **`user_prediction_tracking` avec CROSS JOIN**
   - **Problème**: CROSS JOIN crée un produit cartésien (DB-006)
   - **Impact**: Performance dégradée avec beaucoup d'utilisateurs/matchs
   - **Verdict**: "complexité excessive pour la valeur métier" - Refondre la vue

2. **`competition_visibility_settings` comme singleton**
   - **Problème**: Pas de contrainte pour garantir l'unicité
   - **Impact**: Possibilité d'avoir plusieurs rows
   - **Verdict**: "utile mais simplifiable" - Ajouter une contrainte d'unicité

3. **JSON sans validation de structure**
   - **Problème**: `breakdown_json`, `predictions_json`, `rules_json` sans validation (DB-007)
   - **Impact**: Erreurs runtime possibles, difficulté à debugger
   - **Verdict**: "dette produit" - Ajouter des contraintes CHECK ou un schéma JSON

---

### 7.4 Product clarity score

**Score global de clarté**: 6/10

**Justification**:

**Points positifs**:
- ✅ Noms de tables clairs et cohérents
- ✅ Séparation logique entre données métier, configuration, et cache
- ✅ FK bien définies vers `auth.users`
- ✅ RLS activé sur toutes les tables
- ✅ Vue `leaderboard_detailed_view` bien conçue pour l'affichage

**Points négatifs**:
- 🔴 Duplication de noms d'équipes en text vs références teams (DB-001) - 2 points
- 🔴 Incohérence de types entre `competition_results.stage` et `match_stage` (DB-002) - 1 point
- 🟡 Deux tables de cache (`user_scores`, `competition_leaderboard`) créent de la confusion - 0.5 point
- 🟡 Vue `leaderboard_view` obsolète et non utilisée (DB-004) - 0.5 point

**Analyse pour un nouveau développeur**:
- Le flow "match → prediction → score → leaderboard" est globalement clair
- La séparation entre scores de matchs (`user_scores`) et scores de compétition (`competition_leaderboard`) peut être confuse
- La duplication de noms d'équipes est counter-intuitive pour un nouveau dev
- Les vues sont bien documentées mais l'existence de deux vues leaderboard est confuse

**Recommandation pour améliorer la clarté**:
1. Unifier les types de stages (DB-002)
2. Migrer `matches.home_team`/`away_team` vers FK vers `teams` (DB-001)
3. Supprimer `leaderboard_view` (DB-004)
4. Clarifier la distinction entre `user_scores` et `competition_leaderboard` dans la documentation

---

### 7.5 Product debt & scalability risks

#### Dette produit identifiée

1. **Duplication de noms d'équipes (DB-001)**
   - **Risque**: Si on ajoute des features comme "parcours d'une équipe", "stats par équipe", le modèle actuel sera très limitant
   - **Coût de changement**: Élevé - Nécessite une migration avec backfill de données
   - **Impact métier**: Bloque l'ajout de features liées aux équipes

2. **Incohérence de types de stages (DB-002)**
   - **Risque**: Si on veut tracker tous les rounds (round_of_16, quarter_final, third_place), le modèle actuel ne le supporte pas
   - **Coût de changement**: Moyen - Migration de type si compatible
   - **Impact métier**: Bloque l'ajout de rounds intermédiaires dans `competition_results`

3. **Table de cache `competition_leaderboard`**
   - **Risque**: Si on ajoute d'autres types de classements (par groupe, par phase, par région), le modèle actuel devra être étendu
   - **Coût de changement**: Moyen - Refactor de la logique d'agrégation
   - **Impact métier**: Le modèle actuel est trop spécifique au leaderboard global

4. **JSON sans validation (DB-007)**
   - **Risque**: Si on ajoute de nouveaux champs dans les JSON, le code qui les lit peut échouer
   - **Coût de changement**: Faible - Ajout de contraintes CHECK
   - **Impact métier**: Erreurs runtime possibles, difficulté à debugger

---

#### Risques d'évolutivité

1. **Scalabilité des prédictions**
   - **Risque**: Avec beaucoup d'utilisateurs et de matchs, la table `predictions` peut devenir très large
   - **Mitigation**: Index sur `(user_id, match_id)` déjà en place
   - **Verdict**: Gérable pour l'échelle actuelle

2. **Scalabilité du leaderboard**
   - **Risque**: La vue `leaderboard_detailed_view` calcule à la volée, peut être lente avec beaucoup d'utilisateurs
   - **Mitigation**: Table de cache `competition_leaderboard` pour la compétition, mais pas pour les matchs
   - **Verdict**: Risque moyen - Considérer une table de cache pour le leaderboard global

3. **Scalabilité du tracking**
   - **Risque**: La vue `user_prediction_tracking` avec CROSS JOIN peut être très lente (DB-006)
   - **Mitigation**: Refondre la vue ou utiliser une table matérialisée
   - **Verdict**: Risque élevé - Action nécessaire

4. **Scalabilité des règles**
   - **Risque**: Le JSON flexible dans `rules` peut devenir complexe avec beaucoup de règles
   - **Mitigation**: Documenter la structure attendue, ajouter des contraintes CHECK
   - **Verdict**: Gérable avec une bonne documentation

---

#### Zones où un changement métier sera coûteux

1. **Changement de la structure des prédictions de compétition**
   - **Coût**: Élevé - JSON stocké dans `competition_predictions`, nécessite une migration
   - **Impact**: Toutes les prédictions existantes doivent être migrées

2. **Changement de la logique de scoring**
   - **Coût**: Moyen - Logique dans le code TypeScript (`lib/scoringEngine.ts`), mais nécessite un recalcul des scores
   - **Impact**: Tous les scores doivent être recalculés

3. **Ajout de nouveaux types de scores**
   - **Coût**: Moyen - Nécessite d'ajouter des colonnes dans `user_scores` et `competition_leaderboard`
   - **Impact**: Migration de schéma, recalcul des scores

4. **Changement de la structure des équipes**
   - **Coût**: Élevé - Si on migre `matches.home_team`/`away_team` vers FK vers `teams`, nécessite un backfill de données
   - **Impact**: Toutes les requêtes, vues et fonctions qui utilisent ces colonnes doivent être mises à jour

---

#### Zones où le modèle est trop rigide

1. **`competition_results.stage` limité à 3 valeurs**
   - **Problème**: Ne supporte pas round_of_16, quarter_final, third_place
   - **Impact**: Impossible de tracker tous les rounds
   - **Solution**: Migrer vers un enum plus complet

2. **`competition_leaderboard` trop spécifique**
   - **Problème**: Structure spécifique au leaderboard global (group_points, knockout_points)
   - **Impact**: Difficile d'ajouter d'autres types de classements
   - **Solution**: Généraliser la structure ou créer des tables spécifiques pour chaque type de classement

3. **`user_scores` sans lien vers `rules`**
   - **Problème**: Impossible de savoir quelles règles ont été utilisées pour calculer un score
   - **Impact**: Difficile de recalculer les scores avec des règles différentes
   - **Solution**: Ajouter une colonne `rules_id` ou stocker une version des règles

---

#### Zones où le modèle est trop couplé

1. **`user_scores` couplé à `matches`**
   - **Problème**: Un score est toujours lié à un match
   - **Impact**: Difficile d'ajouter des scores qui ne sont pas liés à des matchs (bonus, pénalités, etc.)
   - **Solution**: Découpler `user_scores` de `matches` ou créer une table séparée pour les bonus

2. **`competition_leaderboard` couplé à la structure actuelle**
   - **Problème**: Structure spécifique (group_points, knockout_points)
   - **Impact**: Difficile d'ajouter d'autres types de points
   - **Solution**: Généraliser la structure ou utiliser un JSON flexible

---

### Conclusion business

Le modèle de données est **globalement bien pensé** pour un produit de pronostics sportif, mais présente quelques **dette produit** importantes:

**Points forts**:
- Séparation claire des responsabilités (données métier, configuration, cache)
- RLS activé sur toutes les tables
- Vue `leaderboard_detailed_view` bien conçue
- Règles de scoring dynamiques flexibles

**Points faibles**:
- Duplication de noms d'équipes (DB-001) - Dette produit majeure
- Incohérence de types de stages (DB-002) - Dette produit moyenne
- Deux tables de cache créent de la confusion
- Vue `leaderboard_view` obsolète (DB-004)
- CROSS JOIN dans `user_prediction_tracking` (DB-006) - Risque de performance

**Recommandations prioritaires**:
1. Migrer `matches.home_team`/`away_team` vers FK vers `teams` (DB-001)
2. Unifier les types de stages (DB-002)
3. Supprimer `leaderboard_view` (DB-004)
4. Refondre `user_prediction_tracking` pour éviter le CROSS JOIN (DB-006)
5. Ajouter des contraintes CHECK sur les JSON (DB-007)

**Score global de pertinence métier**: 7/10
- Le modèle est adapté aux features actuelles
- Il y a quelques dette produit importantes mais gérables
- Le modèle est évolutif mais nécessite quelques ajustements pour supporter de nouvelles features
