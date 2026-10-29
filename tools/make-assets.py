"""
Genera las creatividades de las vallas a partir de los assets originales
de La Pepa Studio, HBTDATA y AbretuSobre.es.

Uso: python tools/make-assets.py
Salida: public/assets/{pepa_logo,hbtdata_logo,abretusobre_logo}.png
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path( __file__ ).resolve().parent.parent
SRC = ROOT / "Public assets"
OUT = ROOT / "public" / "assets"
OUT.mkdir( parents=True, exist_ok=True )

FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"
FONT_REG = "C:/Windows/Fonts/arial.ttf"
FONT_BLACK = "C:/Windows/Fonts/ariblk.ttf"


def font( path, size ):
    if Path( path ).exists():
        return ImageFont.truetype( path, size )
    return ImageFont.truetype( FONT_BOLD, size )


def tracked_text( draw, xy, text, fnt, fill, tracking=0 ):
    """Dibuja texto con tracking manual y devuelve el ancho total."""
    x, y = xy
    for ch in text:
        draw.text( ( x, y ), ch, font=fnt, fill=fill )
        x += draw.textlength( ch, font=fnt ) + tracking
    return x - xy[ 0 ]


def remove_white( image, threshold=238 ):
    image = image.convert( "RGBA" )
    pixels = image.load()
    w, h = image.size
    for y in range( h ):
        for x in range( w ):
            r, g, b, a = pixels[ x, y ]
            if r > threshold and g > threshold and b > threshold:
                pixels[ x, y ] = ( 255, 255, 255, 0 )
            elif r > 220 and g > 220 and b > 220:
                # suaviza el borde del trazo
                pixels[ x, y ] = ( r, g, b, int( a * 0.35 ) )
    return image


def vertical_gradient( size, top, bottom ):
    w, h = size
    grad = Image.new( "RGB", ( 1, h ) )
    px = grad.load()
    for y in range( h ):
        t = y / max( 1, h - 1 )
        px[ 0, y ] = tuple( int( top[ i ] + ( bottom[ i ] - top[ i ] ) * t ) for i in range( 3 ) )
    return grad.resize( size )


def make_pepa():
    W, H = 1280, 640
    bg = vertical_gradient( ( W, H ), ( 250, 190, 214 ), ( 242, 154, 190 ) )

    # patrón sutil de puntos
    pattern = Image.new( "RGBA", ( W, H ), ( 0, 0, 0, 0 ) )
    pd = ImageDraw.Draw( pattern )
    for y in range( 0, H, 26 ):
        for x in range( 0, W, 26 ):
            pd.ellipse( ( x, y, x + 3, y + 3 ), fill=( 255, 255, 255, 26 ) )
    bg = Image.alpha_composite( bg.convert( "RGBA" ), pattern )

    d = ImageDraw.Draw( bg )

    # halo crema
    halo = Image.new( "RGBA", ( W, H ), ( 0, 0, 0, 0 ) )
    hd = ImageDraw.Draw( halo )
    hd.ellipse( ( 34, 54, 630, 650 ), fill=( 255, 246, 240, 235 ) )
    bg = Image.alpha_composite( bg, halo )
    d = ImageDraw.Draw( bg )

    # mano (logo)
    hand = Image.open( SRC / "LaPepa" / "images.png" )
    hand = remove_white( hand )
    hand.thumbnail( ( 380, 380 ), Image.LANCZOS )
    bg.alpha_composite( hand, ( 120, 130 + ( 380 - hand.height ) // 2 ) )

    red = ( 226, 45, 37 )
    burgundy = ( 122, 25, 48 )

    f_logo = font( FONT_BLACK, 132 )
    d.text( ( 566, 116 ), "La Pepa", font=f_logo, fill=red )

    f_studio = font( FONT_BOLD, 72 )
    tracked_text( d, ( 574, 302 ), "STUDIO", f_studio, burgundy, 16 )

    d.rectangle( ( 574, 410, 1156, 416 ), fill=( 226, 45, 37, 255 ) )

    f_tag = font( FONT_BOLD, 34 )
    d.text( ( 574, 440 ), "DISEÑO Y CONTENIDO", font=f_tag, fill=burgundy )
    f_small = font( FONT_REG, 30 )
    d.text( ( 574, 488 ), "Hecho en Las Palmas de Gran Canaria", font=f_small, fill=( 92, 22, 42 ) )

    # sello
    badge = ( 574, 548, 900, 604 )
    d.rounded_rectangle( badge, radius=28, fill=( 122, 25, 48 ) )
    f_badge = font( FONT_BOLD, 24 )
    d.text( ( 600, 564 ), "la pepa  ·  studio", font=f_badge, fill=( 255, 240, 245 ) )

    bg.convert( "RGB" ).save( OUT / "pepa_logo.png", optimize=True )
    print( "pepa_logo.png", bg.size )


def make_hbtdata():
    W, H = 1280, 640
    navy = ( 14, 55, 70 )
    orange = ( 199, 122, 30 )
    cream = ( 246, 240, 230 )

    bg = vertical_gradient( ( W, H ), ( 250, 246, 238 ), ( 238, 230, 217 ) )
    d = ImageDraw.Draw( bg )

    # skyline de barras al pie, como en el banner original
    bars = [ ( 70, 520, 22 ), ( 104, 480, 20 ), ( 136, 545, 26 ), ( 174, 455, 20 ),
             ( 206, 500, 24 ), ( 242, 420, 20 ), ( 274, 470, 22 ), ( 308, 440, 24 ),
             ( 344, 510, 20 ), ( 376, 460, 22 ), ( 410, 490, 26 ), ( 448, 435, 20 ),
             ( 480, 500, 22 ), ( 516, 468, 24 ), ( 552, 520, 20 ), ( 590, 450, 22 ),
             ( 626, 492, 24 ), ( 664, 462, 20 ), ( 700, 520, 22 ), ( 738, 480, 24 ),
             ( 776, 505, 20 ), ( 812, 450, 22 ), ( 850, 490, 24 ), ( 888, 530, 20 ),
             ( 926, 470, 22 ), ( 964, 505, 24 ), ( 1002, 458, 20 ), ( 1040, 500, 22 ),
             ( 1078, 528, 24 ), ( 1116, 478, 20 ), ( 1154, 508, 22 ), ( 1192, 462, 24 ) ]
    for x, y, w in bars:
        d.rounded_rectangle( ( x, y, x + w, 640 ), radius=4, fill=( 227, 216, 197 ) )

    # franja superior
    d.rectangle( ( 0, 0, W, 14 ), fill=orange )

    # panel claro que integra el recorte original
    d.rounded_rectangle( ( 156, 64, 1124, 330 ), radius=18, fill=( 250, 247, 240 ) )

    # recorte del logotipo original (barras + wordmark), sin el chip de abretusobre
    banner = Image.open( SRC / "hbtdata" / "banner_linkedin_hbtdata_claro.png" ).convert( "RGBA" )
    logo = banner.crop( ( 372, 48, 1040, 232 ) )
    target_w = 940
    logo = logo.resize( ( target_w, int( logo.height * target_w / logo.width ) ), Image.LANCZOS )
    bg.paste( logo, ( ( W - logo.width ) // 2, 96 ), logo )

    f_tag = font( FONT_REG, 42 )
    tag = "Datos de Canarias, explicados con cosas de aquí"
    tw = d.textlength( tag, font=f_tag )
    d.text( ( ( W - tw ) / 2, 378 ), tag, font=f_tag, fill=navy )

    # subrayado + claim
    d.rectangle( ( ( W - 240 ) / 2, 452, ( W + 240 ) / 2, 458 ), fill=orange )
    f_claim = font( FONT_BOLD, 27 )
    claim = "PERIODISMO DE DATOS  ·  ISLAS CANARIAS"
    cw = d.textlength( claim, font=f_claim )
    d.text( ( ( W - cw ) / 2, 486 ), claim, font=f_claim, fill=( 14, 55, 70 ) )

    bg.convert( "RGB" ).save( OUT / "hbtdata_logo.png", optimize=True )
    print( "hbtdata_logo.png", bg.size )


def make_abretusobre():
    img = Image.open( SRC / "abretusobre.es" / "og-us-es.png" ).convert( "RGB" )
    # 1200x630 -> 1280x672 manteniendo composición
    img = img.resize( ( 1280, 672 ), Image.LANCZOS )
    img.save( OUT / "abretusobre_logo.png", optimize=True )
    print( "abretusobre_logo.png", img.size )


def make_favicon():
    hand = Image.open( SRC / "LaPepa" / "images.png" )
    hand = remove_white( hand )
    canvas = Image.new( "RGBA", hand.size, ( 246, 174, 206, 255 ) )
    canvas.alpha_composite( hand )
    canvas = canvas.resize( ( 64, 64 ), Image.LANCZOS )
    canvas.save( ROOT / "public" / "favicon.png", optimize=True )
    print( "favicon.png" )


if __name__ == "__main__":
    make_pepa()
    make_hbtdata()
    make_abretusobre()
    make_favicon()
