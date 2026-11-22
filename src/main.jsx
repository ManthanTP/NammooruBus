import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/app/App'
import '@/i18n'
import '@/styles/index.css'

// Fontsource: Outfit (heading)
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/700.css'
import '@fontsource/outfit/800.css'

// Fontsource: Figtree (body)
import '@fontsource/figtree/400.css'
import '@fontsource/figtree/500.css'
import '@fontsource/figtree/600.css'

// Fontsource: Noto Sans Kannada
import '@fontsource/noto-sans-kannada/400.css'
import '@fontsource/noto-sans-kannada/600.css'

// Fontsource: DotGothic16 (LED badges)
import '@fontsource/dotgothic16/400.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
