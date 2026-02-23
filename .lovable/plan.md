

# Mode Coach amélioré — Plan d'implémentation

## Analyse de l'existant

Le système actuel permet :
- Un coach crée une séance modèle (template) dans un club
- Les membres du club voient la séance et peuvent la programmer (lieu + date)
- Le coach voit le taux de complétion

## Ce qui manque (delta demandé)

1. **Envoi personnalisé par athlète** — Le coach sélectionne des athlètes individuellement et peut assigner une date différente à chacun
2. **Envoi via message privé** — Pas seulement via club, aussi en DM
3. **Personnalisation athlète** — L'athlète peut modifier date/heure/lieu/allures/notes mais PAS les blocs structurés
4. **Statuts enrichis** — Envoyée → Programmée → Effectuée → Non effectuée
5. **Notifications push** automatiques à l'envoi

---

## 1. Migration SQL

### Modifier `coaching_sessions`
- Ajouter `send_mode text DEFAULT 'club'` — valeurs : `'club'` ou `'individual'`
- Ajouter `target_athletes uuid[] DEFAULT '{}'` — liste des athlètes ciblés (pour envoi individuel)

### Modifier `coaching_participations`
- Ajouter `suggested_date timestamptz` — date suggérée par le coach pour cet athlète
- Ajouter `custom_pace text` — allure personnalisée par l'athlète
- Ajouter `custom_notes text` — notes personnelles de l'athlète
- Modifier `status` pour supporter : `'sent'`, `'scheduled'`, `'completed'`, `'missed'`

### Pas de nouvelle table — on enrichit l'existant.

---

## 2. Refonte `CreateCoachingSessionDialog`

Le dialog actuel crée une séance pour tout le club. Le transformer pour supporter :

**Étape 1 — Template** (inchangé) :
- Titre, description, notes du coach, type d'activité
- Mode simple/structuré avec `SessionBlockBuilder`

**Étape 2 — Destinataires** (nouveau) :
- Toggle : "Tout le club" / "Athlètes sélectionnés"
- Si sélection individuelle :
  - Liste des membres du club avec checkboxes
  - Pour chaque athlète sélectionné, option de définir une date suggérée (optionnel)
- Sélection du club source (réutilise `CoachAccessDialog`)

**Étape 3 — Envoi** :
- Résumé : template + destinataires + dates
- Bouton "Publier" → crée `coaching_sessions` + `coaching_participations` (status `'sent'`) pour chaque athlète ciblé
- Notification push à chaque athlète

---

## 3. Refonte `ScheduleCoachingDialog`

L'athlète peut maintenant personnaliser plus de choses :

- **Date/heure** — pré-rempli avec `suggested_date` du coach si définie
- **Lieu** — inchangé (nom + coordonnées)
- **Allure personnelle** — nouveau champ `custom_pace`
- **Notes personnelles** — nouveau champ `custom_notes`
- **Blocs structurés** — affichés en lecture seule (verrouillés)

Sauvegarde :
- Met à jour `coaching_participations` (scheduled_at, location, custom_pace, custom_notes)
- Crée la session sur la carte (`sessions` table)
- Status passe de `'sent'` à `'scheduled'`

---

## 4. Refonte `CoachingSessionDetail`

### Vue coach enrichie :
- Liste par athlète avec statuts visuels :
  - 📨 Envoyée (sent)
  - 📍 Programmée (scheduled) — avec date + lieu
  - ✅ Effectuée (completed)
  - ❌ Non effectuée (missed)
- Taux de complétion global (barre de progression)
- Feedback individuel par athlète (existant)
- Date suggérée affichée à côté de chaque athlète

### Vue athlète enrichie :
- Blocs structurés en lecture seule
- Si `suggested_date` : affichage "Le coach suggère : [date]"
- Bouton "Programmer ma séance" → ouvre `ScheduleCoachingDialog`
- Après complétion : affichage des notes perso + feedback coach

---

## 5. Envoi via message privé

Quand le coach envoie en mode `'individual'` :
- Pour chaque athlète, insérer un message dans la conversation DM existante (ou en créer une)
- Type de message : `'coaching_session'` (nouveau `message_type`)
- Le message contient un lien vers la séance coaching
- L'athlète voit une card spéciale dans le chat avec bouton "Programmer"

### Nouveau composant : `CoachingMessageCard`
- Affiché dans le chat quand `message_type === 'coaching_session'`
- Montre : titre, type d'activité, blocs en miniature, date suggérée
- Bouton "Programmer ma séance" → ouvre `ScheduleCoachingDialog`

---

## 6. Notifications push

Réutilise `useSendNotification` :
- **Envoi séance** → push à chaque athlète : "🎓 Nouvelle séance de [coach] : [titre]"
- **Athlète programme** → push au coach : "[athlète] a programmé sa séance [titre]"
- **Athlète valide** → push au coach : "[athlète] a terminé [titre]"
- **Feedback coach** → push à l'athlète : "Nouveau feedback de votre coach"

---

## Fichiers impactés

| Fichier | Modification |
|---|---|
| `supabase/migrations/` | Nouvelles colonnes sur `coaching_sessions` et `coaching_participations` |
| `src/integrations/supabase/types.ts` | Auto-régénéré |
| `src/components/coaching/CreateCoachingSessionDialog.tsx` | Ajout étape sélection athlètes + dates individuelles |
| `src/components/coaching/ScheduleCoachingDialog.tsx` | Ajout champs allure perso + notes + date suggérée pré-remplie |
| `src/components/coaching/CoachingSessionDetail.tsx` | Statuts enrichis (sent/scheduled/completed/missed) + date suggérée |
| `src/components/coaching/CoachingMessageCard.tsx` | **Nouveau** — card dans le chat pour séances coaching |
| `src/pages/Messages.tsx` | Rendu du `CoachingMessageCard` dans le chat |
| `src/components/coaching/CoachingTab.tsx` | Affichage du nombre d'athlètes ciblés |

---

## Ordre d'implémentation

1. Migration SQL (colonnes `coaching_sessions` + `coaching_participations`)
2. Refonte `CreateCoachingSessionDialog` (sélection athlètes + dates)
3. Refonte `ScheduleCoachingDialog` (allure perso + notes + date suggérée)
4. Refonte `CoachingSessionDetail` (statuts enrichis)
5. Nouveau `CoachingMessageCard` + intégration Messages
6. Notifications push

