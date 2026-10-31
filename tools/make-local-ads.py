"""Creatividades canarias para paradas de guagua, fachadas y vallas locales."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "assets"
OUT.mkdir(parents=True, exist_ok=True)

BLACK = "C:/Windows/Fonts/ariblk.ttf"
BOLD = "C:/Windows/Fonts/arialbd.ttf"
REG = "C:/Windows/Fonts/arial.ttf"


def f(path, size):
    return ImageFont.truetype(path, size)


def canvas(w, h, color):
    im = Image.new("RGB", (w, h), color)
    return im, ImageDraw.Draw(im)


def text(d, xy, value, font, fill, anchor=None):
    d.text(xy, value, font=font, fill=fill, anchor=anchor)


def save(im, name):
    im.save(OUT / name, optimize=True)
    print(name, im.size)


def grain(im, amount=8):
    px = im.load()
    w, h = im.size
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b = px[x, y]
            n = ((x * 31 + y * 17) % amount) - amount // 2
            px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))
    return im


def gofio():
    im, d = canvas(1280, 640, (244, 231, 199))
    d.rectangle((0, 0, 1280, 84), fill=(70, 44, 28))
    text(d, (44, 26), "PRODUCTO DE CANARIAS", f(BOLD, 26), (244, 231, 199))
    d.ellipse((880, 130, 1220, 470), fill=(214, 170, 92))
    d.ellipse((930, 180, 1170, 420), fill=(236, 205, 145))
    d.arc((960, 205, 1140, 395), 200, 340, fill=(130, 85, 38), width=12)
    text(d, (60, 112), "GOFIO", f(BLACK, 132), (70, 44, 28))
    text(d, (66, 278), "EL PAJARITO", f(BOLD, 44), (184, 86, 42))
    text(d, (66, 350), "El desayuno de campeones", f(BOLD, 37), (70, 44, 28))
    text(d, (66, 415), "100% millo · tostado en casa", f(REG, 28), (105, 76, 49))
    d.rounded_rectangle((66, 486, 466, 556), 18, fill=(70, 44, 28))
    text(d, (96, 505), "GOFIO CANARIO", f(BOLD, 24), (244, 231, 199))
    save(grain(im), "anuncio_gofio.png")


def guagua():
    im, d = canvas(1280, 640, (15, 91, 138))
    for x in range(0, 1280, 80):
        d.line((x, 0, x + 300, 640), fill=(23, 110, 159), width=30)
    d.rounded_rectangle((60, 82, 1220, 570), 26, fill=(247, 241, 224))
    d.rectangle((60, 82, 1220, 142), fill=(236, 178, 54))
    text(d, (94, 94), "LÍNEA 91 · LAS CANTERAS", f(BOLD, 25), (15, 55, 78))
    text(d, (94, 168), "GUAGUA", f(BLACK, 104), (15, 91, 138))
    text(d, (100, 280), "91", f(BLACK, 180), (236, 178, 54))
    text(d, (365, 300), "Tú sí que llegas tarde", f(BOLD, 31), (15, 55, 78))
    text(d, (369, 350), "Pero la guagua también.", f(REG, 25), (70, 90, 100))
    d.rounded_rectangle((369, 410, 705, 462), 14, fill=(15, 91, 138))
    text(d, (394, 423), "GUAGUAS DE LAS PALMAS", f(BOLD, 19), (247, 241, 224))
    d.rectangle((880, 190, 1140, 450), fill=(236, 178, 54))
    d.rectangle((900, 220, 1120, 330), fill=(170, 214, 235))
    d.ellipse((915, 375, 985, 445), fill=(40, 40, 40))
    d.ellipse((1040, 375, 1110, 445), fill=(40, 40, 40))
    text(d, (1010, 330), "91", f(BLACK, 50), (15, 55, 78))
    save(grain(im), "anuncio_guagua.png")


def mojo():
    im, d = canvas(1280, 640, (34, 79, 45))
    d.ellipse((820, -80, 1400, 500), fill=(198, 45, 38))
    d.ellipse((900, 10, 1310, 420), fill=(222, 72, 48))
    text(d, (58, 80), "MOJO", f(BLACK, 140), (247, 233, 203))
    text(d, (62, 210), "PICÓN", f(BLACK, 118), (236, 178, 54))
    text(d, (66, 365), "LA ABUELA", f(BOLD, 46), (247, 233, 203))
    text(d, (66, 435), "Pica, pero no tanto.", f(BOLD, 36), (190, 214, 167))
    text(d, (66, 495), "Receta de toda la vida · Las Palmas", f(REG, 25), (190, 214, 167))
    save(grain(im), "anuncio_mojo.png")


def platano():
    im, d = canvas(1280, 640, (245, 211, 80))
    d.ellipse((760, 120, 1240, 600), fill=(91, 137, 55))
    d.arc((880, 120, 1160, 560), 30, 300, fill=(248, 236, 160), width=70)
    text(d, (56, 80), "PLÁTANO", f(BLACK, 124), (41, 84, 41))
    text(d, (60, 222), "DE CANARIAS", f(BOLD, 54), (41, 84, 41))
    text(d, (60, 325), "El de aquí.", f(BLACK, 88), (198, 72, 37))
    text(d, (64, 448), "Dulce, pequeñito y con acento.", f(REG, 30), (41, 84, 41))
    save(grain(im), "anuncio_platano.png")


def achicharre():
    im, d = canvas(1280, 640, (231, 79, 48))
    for i in range(8):
        d.ellipse((900 + i * 40, 80 + (i % 3) * 90, 960 + i * 40, 160 + (i % 3) * 90), fill=(247, 196, 64))
    text(d, (48, 70), "¡ACHICHARRE!", f(BLACK, 108), (255, 241, 210))
    text(d, (54, 212), "Si no pica,", f(BLACK, 82), (247, 196, 64))
    text(d, (54, 305), "no es canario.", f(BLACK, 82), (247, 196, 64))
    text(d, (58, 445), "Salsa pal cuerpo · desde 1987", f(BOLD, 31), (255, 241, 210))
    save(grain(im), "anuncio_achicharre.png")


def calima():
    im, d = canvas(1280, 640, (201, 141, 86))
    d.ellipse((850, 90, 1180, 420), fill=(245, 197, 118))
    for y in range(0, 640, 40):
        d.line((0, y, 1280, y), fill=(211, 156, 102), width=2)
    text(d, (54, 90), "CALIMA", f(BLACK, 140), (95, 57, 35))
    text(d, (58, 245), "0%", f(BLACK, 180), (245, 228, 192))
    text(d, (62, 445), "Hoy no, gracias.", f(BOLD, 46), (95, 57, 35))
    save(grain(im), "anuncio_calima.png")


def sobremesa():
    im, d = canvas(1280, 640, (246, 238, 218))
    d.rectangle((0, 500, 1280, 640), fill=(48, 92, 70))
    d.ellipse((890, 100, 1210, 420), outline=(48, 92, 70), width=18)
    d.line((1040, 150, 1040, 260), fill=(48, 92, 70), width=14)
    d.line((1040, 260, 1120, 300), fill=(48, 92, 70), width=14)
    text(d, (58, 80), "LA SOBREMESA", f(BLACK, 88), (48, 92, 70))
    text(d, (62, 200), "El deporte nacional canario.", f(BOLD, 44), (198, 72, 37))
    text(d, (62, 300), "Empieza a las 14:00.", f(REG, 36), (90, 80, 60))
    text(d, (62, 352), "Termina cuando quiere.", f(REG, 36), (90, 80, 60))
    text(d, (62, 535), "No se suspende por calima.", f(BOLD, 28), (246, 238, 218))
    save(grain(im), "anuncio_sobremesa.png")


def no_chiringuito():
    im, d = canvas(1280, 640, (240, 168, 194))
    d.rectangle((48, 48, 1232, 592), outline=(190, 42, 66), width=8)
    text(d, (640, 160), "AQUÍ NO HAY", f(BLACK, 100), (122, 25, 48), anchor="mm")
    text(d, (640, 285), "CHIRINGUITO", f(BLACK, 112), (190, 42, 66), anchor="mm")
    text(d, (640, 420), "Y se vive mejor.", f(BOLD, 48), (122, 25, 48), anchor="mm")
    text(d, (640, 500), "Las Canteras · Las Palmas", f(REG, 26), (122, 25, 48), anchor="mm")
    save(grain(im), "anuncio_chiringuito.png")


def mupi_hbtdata():
    im, d = canvas(800, 1200, (14, 55, 70))
    d.rectangle((0, 0, 800, 18), fill=(199, 122, 30))
    logo = Image.open(OUT / "hbtdata_logo.png").convert("RGB")
    logo.thumbnail((680, 340), Image.LANCZOS)
    im.paste(logo, ((800 - logo.width) // 2, 100))
    text(d, (400, 530), "DATOS DE CANARIAS,", f(BOLD, 40), (247, 240, 228), anchor="mm")
    text(d, (400, 585), "EXPLICADOS CON COSAS DE AQUÍ", f(BOLD, 26), (247, 240, 228), anchor="mm")
    d.rectangle((100, 650, 700, 656), fill=(199, 122, 30))
    text(d, (400, 740), "HBTDATA", f(BLACK, 64), (247, 240, 228), anchor="mm")
    text(d, (400, 825), "hbtdata.es", f(BOLD, 34), (236, 178, 54), anchor="mm")
    d.rounded_rectangle((100, 930, 700, 1080), 22, fill=(247, 240, 228))
    text(d, (400, 975), "ABRETUSOBRE.ES", f(BOLD, 28), (14, 55, 70), anchor="mm")
    text(d, (400, 1025), "¿Y tú qué cromo eres?", f(REG, 23), (70, 80, 80), anchor="mm")
    save(im, "mupi_hbtdata.png")


def mupi_abretu():
    im, d = canvas(800, 1200, (201, 180, 255))
    for y in range(0, 1200, 40):
        d.line((0, y, 800, y), fill=(214, 196, 255), width=2)
    for x in range(0, 800, 40):
        d.line((x, 0, x, 1200), fill=(214, 196, 255), width=2)
    d.rounded_rectangle((60, 110, 740, 690), 26, fill=(28, 26, 26))
    text(d, (400, 205), "ABRE TU", f(BLACK, 74), (247, 241, 228), anchor="mm")
    d.rounded_rectangle((150, 285, 650, 425), 30, fill=(240, 90, 48))
    text(d, (400, 355), "SOBRE", f(BLACK, 88), (247, 241, 228), anchor="mm")
    text(d, (400, 535), "No te dice por quién votar.", f(REG, 26), (247, 241, 228), anchor="mm")
    text(d, (400, 578), "Te dice qué cromo eres.", f(REG, 26), (247, 241, 228), anchor="mm")
    text(d, (400, 780), "ABRETUSOBRE.ES", f(BLACK, 56), (40, 36, 36), anchor="mm")
    text(d, (400, 845), "El test de cromos canario", f(BOLD, 26), (78, 60, 90), anchor="mm")
    d.rounded_rectangle((180, 940, 620, 1040), 20, fill=(40, 36, 36))
    text(d, (400, 990), "DESPEGA AQUÍ", f(BOLD, 26), (255, 241, 210), anchor="mm")
    save(im, "mupi_abretu.png")


def mupi_pepa():
    im, d = canvas(800, 1200, (245, 179, 208))
    d.ellipse((90, 110, 710, 730), fill=(255, 247, 240))
    hand = Image.open(OUT / "pepa_logo.png").convert("RGB")
    hand.thumbnail((520, 520), Image.LANCZOS)
    im.paste(hand, ((800 - hand.width) // 2, 160))
    text(d, (400, 800), "LA PEPA", f(BLACK, 80), (226, 45, 37), anchor="mm")
    text(d, (400, 890), "STUDIO", f(BOLD, 44), (122, 25, 48), anchor="mm")
    text(d, (400, 975), "Diseño y contenido", f(REG, 28), (122, 25, 48), anchor="mm")
    text(d, (400, 1030), "Las Palmas de Gran Canaria", f(REG, 23), (122, 25, 48), anchor="mm")
    save(im, "mupi_pepa.png")


if __name__ == "__main__":
    gofio()
    guagua()
    mojo()
    platano()
    achicharre()
    calima()
    sobremesa()
    no_chiringuito()
    mupi_hbtdata()
    mupi_abretu()
    mupi_pepa()
