

# P1 : Relance push des retardataires + Feedback en lot

## 1. Bouton "Relancer" dans WeeklyTrackingView

### Probleme
Le coach voit les athletes en retard (dots orange) mais ne peut rien faire depuis cette vue. Il doit aller dans chaque seance individuellement.

### Solution
Ajouter un bouton "Relancer" (icone Bell) sur chaque ligne athlete qui a des seances non completees (status `sent` ou `scheduled`). Au clic, envoie une notification push avec le titre de la seance manquee.

**Fichier : `src/components/coaching/WeeklyTrackingView.tsx`**

- Importer `useSendNotification` et `Bell` de lucide
- Pour chaque athlete, calculer `lateSessionTitles` (seances dont le `scheduled_at` est passe et status != `completed`)
- Afficher un bouton Bell a cote du pourcentage si `lateSessionTitles.length > 0`
- Au clic : `sendPushNotification(athlete.userId, "📋 Rappel coaching", "N'oublie pas : {titres}", "coaching_reminder")`
- Ajouter un state `sendingReminder` pour feedback visuel (loading spinner pendant l'envoi)
- Toast de confirmation apres envoi

### Donnees necessaires
L'info est deja disponible dans `athlete.days` : on filtre les jours passes ou le status n'est pas `completed`. Il faut stocker `coaching_session_id` dans les `days` pour enrichir la notification (deja dans `sessionMap`).

Modification mineure : ajouter `sessionId` dans le type `days` pour pouvoir referencer la seance.

---

## 2. Feedback en lot dans CoachingSessionDetail

### Probleme
Le coach doit ecrire un feedback individuel pour chaque athlete (20 athletes = 20 champs textarea). Pas de message commun.

### Solution
Ajouter une section "Feedback global" au-dessus de la liste des participants, visible uniquement par le coach. Un seul textarea + bouton "Envoyer a tous". Le feedback est enregistre sur toutes les participations qui n'ont pas encore de feedback, et une notification push est envoyee a chaque athlete.

**Fichier : `src/components/coaching/CoachingSessionDetail.tsx`**

- Ajouter un state `batchFeedback: string` et `sendingBatch: boolean`
- Ajouter une section UI entre le taux de completion et la liste des participants :
  - Textarea "Feedback pour tous les athletes..."
  - Bouton "Envoyer a X athletes" (X = nombre sans feedback)
- Fonction `handleBatchFeedback()` :
  - Filtre les participations sans feedback existant
  - Pour chaque : `supabase.from("coaching_participations").update({ feedback }).eq("id", p.id)`
  - Pour chaque : `sendPushNotification(p.user_id, "Feedback de votre coach", session.title, "coaching_feedback")`
  - Toast "Feedback envoye a X athletes"
  - Refresh via `loadParticipations()`

### Le coach garde la possibilite de feedback individuel
Le feedback individuel reste en dessous de chaque participant. Le feedback en lot remplit le champ `feedback` uniquement pour ceux qui n'en ont pas encore.

---

## Fichiers impactes

| Fichier | Type | Changement |
|---|---|---|
| `src/components/coaching/WeeklyTrackingView.tsx` | Modifier | Bouton relance + envoi push |
| `src/components/coaching/CoachingSessionDetail.tsx` | Modifier | Section feedback en lot |

## Aucune migration SQL

Toutes les colonnes necessaires existent deja (`feedback` dans `coaching_participations`, push via edge function).

## Details techniques

**Relance push — logique de filtrage :**
```typescript
const lateSessionTitles = Object.entries(athlete.days)
  .filter(([dayKey, d]) => {
    const sessionDate = new Date(dayKey);
    return sessionDate < new Date() && d.status !== "completed";
  })
  .map(([, d]) => d.sessionTitle);
```

**Feedback en lot — update batch :**
```typescript
const withoutFeedback = participations.filter(p => !p.feedback);
await Promise.all(withoutFeedback.map(p =>
  supabase.from("coaching_participations")
    .update({ feedback: batchFeedback.trim() })
    .eq("id", p.id)
));
```

