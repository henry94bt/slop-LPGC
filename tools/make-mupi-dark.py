from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "public" / "assets"
BLACK = "C:/Windows/Fonts/ariblk.ttf"
BOLD = "C:/Windows/Fonts/arialbd.ttf"
REG = "C:/Windows/Fonts/arial.ttf"


def f(path, size):
    return ImageFont.truetype(path, size)


def save(im, name):
    im.save(OUT / name, optimize=True)
    print(name)


# HBTDATA vertical oscuro
im = Image.new("RGB", (800, 1200), (12, 49, 61))
d = ImageDraw.Draw(im)
d.rectangle((0, 0, 800, 22), fill=(208, 126, 34))
d.rectangle((0, 1160, 800, 1200), fill=(208, 126, 34))
d.text((70, 120), "HBT", font=f(BLACK, 116), fill=(247, 241, 228))
d.text((360, 120), "DATA", font=f(BLACK, 116), fill=(236, 168, 65))
d.text((74, 260), "DATOS DE CANARIAS,", font=f(BOLD, 46), fill=(247, 241, 228))
d.text((74, 322), "EXPLICADOS CON COSAS DE AQUÍ", font=f(BOLD, 26), fill=(247, 241, 228))
d.rectangle((74, 410, 726, 416), fill=(208, 126, 34))
d.text((74, 470), "hbtdata.es", font=f(BOLD, 52), fill=(236, 168, 65))
d.text((74, 560), "Periodismo de datos", font=f(REG, 32), fill=(205, 219, 215))
d.text((74, 610), "desde Las Palmas", font=f(REG, 32), fill=(205, 219, 215))
d.rounded_rectangle((70, 760, 730, 930), 28, fill=(238, 228, 210))
d.text((92, 790), "ABRETUSOBRE.ES", font=f(BOLD, 36), fill=(12, 49, 61))
d.text((92, 850), "¿Y tú qué cromo eres?", font=f(REG, 28), fill=(70, 72, 68))
save(im, "mupi_hbtdata_dark.png")

# AbretuSobre vertical oscuro
im = Image.new("RGB", (800, 1200), (38, 27, 51))
d = ImageDraw.Draw(im)
d.rectangle((0, 0, 800, 1200), fill=(38, 27, 51))
d.rectangle((0, 0, 800, 18), fill=(231, 101, 58))
d.text((70, 120), "ABRE TU", font=f(BLACK, 92), fill=(247, 241, 228))
d.rounded_rectangle((70, 250, 730, 400), 30, fill=(231, 101, 58))
d.text((108, 280), "SOBRE", font=f(BLACK, 98), fill=(247, 241, 228))
d.text((74, 470), "No te dice por quién votar.", font=f(REG, 30), fill=(225, 214, 238))
d.text((74, 520), "Te dice qué cromo eres.", font=f(REG, 30), fill=(225, 214, 238))
d.rectangle((74, 610, 726, 616), fill=(231, 101, 58))
d.text((74, 680), "abretusobre.es", font=f(BLACK, 58), fill=(247, 241, 228))
d.text((74, 780), "El test de cromos canario", font=f(BOLD, 30), fill=(203, 180, 232))
d.text((74, 870), "HBTDATA", font=f(BLACK, 44), fill=(236, 168, 65))
d.text((74, 930), "Datos de Canarias", font=f(REG, 26), fill=(203, 180, 232))
d.text((74, 1080), "Las Palmas · Islas Canarias", font=f(REG, 24), fill=(203, 180, 232))
save(im, "mupi_abretu_dark.png")
