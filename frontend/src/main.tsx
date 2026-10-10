import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './assets/css/index.css';
import { LandingPage } from './pages/landing';

const root = document.getElementById('root');

createRoot(root!).render(
	<StrictMode>
		<LandingPage />
	</StrictMode>,
);
