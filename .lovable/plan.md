

## Problèmes identifiés

### 1. RLS bloque l'insertion des participations (cause principale)
La politique INSERT sur `coaching_participations` est :
```sql
auth.uid() = user_id AND EXISTS(... is_club_member ...)
```
Le coach insère des participations **pour d'autres utilisateurs** (`user_id = athleteId`), donc `auth.uid() = user_id` est **toujours faux** pour le coach. Résultat : les participations ne sont jamais créées → l'athlète ne voit rien.

Les logs DB confirment : `"new row violates row-level security policy for table coaching_participations"`.

### 2. Pas de notification in-app pour l'athlète
Quand un coach envoie un plan, seule une push notification est envoyée. Il n'y a pas d'insertion dans la table `notifications` pour que l'athlète voie un badge/indicateur sur le bouton Coach dans l'app.

## Solution

### Fichier 1 : Migration SQL — Corriger la politique RLS

Remplacer la politique INSERT existante par une qui autorise :
- Un coach à insérer des participations pour les membres de son club
- Un membre à s'inscrire lui-même

```sql
DROP POLICY "Members can register for coaching sessions" ON coaching_participations;

CREATE POLICY "Coaches or self can insert participations"
ON coaching_participations FOR INSERT TO authenticated
WITH CHECK (
  -- Self-registration
  (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM coaching_sessions cs
    WHERE cs.id = coaching_session_id AND is_club_member(auth.uid(), cs.club_id)
  ))
  OR
  -- Coach inserting for athletes
  EXISTS (
    SELECT 1 FROM coaching_sessions cs
    WHERE cs.id = coaching_session_id AND is_club_coach(auth.uid(), cs.club_id)
  )
);
```

### Fichier 2 : `src/components/coaching/WeeklyPlanDialog.tsx` — Ajouter notification in-app

Après l'envoi des participations (ligne ~466), insérer une notification dans la table `notifications` pour chaque athlète concerné, avec `type: 'coaching_plan'`. Aussi envoyer la push notification existante.

```typescript
// After inserting participations, notify each athlete
for (const member of targetMembers) {
  await supabase.from("notifications").insert({
    user_id: member.user_id,
    type: "coaching_plan",
    title: "📋 Nouveau plan d'entraînement",
    message: `${coachName} vous a envoyé un plan pour la semaine du ${format(weekStart, "d MMM", { locale: fr })}`,
    data: { club_id: clubId, club_name: clubName, week_start: format(weekStart, "yyyy-MM-dd") },
  });
  sendPushNotification(member.user_id, "📋 Nouveau plan", `Plan semaine du ${format(weekStart, "d MMM", { locale: fr })}`, "coaching_plan");
}
```

Cela nécessite d'importer `useSendNotification` et de charger le `coachName` dans le dialog.

### Fichier 3 : `src/components/coaching/CreateCoachingSessionDialog.tsx` — Même fix notification in-app

Ajouter aussi une insertion `notifications` quand on envoie une séance individuelle (ligne ~183), pas seulement la push.

## Résumé des changements

| Fichier | Changement |
|---------|-----------|
| Migration SQL | Nouvelle politique RLS pour `coaching_participations` INSERT |
| `WeeklyPlanDialog.tsx` | Notification in-app + push pour chaque athlète |
| `CreateCoachingSessionDialog.tsx` | Notification in-app + push pour chaque athlète |

