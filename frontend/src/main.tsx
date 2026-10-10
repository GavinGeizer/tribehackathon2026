import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './assets/css/index.css';
import { App } from './App';
import { Header } from './components/header';
import { LandingPage } from './pages/landing';

const root = document.getElementById('root');

createRoot(root!).render(
	<StrictMode>
		<Router>

			<Routes>
				<Route path='/' element={<><Header /><LandingPage /></>} />
				<Route path='/workspace' element={<App />} />
				<Route path='/dashboard' element={<App />} />
			</Routes>

		</Router>
	</StrictMode>,
);
