/**
 * Doit rester le premier import de `main.tsx` : installe la capture console
 * avant le chargement du reste de l’arbre (App, pages…).
 */
import { installOnScreenLogCapture } from "@/lib/onScreenLogCapture";

installOnScreenLogCapture();
