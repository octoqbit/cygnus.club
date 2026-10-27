import './home-background.css';
import { mountGradientBackground } from './lib/gradient-background.js';

const hero = document.querySelector('.home-page .hero-main');
if (hero) mountGradientBackground(hero);
