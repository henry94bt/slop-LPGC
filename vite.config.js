import { defineConfig } from 'vite';

export default defineConfig( ( { command } ) => ( {
	// En producción usamos rutas relativas para que funcione igual en la raíz
	// de un dominio y en una subruta de GitHub Pages (/mi-repo/).
	base: command === 'build' ? './' : '/',
	server: {
		host: true,
		port: 5173,
		open: false
	},
	build: {
		target: 'es2022',
		assetsInlineLimit: 0
	}
} ) );
