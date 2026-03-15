import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './global.css'

// Inject mock API when running outside Electron (browser preview / dev)
if (!window.api) {
  import('./lib/mockApi').then(({ mockApi }) => {
    ;(window as any).api = mockApi
    renderApp()
  })
} else {
  renderApp()
}

function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>
  )
}
