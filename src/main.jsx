import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './themes/uiThemes.css'
import 'maplibre-gl/dist/maplibre-gl.css'
import { loadUiTheme } from './utils/uiThemeStorage.js'

document.documentElement.dataset.uiTheme = loadUiTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
