from __future__ import annotations

from pathlib import Path
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "MediaHub_Platform_Formats_and_Lengths_Roadmap_RU.pdf"
SCREENSHOT = Path(
    "/Users/konstantin/.codex/visualizations/2026/07/29/"
    "019fac1d-ab43-7252-8044-3bd77adb2d16/"
    "mediahub-platform-roadmap-2026-07-31/01-current-platform-selector.jpg"
)

FONT_DIR = Path("/System/Library/Fonts/Supplemental")
pdfmetrics.registerFont(TTFont("ArialRU", str(FONT_DIR / "Arial.ttf")))
pdfmetrics.registerFont(TTFont("ArialRUBold", str(FONT_DIR / "Arial Bold.ttf")))

PAGE_W, PAGE_H = A4
BLUE = colors.HexColor("#1F4B7A")
TEAL = colors.HexColor("#1E7D78")
LIGHT_BLUE = colors.HexColor("#EAF2F8")
LIGHT_TEAL = colors.HexColor("#E9F5F3")
INK = colors.HexColor("#17202A")
MUTED = colors.HexColor("#5D6D7E")
LINE = colors.HexColor("#D5DEE6")
BG = colors.HexColor("#F7F9FB")


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        "TitleRU",
        fontName="ArialRUBold",
        fontSize=25,
        leading=30,
        textColor=BLUE,
        spaceAfter=14,
    )
)
styles.add(
    ParagraphStyle(
        "SubtitleRU",
        fontName="ArialRU",
        fontSize=11,
        leading=16,
        textColor=MUTED,
        spaceAfter=14,
    )
)
styles.add(
    ParagraphStyle(
        "H1RU",
        fontName="ArialRUBold",
        fontSize=17,
        leading=21,
        textColor=BLUE,
        spaceBefore=10,
        spaceAfter=8,
        keepWithNext=True,
    )
)
styles.add(
    ParagraphStyle(
        "H2RU",
        fontName="ArialRUBold",
        fontSize=13,
        leading=17,
        textColor=TEAL,
        spaceBefore=8,
        spaceAfter=5,
        keepWithNext=True,
    )
)
styles.add(
    ParagraphStyle(
        "BodyRU",
        fontName="ArialRU",
        fontSize=9.5,
        leading=14,
        textColor=INK,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        "SmallRU",
        fontName="ArialRU",
        fontSize=7.8,
        leading=10.5,
        textColor=MUTED,
    )
)
styles.add(
    ParagraphStyle(
        "TableHeaderRU",
        fontName="ArialRUBold",
        fontSize=7.8,
        leading=10.5,
        textColor=colors.white,
    )
)
styles.add(
    ParagraphStyle(
        "CalloutRU",
        fontName="ArialRUBold",
        fontSize=11,
        leading=16,
        textColor=BLUE,
        leftIndent=8,
        rightIndent=8,
        spaceBefore=6,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        "CoverMetaRU",
        fontName="ArialRU",
        fontSize=9,
        leading=13,
        textColor=MUTED,
    )
)


def page_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 14 * mm, PAGE_W - 18 * mm, 14 * mm)
    canvas.setFont("ArialRU", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 9 * mm, "Temichev Media Hub - продуктовый аудит и дорожная карта")
    canvas.drawRightString(PAGE_W - 18 * mm, 9 * mm, f"{doc.page}")
    canvas.restoreState()


def p(text, style="BodyRU"):
    safe = (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
    safe = re.sub(r"`([^`]+)`", r"<font name='ArialRUBold'>\1</font>", safe)
    return Paragraph(safe, styles[style])


def bullet(items):
    return ListFlowable(
        [ListItem(p(item), leftIndent=10) for item in items],
        bulletType="bullet",
        bulletFontName="ArialRU",
        bulletFontSize=7,
        leftIndent=18,
        bulletColor=TEAL,
        spaceAfter=7,
    )


def numbered(items):
    return ListFlowable(
        [ListItem(p(item), leftIndent=10) for item in items],
        bulletType="1",
        start="1",
        leftIndent=22,
        bulletFontName="ArialRUBold",
        bulletColor=BLUE,
        spaceAfter=7,
    )


def callout(text, color=LIGHT_BLUE):
    table = Table([[p(text, "CalloutRU")]], colWidths=[PAGE_W - 42 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), color),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    table.spaceAfter = 8
    return table


def platform_table():
    data = [
        [p("Площадка", "TableHeaderRU"), p("Формат MVP", "TableHeaderRU"), p("Техническая рамка", "TableHeaderRU")],
        [p("Telegram"), p("Текст + медиа; Rich Message основной"), p("32 768 знаков; до 50 медиа")],
        [p("MAX"), p("Текст + изображения/видео"), p("4 000 знаков; до 12 вложений в комбинации")],
        [p("VK"), p("Запись сообщества; ручной пакет"), p("Проверить live-spike до автоконнектора")],
        [p("Instagram"), p("Один визуал / карусель / Reel"), p("Подпись 2 200; карусель 2-10")],
    ]
    table = Table(data, colWidths=[30 * mm, 70 * mm, 68 * mm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BLUE),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


story = []
story.append(Spacer(1, 15 * mm))
story.append(p("MEDIA HUB", "CoverMetaRU"))
story.append(p("Правила площадок, длина постов и медиаформаты", "TitleRU"))
story.append(p("Продуктовый аудит текущего PWA и единая дорожная карта для Codex", "SubtitleRU"))
story.append(Spacer(1, 4 * mm))
story.append(callout("Рекомендуемая модель: одна диктовка -> выбранные площадки -> независимые готовые версии. Telegram, MAX и VK - одна текстовая семья. Instagram - отдельные форматы внутри одной площадки.", LIGHT_TEAL))
story.append(Spacer(1, 8 * mm))
if SCREENSHOT.exists():
    img = Image(str(SCREENSHOT))
    img.drawWidth = 171 * mm
    img.drawHeight = img.imageHeight * img.drawWidth / img.imageWidth
    story.append(img)
    story.append(Spacer(1, 3 * mm))
    story.append(p("Текущий production-композер: правильный единый экран и диктовка, но пока без настройки длины текущего поста и без выбора формата Instagram.", "SmallRU"))
story.append(Spacer(1, 8 * mm))
story.append(p("31 июля 2026 • без Figma • без изменений production", "CoverMetaRU"))

story.append(PageBreak())
story.append(p("1. Краткий вывод аудита", "H1RU"))
story.append(p("Текущее приложение уже движется в правильную сторону: проект обязателен, рубрика необязательна, диктовка является главным входом, а площадки выбираются на одном экране. Проблема не в необходимости нового редактора, а в недостающем слое понятных правил между исходным текстом и кнопкой сборки."))
story.append(callout("Не добавлять новые экраны. Доработать существующий композер четырьмя блоками: площадки, длина, медиа, сборка."))
story.append(p("Что оставить", "H2RU"))
story.append(bullet([
    "Один источник из диктовки или текста и одна кнопка «Собрать версии».",
    "Независимые результаты по площадкам; частичная ошибка не отменяет готовые версии.",
    "Рубрика как необязательный слой правил и 3-5 одобренных примеров.",
    "Проверка человеком перед экспортом и публикацией.",
    "Технические детали под «Расширенным режимом».",
]))
story.append(p("Что добавить", "H2RU"))
story.append(numbered([
    "Кнопку «Длина этого поста» с режимом Авто, профилями и точным диапазоном.",
    "Цели длины отдельно по площадкам на уровне проекта и рубрики.",
    "Формат Instagram: один визуал, карусель или Reel.",
    "Понятное название VK: «Запись сообщества» и ручной пакет текста с вложениями.",
    "Preflight на каждой вкладке: длина, медиа, формат, готовность коннектора.",
]))
story.append(Spacer(1, 3 * mm))
story.append(platform_table())

story.append(PageBreak())
story.append(p("2. Модель длины без лишней сложности", "H1RU"))
story.append(p("В продукте должны существовать три разные сущности. Смешивать их в одном поле нельзя: иначе пользователь либо видит технические цифры, либо случайно ломает правила рубрики."))
story.append(p("Технический предел", "H2RU"))
story.append(p("Приходит только из capability коннектора. Пользователь видит его как справку, но не может увеличить. При превышении система пересобирает вариант, а не обрезает текст."))
story.append(p("Цель проекта или рубрики", "H2RU"))
story.append(p("Это желаемая длина по площадке. Для проекта без рубрик действует цель проекта. Рубрика переопределяет её только там, где явно задано своё значение."))
story.append(p("Настройка текущего поста", "H2RU"))
story.append(p("Кнопка открывает небольшой bottom sheet: Авто по правилам / Короткий / Обычный / Подробный / Точно от-до. Это значение живёт только в snapshot текущей сборки и не меняет сохранённые правила."))
story.append(callout("Приоритет: текущий пост > рубрика для площадки > проект для площадки > безопасный системный профиль. Hard limit применяется отдельно и всегда побеждает."))
story.append(p("Для Telegram, MAX и VK можно включить «Одинаковая цель», но после копирования система всё равно хранит три независимых значения и три результата. Это позволяет MAX автоматически сжаться до 4000, не меняя Telegram и VK."))
story.append(p("Рекомендация по интерфейсу", "H2RU"))
story.append(bullet([
    "По умолчанию ничего не спрашивать: стоит режим «Авто по правилам».",
    "Точные цифры показывать только после нажатия «Длина».",
    "Рядом с каждой готовой версией показывать факт и цель, например «2412 / цель 2300-2500».",
    "Добавить быстрые действия «Короче» и «Подробнее» вместо повторного ввода чисел.",
]))

story.append(PageBreak())
story.append(p("3. Площадки и медиа", "H1RU"))
story.append(p("Telegram", "H2RU"))
story.append(p("Основной режим проекта - Rich Message: 32 768 UTF-8 символов и до 50 медиа. Резервный sendMediaGroup поддерживает 2-10 медиа плюс отдельное сообщение с текстом. Резервный режим должен быть виден до подтверждения. Редакционная длина остаётся намного ниже технического максимума."))
story.append(p("MAX", "H2RU"))
story.append(p("Официальный POST /messages принимает до 4000 символов. Фото и видео можно сочетать, всего до 12 вложений в комбинации; кнопка также является вложением. Это обновляет прежнее внутреннее допущение «число неизвестно», поэтому до кода надо синхронно поправить EN/RU-спецификации и capability."))
story.append(p("VK", "H2RU"))
story.append(p("Для владельца сообщества «пост» и «запись на стене» - один результат: запись сообщества. В MVP нужен текст, фото/видео/ссылка и ручной экспорт. Автопубликацию вынести в отдельный этап с серверным коннектором и live-проверкой актуальных лимитов официальной VK API. Непроверенный числовой предел не хардкодить."))
story.append(p("Instagram", "H2RU"))
story.append(p("Карусель - одна публикация, а не серия постов. В ней 2-10 фото/видео, один порядок, один первый кадр-обложка и одна подпись на всю карусель. Один визуал и Reel требуют по одному подходящему файлу. Подпись в текущей спецификации проекта ограничена 2200 символами и всегда создаётся как отдельная адаптация."))
story.append(numbered([
    "Один визуал: подпись + 1 фото или 1 видео.",
    "Карусель: подпись + план карточек + 2-10 упорядоченных фото/видео.",
    "Reel: подпись + хук + краткий сценарий + подсказка обложки + 1 видео.",
]))
story.append(callout("Reels не нужно возвращать отдельной пятой площадкой. Это формат внутри Instagram. Если пользователь хочет и карусель, и Reel, это две отдельные публикации на одной площадке.", LIGHT_TEAL))
story.append(p("На первом этапе приложение не рисует карточки и не монтирует видео. Оно готовит текст, план, порядок медиа и предупреждения. Автопубликация в Instagram доступна только при профессиональном аккаунте и готовых разрешениях Meta; иначе остаётся ручной пакет."))

story.append(PageBreak())
story.append(p("4. Единое задание для Codex", "H1RU"))
story.append(callout("Цель: пользователь одной диктовкой создаёт независимые версии для Telegram, MAX, VK и выбранного формата Instagram, может задать длину по рубрике или только текущему посту и получает понятные подсказки до сборки."))
story.append(p("Обязательные ограничения", "H2RU"))
story.append(bullet([
    "Реализовывать по одному вертикальному этапу; перед каждым обновить execution plan, миграции, тесты, риски и откат.",
    "Английская спецификация нормативна, русская обновляется синхронно.",
    "Не хардкодить «Что поесть? Армавир», рубрики, примеры и пределы.",
    "Не добавлять новые верхнеуровневые экраны.",
    "Не включать автопубликацию, не менять production и секреты.",
]))
story.append(p("12B.1 - цели длины", "H2RU"))
story.append(bullet([
    "Версионируемые цели по площадке на уровне проекта и рубрики.",
    "Переопределение текущего поста и режим «Одинаковая цель для Telegram, MAX и VK».",
    "Наследование правил отдельно от connector hard limit.",
    "Bottom sheet «Длина этого поста» и фактический счётчик на результате.",
]))
story.append(p("12B.2 - Instagram", "H2RU"))
story.append(bullet([
    "Формат image / carousel / reel в запросе генерации.",
    "Проверка количества и типа медиа до сборки.",
    "Подпись; план карточек для карусели; сценарный план и обложка для Reel.",
    "Ручной режим, пока readiness Meta не подтверждён.",
]))
story.append(p("12B.3 - VK", "H2RU"))
story.append(bullet([
    "Пользовательское название «Запись сообщества».",
    "Текст + список вложений для ручного экспорта.",
    "Отдельный официальный API-spike перед автоконнектором.",
]))
story.append(p("12B.4 - preflight", "H2RU"))
story.append(bullet([
    "Длина, медиа, формат и готовность аккаунта/коннектора на вкладке результата.",
    "Доступные ошибки: текст, фокус, aria-описания; не только цвет.",
    "Готовые версии сохраняются при ошибке другой площадки.",
]))

story.append(PageBreak())
story.append(p("5. Критерии приёмки", "H1RU"))
story.append(numbered([
    "Без рубрики можно продиктовать материал и оставить Авто либо задать длину текущего поста.",
    "С рубрикой автоматически применяются её цели по выбранным площадкам.",
    "Настройка текущего поста не меняет проект и рубрику.",
    "Одна команда запускает независимую генерацию всех выбранных площадок.",
    "Telegram, MAX и VK могут иметь одинаковую цель, но остаются отдельными версиями.",
    "MAX не превышает 4000 символов; превышение ведёт к пересборке, не обрезанию.",
    "Instagram требует формат; один визуал/Reel требуют 1 файл, карусель - 2-10.",
    "Карусель представлена одной публикацией с общей подписью и порядком карточек.",
    "Instagram-подпись не превышает 2200 и не является копией, обрезанной по символам.",
    "VK отображается как «Запись сообщества» и получает ручной пакет текста и вложений.",
    "Ошибка одной площадки не отменяет остальные результаты.",
    "Любой экспорт/публикация требует подтверждения человека.",
    "Есть unit, integration и e2e-тесты наследования, overrides, hard limits, медиа и частичных ошибок.",
    "Все тексты интерфейса на русском; управление работает с клавиатуры и скринридером.",
]))
story.append(p("Данные и контракты", "H2RU"))
story.append(p("Минимально различать platform_target_min_chars, platform_target_max_chars, connector-owned platform_hard_max_chars, post override в snapshot сборки, instagram_format, порядок медиа, обложку и источник применённого правила. Изменения API сопровождаются Alembic, OpenAPI и регенерацией типизированного клиента."))
story.append(p("Не включать в ближайший MVP", "H2RU"))
story.append(bullet([
    "Создание полноценного социального коннектора только настройками UI.",
    "Автоматическое рисование карточек и монтаж Reels.",
    "Автопубликацию в личный Instagram.",
    "Универсальную идеальную длину для всех проектов.",
    "Новый сложный админ-раздел площадок.",
]))

story.append(PageBreak())
story.append(p("6. Приоритет запуска и источники", "H1RU"))
story.append(p("Для первого запуска достаточно довести Telegram, MAX и VK до простой настройки длины и независимых текстовых версий, а Instagram - до ручного пакета трёх форматов. Автопубликацию подключать только после подтверждения, что люди регулярно доходят от диктовки до утверждённого результата."))
story.append(p("Метрики продукта", "H2RU"))
story.append(bullet([
    "доля пользователей от начала диктовки до первой готовой версии;",
    "медианное время до готового поста;",
    "доля версий без полной ручной переписки;",
    "число пересборок по длине;",
    "доля частичных ошибок по площадкам;",
    "повторная диктовка в течение недели.",
]))
story.append(p("Официальные источники на дату аудита", "H2RU"))
sources = [
    "Telegram Bot API - https://core.telegram.org/bots/api",
    "MAX POST /messages - https://dev.max.ru/docs-api/methods/POST/messages",
    "MAX media - https://dev.max.ru/docs-api",
    "Instagram carousel help - https://www.facebook.com/help/instagram/269314186824048",
    "Meta Instagram API, Reels - https://www.postman.com/meta/instagram/folder/y6xustx/reels-publishing",
    "VK official Java SDK, wall.post example - https://github.com/VKCOM/vk-java-sdk",
]
story.append(bullet(sources))
story.append(p("Опора в проекте", "H2RU"))
story.append(bullet([
    "docs/en/MASTER_SPEC.md, разделы 2.5 и 10.2-10.4;",
    "apps/web/src/components/phase12/simple-voice-composer.tsx;",
    "services/api/app/modules/publications/connectors.py.",
]))
story.append(callout("Следующий шаг после согласования: начинать только с 12B.1. Остальные этапы остаются в дорожной карте и не реализуются одновременно."))

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(
    str(OUTPUT),
    pagesize=A4,
    rightMargin=18 * mm,
    leftMargin=18 * mm,
    topMargin=17 * mm,
    bottomMargin=18 * mm,
    title="Media Hub - правила площадок, длина и медиаформаты",
    author="OpenAI Codex",
)
doc.build(story, onFirstPage=page_footer, onLaterPages=page_footer)
print(OUTPUT)
