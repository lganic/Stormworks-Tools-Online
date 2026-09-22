from PIL import Image
from enum import Enum
import shutil
import json
import os

FLAG_PATH = 'flag_output'

class Flag(Enum):
    NATION = 1
    PRIDE = 2
    COLOR = 3
    COMMUNITY = 4
    SHIPPING = 5
    NONE = 6


FLAGS = [
    (Flag.NATION, "UK"),
    (Flag.NATION, "Scotland"),
    (Flag.NATION, "USA"),
    (Flag.NATION, "Russia"),
    (Flag.NATION, "Australia"),
    (Flag.NATION, "Norway"),
    (Flag.NATION, "Poland"),
    (Flag.NATION, "France"),
    (Flag.COLOR, "White"),
    (Flag.COLOR, "Gray"),
    (Flag.COMMUNITY, "Stormworks"), 
    (Flag.COMMUNITY, "Geometa"),
    (Flag.COMMUNITY, "Carrier Command 2"),
    (Flag.COMMUNITY, "GQ Games"),
    (Flag.COMMUNITY, "Frantic"),
    (Flag.COMMUNITY, "CG Games"),
    (Flag.NATION, "Germany"),
    (Flag.NATION, "Hungary"),
    (Flag.NATION, "Canada"),
    (Flag.NATION, "Japan"),
    (Flag.NATION, "Ukraine"),
    (Flag.NATION, "Sweden"),
    (Flag.NATION, "Dutch"),
    (Flag.NATION, "Mexico"),
    (Flag.COMMUNITY, "Lynx Highland"),
    (Flag.COMMUNITY, "ND Gaming"),
    (Flag.COMMUNITY, "Raptor"),
    (Flag.COMMUNITY, "Camodo Gaming"),
    (Flag.COMMUNITY, "Rubber Duck"),
    (Flag.COMMUNITY, "454SS"),
    (Flag.COMMUNITY, "Neotastic"),
    (Flag.COMMUNITY, "ProfNCognito"),
    (Flag.NATION, "Italy"),
    (Flag.NATION, "Argentina"),
    (Flag.NATION, "Spain"),
    (Flag.NATION, "Luxembourg"),
    (Flag.NATION, "Austria"),
    (Flag.NATION, "Denmark"),
    (Flag.NATION, "AzerBaijan"),
    (Flag.NATION, "Belarus"),
    (Flag.COMMUNITY, "Beautiful OB"),
    (Flag.COMMUNITY, "Captain Cockerels"),
    (Flag.COMMUNITY, "Basil"),
    (Flag.COMMUNITY, "Boat"),
    (Flag.COMMUNITY, "Plane"),
    (Flag.COMMUNITY, "Skill Issue"),
    (Flag.COMMUNITY, "Pipe"),
    (Flag.COMMUNITY, "Jolly Roger"),
    (Flag.NATION, "Belgium"),
    (Flag.NATION, "Bosnia and Herzegovina"),
    (Flag.NATION, "Brazil"),
    (Flag.NATION, "Bulgaria"),
    (Flag.NATION, "China"),
    (Flag.NATION, "Columbia"),
    (Flag.NATION, "Czech Republic"),
    (Flag.NATION, "Europe"),
    (Flag.SHIPPING, "UNO"),
    (Flag.SHIPPING, "MCRO"),
    (Flag.SHIPPING, "LOCKI"),
    (Flag.SHIPPING, "HOPE"),
    (Flag.SHIPPING, "BANDAO"),
    (Flag.SHIPPING, "NEVERGREEN"),
    (Flag.SHIPPING, "CLAM OIL"),
    (Flag.SHIPPING, "SPAM"),
    (Flag.NATION, "Finland"),
    (Flag.NATION, "Greece"),
    (Flag.NATION, "India"),
    (Flag.NATION, "Monaco"),
    (Flag.NATION, "Iran"),
    (Flag.NATION, "Ireland"),
    (Flag.NATION, "Israel"),
    (Flag.NATION, "Malaysia"),
    (Flag.SHIPPING, "OOPS"),
    (Flag.SHIPPING, "ACRES"),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NATION, "Portugal"),
    (Flag.NATION, "Romania"),
    (Flag.NATION, "Saudi Arabia"),
    (Flag.NATION, "Singapore"),
    (Flag.NATION, "South Africa"),
    (Flag.NATION, "South Korea"),
    (Flag.NATION, "Switzerland"),
    (Flag.NATION, "Thailand"),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NATION, "Turkey"),
    (Flag.NATION, "Venezuela"),
    (Flag.NATION, "Afghanistan"),
    (Flag.NATION, "Albania"),
    (Flag.NATION, "Algeria"),
    (Flag.NATION, "Antarctica"),
    (Flag.NATION, "Bangladesh"),
    (Flag.NATION, "Greenland"),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NATION, "Jamaica"),
    (Flag.NATION, "Kenya"),
    (Flag.NATION, "Lithuania"),
    (Flag.NATION, "Chile"),
    (Flag.NATION, "Iceland"),
    (Flag.NATION, "Egypt"),
    (Flag.NATION, "Slovakia"),
    (Flag.NATION, "Serbia"),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NATION, "Estonia"),
    (Flag.NATION, "Latvia"),
    (Flag.NATION, "Uruguay"),
    (Flag.NATION, "Zimbabwe"),
    (Flag.NATION, "Morocco"),
    (Flag.NATION, "Ecuador"),
    (Flag.NATION, "Senegal"),
    (Flag.NATION, "England"),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NATION, "Wales"),
    (Flag.NATION, "Tunisia"),
    (Flag.NATION, "Croatia"),
    (Flag.NATION, "Ghana"),
    (Flag.NATION, "Cameroon"),
    (Flag.NATION, "Tajikistan"),
    (Flag.NATION, "Philippines"),
    (Flag.NATION, "Vietnam"),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NATION, "Kazakhstan"),
    (Flag.NATION, "Mongolia"),
    (Flag.NATION, "Nigeria"),
    (Flag.NATION, "Ethiopia"),
    (Flag.NATION, "Pakistan"),
    (Flag.NATION, "Angola"),
    (Flag.NATION, "Georgia"),
    (Flag.NATION, "North Macedonia"),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NATION, "New Zealand"),
    (Flag.NATION, "Indonesia"),
    (Flag.PRIDE, "Gender Queer"),
    (Flag.PRIDE, "Agender"),
    (Flag.PRIDE, "Gay Male"),
    (Flag.PRIDE, "Abrosexual"),
    (Flag.PRIDE, "Gay Female"),
    (Flag.PRIDE, "Pansexual"),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.PRIDE, "Bisexual"),
    (Flag.PRIDE, "Asexual"),
    (Flag.PRIDE, "Intersex"),
    (Flag.PRIDE, "Non-Binary"),
    (Flag.PRIDE, "Inclusive"),
    (Flag.PRIDE, "Transgender"),
    (Flag.PRIDE, "PoC Pride"),
    (Flag.PRIDE, "Gay Pride"),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.PRIDE, "Straight Ally"),
    (Flag.PRIDE, "Androgyne"),
    (Flag.COLOR, "Light Gray"),
    (Flag.COLOR, "Dark Brown"),
    (Flag.COLOR, "Light Brown"),
    (Flag.COLOR, "Orange"),
    (Flag.COLOR, "Yellow"),
    (Flag.COLOR, "Dark Green"),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.COLOR, "Light Green"),
    (Flag.COLOR, "Blue Green"),
    (Flag.COLOR, "Light Blue"),
    (Flag.COLOR, "Blue"),
    (Flag.COLOR, "Magenta"),
    (Flag.COLOR, "Pink"),
    (Flag.COLOR, "Dark Red"),
    (Flag.COLOR, "Red"),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.NONE, ""),
    (Flag.COLOR, "Ocean Blue"),
    (Flag.COLOR, "Purple"),
    (Flag.COLOR, "Navy Blue"),
    (Flag.COLOR, "Forest Green"),
    (Flag.COLOR, "Light Orange"),
    (Flag.COLOR, "Light Red"),
    (Flag.COLOR, "Black"),
    (Flag.COLOR, "Medium Gray"),
]

from html import escape

if os.path.exists(FLAG_PATH):
    shutil.rmtree(FLAG_PATH)

os.makedirs(FLAG_PATH)

groups = {}

output_name_json = {}

with Image.open("flags.png") as source_img:
    for index, (flag_type, flag_name) in enumerate(FLAGS):
        if flag_type == Flag.NONE:
            continue

        category = flag_type.name.lower()
        folder = os.path.join(FLAG_PATH, category)
        os.makedirs(folder, exist_ok=True)

        x = (index % 16) * 64
        y = (index // 16) * 32

        # Numeric filenames make URLs simple and stable.
        filename = f"{index}.png"
        source_img.crop((x, y, x + 64, y + 32)).save(
            os.path.join(folder, filename)
        )

        output_name_json[index] = flag_name.title()

        image_url = f"{FLAG_PATH}/{category}/{filename}"
        name = escape(flag_name, quote=True)

        groups.setdefault(category, []).append(f"""
            <button
                type="button"
                class="flag-option"
                data-index="{index}"
                data-name="{name}"
                data-category="{category}"
                aria-pressed="false"
            >
                <img src="{image_url}" alt="" loading="lazy">
                <span>{name}</span>
            </button>
        """)

with open('names.json', 'w') as json_file:
    json.dump(output_name_json, json_file)

category_order = ('color', 'shipping', 'community', 'nation', 'pride')

sections = "\n".join(
    f"""
    <section class="flag-category">
        <h3>{escape(category.title())}</h3>
        <div class="flag-grid">{''.join(groups[category])}</div>
    </section>
    """
    for category in category_order
)

dialog_html = """
<dialog id="flag_dialog_placeholder">
    <style>
        #flag_dialog_placeholder {
            width: min(850px, calc(100vw - 32px));
            max-height: 85vh;
            box-sizing: border-box;
            padding: 24px;
            border: 1px solid #444;
            border-radius: 14px;
            background: #202127;
            color: #eee;
            font-family: system-ui, sans-serif;
        }

        #flag_dialog_placeholder::backdrop {
            background: rgb(0 0 0 / 65%);
        }

        #flag_dialog_placeholder h2 {
            margin: 0 0 8px;
        }

        #flag_dialog_placeholder .flag-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
            gap: 8px;
        }

        #flag_dialog_placeholder button {
            font: inherit;
            color: inherit;
            cursor: pointer;
            border: 1px solid #555;
            border-radius: 8px;
            background: #303139;
            padding: 10px;
        }

        #flag_dialog_placeholder .flag-option {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            font-size: 12px;
        }

        #flag_dialog_placeholder .flag-option:hover {
            background: #40414b;
        }

        #flag_dialog_placeholder .flag-option[aria-pressed="true"] {
            border-color: #b99aff;
            background: #493762;
        }

        #flag_dialog_placeholder button:focus-visible {
            outline: 2px solid #b99aff;
            outline-offset: 2px;
        }

        #flag_dialog_placeholder img {
            image-rendering: pixelated;
            object-fit: contain;
        }

        #flag_dialog_placeholder .flag-option img {
            width: 96px;
            height: 48px;
        }

        #flag_dialog_placeholder .flag-footer {
            position: sticky;
            bottom: -24px;
            background: #202127;
            border-top: 1px solid #555;
            margin-top: 24px;
            padding: 16px 0;
        }

        #flag_dialog_placeholder .flag-preview img {
            width: 192px;
            height: 96px;
        }

        #flag_dialog_placeholder .flag-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 12px;
        }

        #flag_dialog_placeholder button:disabled {
            opacity: .45;
            cursor: default;
        }
    </style>

    <h2 id="flag-dialog-title">Choose a flag to overwrite</h2>
    <p>Your custom flag will replace the selected flag.</p>

    __SECTIONS__

    <footer class="flag-footer">
        <div class="flag-preview" hidden>
            <p>Replacing: <strong class="flag-selected-name"></strong></p>
            <img class="flag-selected-image" alt="">
        </div>

        <div class="flag-actions">
            <button type="button" data-action="cancel">Cancel</button>
            <button type="button" data-action="overwrite" disabled>
                Overwrite selected flag
            </button>
        </div>
    </footer>
</dialog>
""".replace("__SECTIONS__", sections)

with open("flag_dialog.html", "w", encoding="utf-8") as output:
    output.write(dialog_html)