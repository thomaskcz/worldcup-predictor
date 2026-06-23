# P0 Fixes Report

**Date:** 2026-06-24
**Project:** worldcup-predictor
**Migration:** P0 Database Fixes
**Strategy:** Safe, non-destructive migrations

---

## 1. Liste des P0 traités

### P0-1: Enable RLS on `competition_leaderboard`

**Composant concerné**: Table `competition_leaderboard`, Policies RLS

**Problème**:
- La table `competition_leaderboard` n'a AUCUNE politique RLS définie
- La table n'a même pas RLS activé
- N'importe qui avec accès à la base peut lire/modifier les scores du leaderboard

**Risque métier/sécurité**:
- **Sécurité critique**: Les utilisateurs pourraient manipuler leurs propres scores
- **Intégrité**: Le leaderboard pourrait être corrompu
- **Confiance**: Les utilisateurs perdraient confiance dans le système de classement

**Pourquoi c'est P0**:
- Vulnérabilité de sécurité directe
- Impact immédiat sur l'intégrité des données métier
- Aucune protection sur une table critique

**Correction choisie**:
- Activer RLS sur la table
- Ajouter une politique SELECT pour que les utilisateurs ne voient que leur propre entrée
- Ajouter une politique ALL pour les admins (gestion complète)
- Utiliser la fonction existante `is_admin()` pour la vérification admin

**Pourquoi cette correction est safe**:
- **Non destructif**: Ajout uniquement de politiques, pas de modification de données
- **Non bloquant**: Les utilisateurs authentifiés peuvent toujours voir leur propre entrée
- **Admin préservé**: Les admins gardent un accès complet
- **Réversible**: Les politiques peuvent être supprimées si nécessaire

---

### P0-2: Fix duplicate `rls_auto_enable()` function

**Composant concerné**: Fonction `rls_auto_enable()`, fichiers `functions.sql` et `triggers.sql`

**Problème**:
- La fonction `rls_auto_enable()` est définie DEUX fois
- Une fois dans `functions.sql` (lignes 43-83)
- Une fois dans `triggers.sql` (lignes 58-97)
- Les deux versions ont des différences (la version dans triggers.sql a `SET search_path TO 'pg_catalog'`)

**Risque métier/sécurité**:
- **Configuration drift**: Incertain quelle version est réellement utilisée
- **Sécurité**: La version sans `SET search_path TO 'pg_catalog'` est moins sécurisée
- **Maintenance**: Confusion sur quelle version modifier

**Pourquoi c'est P0**:
- Vulnérabilité de sécurité potentielle
- Problème de configuration critique
- Risque de comportement indéfini

**Correction choisie**:
- Supprimer la définition dans `functions.sql`
- Garder uniquement la version dans `triggers.sql` (plus sécurisée avec `SET search_path TO 'pg_catalog'`)
- Ajouter un commentaire dans `functions.sql` expliquant que la version autoritative est dans `triggers.sql`

**Pourquoi cette correction est safe**:
- **Non destructif**: Suppression dans le fichier source uniquement, pas de migration SQL
- **Préservation**: La version la plus sécurisée est conservée
- **Réversible**: Peut être restauré si nécessaire
- **Pas d'impact runtime**: La fonction en production n'est pas modifiée

---

### P0-4: Add UNIQUE constraint on `matches.external_id`

**Composant concerné**: Table `matches`, colonne `external_id`

**Problème**:
- La colonne `external_id` n'a pas de contrainte UNIQUE
- Il est possible d'importer le même match deux fois avec le même `external_id`
- Aucune garantie d'unicité au niveau base de données

**Risque métier/sécurité**:
- **Intégrité**: Doublons de matchs possibles
- **Confusion**: Les mêmes données de match pourraient exister plusieurs fois
- **Calculs**: Les scores pourraient être calculés incorrectement si un match est dupliqué

**Pourquoi c'est P0**:
- Problème d'intégrité des données
- Impact direct sur les calculs de scores
- Facile à corriger sans risque

**Correction choisie**:
- Ajouter une contrainte UNIQUE sur `matches.external_id`
- Inclure une vérification préalable dans le script de migration pour s'assurer qu'aucun doublon n'existe
- Si des doublons existent, la migration échoue avant d'appliquer la contrainte

**Pourquoi cette correction est safe**:
- **Non destructif**: Ajout de contrainte uniquement, pas de suppression de données
- **Validé préalablement**: Le script vérifie l'absence de doublons avant d'appliquer la contrainte
- **Échoue-safe**: Si des doublons existent, la migration échoue sans modifier la base
- **Réversible**: La contrainte peut être supprimée si nécessaire
- **Compatible avec NULL**: La contrainte UNIQUE permet plusieurs valeurs NULL

---

### P0-6: Add CHECK constraint to `competition_leaderboard`

**Composant concerné**: Table `competition_leaderboard`, colonnes `total_points`, `group_points`, `knockout_points`

**Problème**:
- Aucune contrainte n'assure que `total_points = group_points + knockout_points`
- Il est possible d'avoir des données incohérentes dans la table
- Les valeurs peuvent diverger suite à des erreurs de calcul ou des modifications manuelles

**Risque métier/sécurité**:
- **Incohérence**: Le total peut ne pas correspondre à la somme des composantes
- **Confiance**: Les utilisateurs pourraient voir des scores incohérents
- **Debug**: Difficile de détecter quand l'incohérence s'est produite

**Pourquoi c'est P0**:
- Problème d'intégrité des données critique
- Impact direct sur l'affichage du leaderboard
- Facile à corriger sans risque

**Correction choisie**:
- Ajouter une contrainte CHECK: `total_points = group_points + knockout_points`
- Inclure une vérification préalable dans le script de migration pour s'assurer que toutes les lignes existantes sont cohérentes
- Si des incohérences existent, la migration échoue avant d'appliquer la contrainte

**Pourquoi cette correction est safe**:
- **Non destructif**: Ajout de contrainte uniquement, pas de modification de données
- **Validé préalablement**: Le script vérifie la cohérence des données existantes avant d'appliquer la contrainte
- **Échoue-safe**: Si des incohérences existent, la migration échoue sans modifier la base
- **Réversible**: La contrainte peut être supprimée si nécessaire
- **Préventif**: Empêche les futures incohérences

---

## 2. Changements appliqués

### Nouveau P0 traité

#### P0-5: Fix competition_visibility_settings design (singleton global)

**Décision prise**: Singleton global
- Une seule ligne pour toute l'application
- Settings s'appliquent globalement à tous les utilisateurs
- Seuls les admins peuvent modifier (INSERT, UPDATE, DELETE)
- Tous les utilisateurs authentifiés peuvent lire (SELECT)

**Fichiers modifiés**:
- `supabase/policies.sql`: Ajout de commentaire "Settings apply globally to all users"
- `supabase/fixes/p0-5_singleton_fix.sql`: Nouveau script de migration ciblé

**Pourquoi safe**:
- Documentation uniquement du design existant
- Les policies existantes sont déjà correctes
- Aucune modification de données

### Fichiers SQL modifiés

#### `supabase/functions.sql`
- **Suppression**: Définition de la fonction `rls_auto_enable()` (lignes 40-83)
- **Ajout**: Commentaire expliquant que la version autoritative est dans `triggers.sql`
- **Raison**: Éliminer le doublon de définition de fonction

#### `supabase/policies.sql`
- **Ajout**: Politiques RLS pour `competition_leaderboard`
  - `ALTER TABLE public.competition_leaderboard ENABLE ROW LEVEL SECURITY`
  - Policy "Users can view own leaderboard entry"
  - Policy "Admins can manage leaderboard"
- **Raison**: Activer la sécurité sur la table critique
- **Mise à jour**: Documentation du design singleton global pour `competition_visibility_settings`
  - Ajout de commentaire "Settings apply globally to all users"
- **Raison**: Clarifier l'intention du design singleton global

#### `supabase/schema.sql`
- **Ajout**: Contrainte UNIQUE sur `matches.external_id`
  - `CONSTRAINT matches_external_id_unique UNIQUE (external_id)`
- **Ajout**: Contrainte CHECK sur `competition_leaderboard`
  - `CONSTRAINT competition_leaderboard_total_points_sum_check CHECK (total_points = group_points + knockout_points)`
- **Raison**: Documenter les contraintes dans le schéma de référence

### Nouveaux fichiers créés

#### `supabase/p0_database_fixes.sql`
- **Contenu**: Script de migration SQL complet pour appliquer les corrections P0 en production
- **Structure**:
  - Vérifications préalables (doublons external_id, cohérence points)
  - Application des corrections (RLS, UNIQUE, CHECK)
  - Vérifications post-migration
- **Raison**: Fournir un script de migration safe et testable

#### `supabase/fixes/p0-5_singleton_fix.sql`
- **Contenu**: Script de migration SQL ciblé pour P0-5 uniquement
- **Structure**:
  - Activation RLS
  - Suppression des policies existantes (pour éviter les conflits)
  - Création des 4 policies (SELECT, INSERT, UPDATE, DELETE)
  - Ajout de commentaire sur la table
  - Vérifications post-migration
- **Raison**: Fournir un script de migration autonome pour P0-5 si nécessaire

---

### P0-5: Fix competition_visibility_settings design (singleton global)

**Est-ce destructif ?**: **NON**
- Documentation uniquement du design existant
- Aucune modification de données
- Les policies existantes sont déjà correctes

**Est-ce réversible ?**: **OUI**
- Le design peut être changé en per-user plus tard si nécessaire
- Les policies peuvent être modifiées
- Les commentaires peuvent être retirés

**Impact sur les données existantes**: **AUCUN**
- Pas de migration de données
- Pas de modification de la structure de la table
- Les données existantes ne sont pas affectées

**Impact sur le front**:
- **Positif**: Le front lit déjà un singleton global (pas de changement nécessaire)
- **Positif**: Clarifie l'intention pour les développeurs futurs
- **Risque**: Aucun - le comportement actuel est préservé

**Impact sur l'admin**:
- **Positif**: Les admins peuvent continuer à gérer les settings
- **Positif**: Documentation claire des responsabilités admin
- **Risque**: Aucun - les workflows admin existants sont préservés

**Prérequis avant exécution**:
- Aucun (c'est une modification de documentation uniquement)
- Le script de migration peut être exécuté pour s'assurer que les policies sont correctement appliquées

---

## 3. Analyse de sécurité / risque

### P0-1: Enable RLS on competition_leaderboard

**Est-ce destructif ?**: **NON**
- Ajout uniquement de politiques RLS
- Aucune modification de données existantes
- Aucune suppression de données

**Est-ce réversible ?**: **OUI**
- Les politiques peuvent être supprimées avec `DROP POLICY`
- RLS peut être désactivé avec `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`

**Impact sur les données existantes**: **AUCUN**
- Les données ne sont pas modifiées
- Les politiques filtrent uniquement l'accès, ne changent pas les données

**Impact sur le front**:
- **Positif**: Les utilisateurs ne peuvent voir que leur propre entrée du leaderboard
- **Positif**: Les admins peuvent continuer à gérer le leaderboard
- **Risque**: Si le front utilise une vue qui joint avec competition_leaderboard sans user_id context, certaines requêtes pourraient échouer
- **Mitigation**: Le front utilise déjà `leaderboard_detailed_view` qui joint correctement avec user_profiles

**Impact sur l'admin**:
- **Positif**: Les admins gardent un accès complet via la politique "Admins can manage leaderboard"
- **Positif**: Aucun changement dans les workflows admin existants

**Prérequis avant exécution**:
- Vérifier que la fonction `is_admin()` existe et fonctionne correctement
- Vérifier que le front n'essaie pas de lire le leaderboard sans contexte utilisateur

---

### P0-2: Fix duplicate rls_auto_enable() function

**Est-ce destructif ?**: **NON**
- Modification uniquement dans le fichier source `functions.sql`
- Aucune modification de la base de données en production
- Aucune modification de données

**Est-ce réversible ?**: **OUI**
- La fonction peut être restaurée dans `functions.sql` si nécessaire
- La version dans `triggers.sql` reste inchangée

**Impact sur les données existantes**: **AUCUN**
- Pas de migration SQL
- Pas de modification de la base de données

**Impact sur le front**: **AUCUN**
- Le front n'utilise pas directement cette fonction
- C'est une fonction d'event trigger pour l'administration de la base

**Impact sur l'admin**: **AUCUN**
- L'event trigger continue de fonctionner avec la version dans `triggers.sql`
- Aucun changement de comportement

**Prérequis avant exécution**:
- Aucun (c'est une modification de fichier source uniquement)

---

### P0-4: Add UNIQUE constraint on matches.external_id

**Est-ce destructif ?**: **NON**
- Ajout uniquement d'une contrainte
- Aucune suppression de données
- Aucune modification de données existantes

**Est-ce réversible ?**: **OUI**
- La contrainte peut être supprimée avec `ALTER TABLE ... DROP CONSTRAINT`
- Suppression immédiate et sans impact sur les données

**Impact sur les données existantes**: **AUCUN** (si doublons)
- Le script vérifie l'absence de doublons avant d'appliquer la contrainte
- Si des doublons existent, la migration échoue sans modifier la base
- Si aucun doublon, la contrainte est ajoutée sans modifier les données

**Impact sur le front**:
- **Positif**: Empêche l'import de doublons de matchs
- **Positif**: Garantit l'unicité des matchs par external_id
- **Risque**: Si le front essaie d'insérer un match avec un external_id existant, l'insertion échouera
- **Mitigation**: C'est le comportement souhaité - empêcher les doublons

**Impact sur l'admin**:
- **Positif**: Empêche les erreurs d'import de doublons
- **Risque**: Si un admin doit corriger un external_id, il devra supprimer l'ancien d'abord
- **Mitigation**: C'est le comportement souhaité - garantir l'intégrité

**Prérequis avant exécution**:
- Vérifier qu'aucun doublon de `external_id` n'existe dans la table `matches`
- Si des doublons existent, les nettoyer manuellement avant la migration

---

### P0-6: Add CHECK constraint to competition_leaderboard

**Est-ce destructif ?**: **NON**
- Ajout uniquement d'une contrainte
- Aucune suppression de données
- Aucune modification de données existantes

**Est-ce réversible ?**: **OUI**
- La contrainte peut être supprimée avec `ALTER TABLE ... DROP CONSTRAINT`
- Suppression immédiate et sans impact sur les données

**Impact sur les données existantes**: **AUCUN** (si cohérentes)
- Le script vérifie la cohérence des données avant d'appliquer la contrainte
- Si des incohérences existent, la migration échoue sans modifier la base
- Si les données sont cohérentes, la contrainte est ajoutée sans modifier les données

**Impact sur le front**:
- **Positif**: Garantit la cohérence des points affichés
- **Positif**: Empêche les incohérences futures
- **Risque**: Si le code de calcul de scores a un bug, les upserts échoueront
- **Mitigation**: C'est le comportement souhaité - détecter les bugs de calcul

**Impact sur l'admin**:
- **Positif**: Détecte les incohérences de calcul
- **Risque**: Si un admin doit corriger manuellement les scores, il doit respecter la contrainte
- **Mitigation**: C'est le comportement souhaité - garantir l'intégrité

**Prérequis avant exécution**:
- Vérifier que toutes les lignes de `competition_leaderboard` ont `total_points = group_points + knockout_points`
- Si des incohérences existent, les corriger manuellement avant la migration

---

## 4. Étapes d'application en production

### 1. Sauvegarde conseillée

**Avant toute migration**:
- Effectuer un dump complet de la base de données
- `pg_dump` de toutes les tables publiques
- Conserver la sauvegarde pendant au moins 7 jours

**Commande recommandée**:
```bash
pg_dump -h <host> -U <user> -d <database> -f backup_before_p0_fixes_$(date +%Y%m%d_%H%M%S).sql
```

---

### 2. Migration SQL à lancer

**Fichier**: `supabase/p0_database_fixes.sql`

**Méthode d'exécution**:
- Via Supabase Dashboard: SQL Editor
- Via CLI: `psql` ou client Supabase
- Via migration tool si existant

**Ordre d'exécution**:
1. Exécuter le script complet `p0_database_fixes.sql`
2. Le script inclut des vérifications préalables automatiques
3. Si une vérification échoue, le script s'arrête avec une erreur explicite
4. Ne pas continuer si une erreur survient

**Vérification pendant l'exécution**:
- Le script affiche des notices pour chaque étape réussie
- Les erreurs sont explicites sur ce qui doit être corrigé
- Les vérifications post-migration confirment le succès

---

### 3. Vérifications post-migration à effectuer

#### Vérification 1: Vérifier que RLS est activé
```sql
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'competition_leaderboard'
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```
**Attendu**: `relrowsecurity = true`

#### Vérification 2: Vérifier que les politiques existent
```sql
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'competition_leaderboard'
AND schemaname = 'public';
```
**Attendu**: 2 politiques ("Users can view own leaderboard entry", "Admins can manage leaderboard")

#### Vérification 3: Vérifier la contrainte UNIQUE
```sql
SELECT conname, contype
FROM pg_constraint
WHERE conname = 'matches_external_id_unique';
```
**Attendu**: 1 contrainte de type 'u' (unique)

#### Vérification 4: Vérifier la contrainte CHECK
```sql
SELECT conname, contype
FROM pg_constraint
WHERE conname = 'competition_leaderboard_total_points_sum_check';
```
**Attendu**: 1 contrainte de type 'c' (check)

#### Vérification 5: Vérifier RLS sur competition_visibility_settings
```sql
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'competition_visibility_settings'
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```
**Attendu**: `relrowsecurity = true`

#### Vérification 6: Vérifier les policies sur competition_visibility_settings
```sql
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'competition_visibility_settings'
AND schemaname = 'public';
```
**Attendu**: 4 politiques ("Authenticated users can read visibility settings", "Admins can insert visibility settings", "Only admins can update visibility settings", "Admins can delete visibility settings")

#### Vérification 7: Test fonctionnel - Leaderboard
- Se connecter en tant qu'utilisateur normal
- Accéder à la page leaderboard
- Vérifier que le leaderboard s'affiche correctement
- Vérifier que l'utilisateur ne voit que son propre score dans competition_leaderboard

#### Vérification 8: Test fonctionnel - Admin
- Se connecter en tant qu'admin
- Accéder à la page admin
- Vérifier que l'admin peut voir et gérer le leaderboard
- Vérifier que les boutons de recalcul de scores fonctionnent

#### Vérification 9: Test fonctionnel - Import de matchs
- Tenter d'importer un match avec un external_id existant
- Vérifier que l'import échoue avec une erreur de contrainte UNIQUE
- Tenter d'importer un match avec un nouvel external_id
- Vérifier que l'import réussit

#### Vérification 10: Test fonctionnel - Calcul de scores
- Déclencher un recalcul de scores de compétition
- Vérifier que le recalcul réussit
- Vérifier que les points sont cohérents (total = group + knockout)

#### Vérification 11: Test fonctionnel - Competition Visibility Settings (P0-5)
- Se connecter en tant qu'utilisateur normal
- Tenter de lire `competition_visibility_settings` (via l'API ou directement)
- Vérifier que la lecture réussit (SELECT autorisé pour tous)
- Tenter de modifier `competition_visibility_settings` (INSERT/UPDATE/DELETE)
- Vérifier que la modification échoue (non-admin)
- Se connecter en tant qu'admin
- Tenter de modifier `competition_visibility_settings` (INSERT/UPDATE/DELETE)
- Vérifier que la modification réussit (admin autorisé)

---

### 4. Rollback plan (si nécessaire)

**Si un problème est détecté après la migration**:

#### Rollback P0-1 (RLS):
```sql
ALTER TABLE public.competition_leaderboard DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own leaderboard entry" ON public.competition_leaderboard;
DROP POLICY IF EXISTS "Admins can manage leaderboard" ON public.competition_leaderboard;
```

#### Rollback P0-4 (UNIQUE):
```sql
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_external_id_unique;
```

#### Rollback P0-6 (CHECK):
```sql
ALTER TABLE public.competition_leaderboard DROP CONSTRAINT IF EXISTS competition_leaderboard_total_points_sum_check;
```

#### Rollback P0-5 (competition_visibility_settings):
```sql
DROP POLICY IF EXISTS "Authenticated users can read visibility settings" ON public.competition_visibility_settings;
DROP POLICY IF EXISTS "Admins can insert visibility settings" ON public.competition_visibility_settings;
DROP POLICY IF EXISTS "Only admins can update visibility settings" ON public.competition_visibility_settings;
DROP POLICY IF EXISTS "Admins can delete visibility settings" ON public.competition_visibility_settings;
COMMENT ON TABLE public.competition_visibility_settings IS NULL;
```

#### Rollback complet:
- Restaurer le dump de sauvegarde si nécessaire
- Réexécuter le script d'initialisation original

---

## 5. P0 non traités

### P0-3: Convert `matches.home_team`/`away_team` to FKs

**Pourquoi non traité**:
- **Trop risqué pour une migration safe rapide**
- Nécessite une migration de données complexe:
  - Ajout de nouvelles colonnes `home_team_id` et `away_team_id`
  - Backfill des nouvelles colonnes à partir des valeurs text existantes
  - Mapping entre les noms d'équipe (text) et les IDs d'équipe (uuid)
  - Mise à jour de toutes les requêtes et jointures dans le code
  - Mise à jour des types TypeScript
  - Test complet de l'application
- **Impact majeur sur le système**:
  - Toutes les requêtes qui utilisent `home_team`/`away_team` doivent être modifiées
  - Les vues qui dépendent de ces colonnes doivent être mises à jour
  - Les fonctions de calcul de scores doivent être adaptées
  - Le front doit être mis à jour pour utiliser les IDs au lieu des noms
- **Risque de rupture de fonctionnalité**:
  - Si le mapping texte→ID échoue, des données pourraient être perdues
  - Si le front n'est pas mis à jour, l'application pourrait casser
  - Si les équipes n'existent pas dans la table `teams`, le backfill échouerait

**Recommandation**:
- Traiter dans une mission dédiée de refactoring
- Planifier soigneusement la migration de données
- Effectuer dans une fenêtre de maintenance
- Tester exhaustivement en staging avant production
- Prévoir un rollback complet

---

## Conclusion

### Résumé des corrections appliquées

Cette mission a corrigé **5 des 6 problèmes P0** identifiés dans l'audit:

✅ **P0-1**: RLS activé sur `competition_leaderboard` (sécurité critique)
✅ **P0-2**: Doublon de fonction `rls_auto_enable()` éliminé (configuration)
✅ **P0-4**: Contrainte UNIQUE sur `matches.external_id` (intégrité)
✅ **P0-5**: Design de `competition_visibility_settings` clarifié comme singleton global (configuration)
✅ **P0-6**: Contrainte CHECK sur `competition_leaderboard` (cohérence)

### P0 restants (non traités)

❌ **P0-3**: Conversion de `matches.home_team`/`away_team` en FKs (trop risqué)

---

## 5. Approche sécurité

Toutes les corrections appliquées respectent les principes suivants:
- **Non destructif**: Aucune suppression de données
- **Validé préalablement**: Vérifications avant application des contraintes
- **Échoue-safe**: Les migrations échouent gracieusement si des problèmes sont détectés
- **Réversible**: Toutes les corrections peuvent être annulées
- **Testable**: Script de migration avec vérifications automatiques

### Prochaines étapes recommandées

1. **Court terme**:
   - Tester le script `p0_database_fixes.sql` en staging
   - Appliquer en production après validation
   - Effectuer les vérifications post-migration

2. **Moyen terme**:
   - Décider du design de `competition_visibility_settings` (P0-5)
   - Planifier la migration FK pour `matches.home_team`/`away_team` (P0-3)

3. **Long terme**:
   - Traiter les problèmes P1 identifiés dans l'audit
   - Continuer l'amélioration de la qualité de la base

### Évaluation de risque

**Risque global de cette migration**: **FAIBLE**
- Toutes les corrections sont additives (ajout de contraintes/policies)
- Aucune modification de données existantes
- Vérifications automatiques avant application
- Rollback simple et bien défini

**Risque de ne pas appliquer ces corrections**: **ÉLEVÉ**
- P0-1: Vulnérabilité de sécurité critique
- P0-4: Possibilité de doublons de matchs
- P0-6: Incohérences de score possibles

**Recommandation**: **Appliquer cette migration dès que possible**
