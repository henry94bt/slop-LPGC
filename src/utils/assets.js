/**
 * Resuelve rutas de `public/` para que funcionen tanto en la raíz de un
 * dominio como en una subruta de GitHub Pages (`/mi-repo/`).
 */
const base = import.meta.env.BASE_URL.endsWith( '/' )
	? import.meta.env.BASE_URL
	: `${import.meta.env.BASE_URL}/`;

export function assetUrl( path ) {

	return base + String( path ).replace( /^\/+/, '' );

}
