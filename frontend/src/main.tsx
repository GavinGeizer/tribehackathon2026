import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './assets/css/index.css';
import { Footer } from './components/footer';
import { Header } from './components/header';
import { LandingPage } from './pages/landing';

const root = document.getElementById('root');

createRoot(root!).render(
	<StrictMode>
		<Router>
			<Header />

			<Routes>
				<Route path='/' element={<LandingPage />} />
			</Routes>

			<Footer />
		</Router>
	</StrictMode>,
);
