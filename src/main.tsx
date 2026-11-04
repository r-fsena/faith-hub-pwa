import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
const App=React.lazy(()=>import('./App.tsx'))
import {installPreviewTransport} from './experience/previewTransport'
const isPreview=window.location.pathname.replace(/\/+$/,'')==='/__pwa-preview';
if(isPreview)installPreviewTransport();
const PwaPreview=React.lazy(()=>import('./experience/PwaPreview'));
import React from 'react'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPreview?<React.Suspense fallback={<div>Preparando prévia…</div>}><PwaPreview/></React.Suspense>:<React.Suspense fallback={<div>Carregando aplicativo…</div>}><App/></React.Suspense>}
  </StrictMode>,
)
