

# Correction du Pipeline iOS — Transmission de l'UUID du profil

## Problème identifié

L'erreur `"App" requires a provisioning profile` indique que le profil n'est pas correctement configuré dans le projet Xcode. Le problème vient de la façon dont l'UUID du profil est transmis entre les étapes du workflow.

### Cause technique

Dans GitHub Actions, `${{ env.PROFILE_UUID }}` dans la section `env:` d'une étape **ne peut pas lire les variables définies par `echo >> $GITHUB_ENV`** dans une étape précédente. Ces variables sont disponibles en shell (`$PROFILE_UUID`) mais pas via la syntaxe `${{ env.XXX }}`.

## Solution

### Approche 1 : Accéder à la variable via le shell, pas via `${{ env }}`

Modifier l'étape "Configure App signing" pour utiliser la variable shell `$PROFILE_UUID` directement, sans passer par la section `env:` du step.

### Changements dans le fichier `.github/workflows/ios-appstore.yml`

```yaml
- name: 🔧 Configure App signing
  env:
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
    # PROFILE_UUID est déjà disponible via GITHUB_ENV, pas besoin de le redéclarer
  run: |
    cd ios/App
    
    echo "Using Profile UUID: $PROFILE_UUID"
    echo "Using Team ID: $APPLE_TEAM_ID"
    
    # Vérifier que PROFILE_UUID est défini
    if [ -z "$PROFILE_UUID" ]; then
      echo "❌ ERROR: PROFILE_UUID is empty!"
      exit 1
    fi
    
    ruby << RUBY_SCRIPT
    require 'xcodeproj'
    
    project_path = 'App.xcodeproj'
    project = Xcodeproj::Project.open(project_path)
    
    app_target = project.targets.find { |t| t.name == 'App' }
    
    # Lire depuis les variables d'environnement shell
    profile_uuid = ENV['PROFILE_UUID']
    team_id = ENV['APPLE_TEAM_ID']
    
    puts "Team ID: #{team_id}"
    puts "Profile UUID: #{profile_uuid}"
    
    if profile_uuid.nil? || profile_uuid.empty?
      puts "❌ ERROR: PROFILE_UUID is nil or empty in Ruby!"
      exit 1
    end
    
    if app_target
      app_target.build_configurations.each do |config|
        config.build_settings['CODE_SIGN_STYLE'] = 'Manual'
        config.build_settings['DEVELOPMENT_TEAM'] = team_id
        config.build_settings['CODE_SIGN_IDENTITY'] = 'Apple Distribution'
        config.build_settings['CODE_SIGN_IDENTITY[sdk=iphoneos*]'] = 'Apple Distribution'
        config.build_settings['PROVISIONING_PROFILE'] = profile_uuid
        config.build_settings['PROVISIONING_PROFILE_SPECIFIER'] = ''
      end
      
      project.save
      puts "✅ Signing configured for App target with UUID: #{profile_uuid}"
    else
      puts "❌ App target not found!"
      exit 1
    end
    RUBY_SCRIPT
    
    # Afficher le résultat pour debug
    echo "✅ Signing configuration complete"
```

### Changement clé

| Ligne | Avant | Après |
|-------|-------|-------|
| 104 | `PROFILE_UUID: ${{ env.PROFILE_UUID }}` | Supprimer cette ligne |
| 106-108 | Pas de vérification | Ajouter vérification que `$PROFILE_UUID` n'est pas vide |

## Détails techniques

1. **`echo "VAR=value" >> $GITHUB_ENV`** rend la variable disponible dans les étapes suivantes via `$VAR` dans le shell
2. **Mais `${{ env.VAR }}`** dans la section `env:` d'une étape ne peut pas lire ces variables — elle ne lit que les variables définies au niveau du workflow ou du job
3. **Solution** : Supprimer `PROFILE_UUID: ${{ env.PROFILE_UUID }}` de la section `env:` et utiliser directement `$PROFILE_UUID` dans le script shell

## Résultat attendu

- L'UUID du profil est correctement transmis au script Ruby
- Le profil est configuré dans le `project.pbxproj`
- Le build archive passe sans erreur de provisioning

