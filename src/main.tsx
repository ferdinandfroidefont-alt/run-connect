import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Force l'initialisation des plugins Capacitor pour AAB
import './lib/forceInitCapacitor'

createRoot(document.getElementById("root")!).render(<App />);
