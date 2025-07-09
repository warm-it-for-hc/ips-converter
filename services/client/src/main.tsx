import ReactDOM from 'react-dom/client';
import Home from './pages/Home';
import Upload from './pages/Upload';
import NotFound from './pages/NotFound';
import Result from './pages/Result';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

import { registerSW } from 'virtual:pwa-register';
registerSW();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/upload" element={<Upload />} />
      <Route path="/result" element={<Result />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);
