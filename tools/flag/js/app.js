'use strict';

const $ = id => document.getElementById(id);

const DEFAULT_WIDTH = 64;
const DEFAULT_HEIGHT = 32;

const imageInput = $('imageInput');
const modal = $('resizeModal');
const preview = $('preview');
const widthInput = $('width');
const heightInput = $('height');
const resampling = $('resampling');
const resample_preview = $('resample-preview');

const things_to_overwrite = {};

let quantization_amount = 0;

let loadedImage = null;

const editor = new PixelEditor({
    plot: $('plot'),
    canvas: $('canvas'),
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    toolButtons: document.querySelectorAll('#tools button'),
    paletteContainer: $('palette'),
    customColorInput: $('custom-color'),
    clearButton: $('clear'),
    undoButton: $('undo'),
    redoButton: $('redo'),
    zoomButtons: { plus: $('plus'), minus: $('minus'), fit: $('fit') }
});

function bindRange(id, set) {

    set($(id).value);

    // Bind the input stuff to sync the graph.
    $(id + '-range').oninput = e => {
        set(+e.target.value);
        $(id).value = e.target.value;
        update_preview();
    };
    
    $(id).oninput = e => {
        const n = Number(e.target.value);
        if (e.target.value !== '' && Number.isInteger(n) && n >= 1 && n <= 100) {
            $(id + '-range').value = e.target.value;
            set(n);
        } 
        update_preview();
    }; 
}

imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
        loadedImage = img;
        preview.src = url;
        modal.showModal();
        update_preview();
    };

    img.src = url;
});

function update_preview() {

    if (!loadedImage) return;

    // We need to scale in two discrete steps.
    // First resample to the target size using the selected mode.

    const temp = document.createElement('canvas');
    temp.width = DEFAULT_WIDTH;
    temp.height = DEFAULT_HEIGHT;

    const tctx = temp.getContext('2d');

    const smoothing = resampling.value;
    if (smoothing === 'nearest') {
        tctx.imageSmoothingEnabled = false;
    } else {
        tctx.imageSmoothingEnabled = true;
        tctx.imageSmoothingQuality = smoothing;
    }

    tctx.drawImage(loadedImage, 0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT);

    if ($('quantization_enabled').checked) {
        // At this point, we perform our quantization operation on the tctx surface
        quantize(temp, quantization_amount);
    }

    // Now we can scale up the resampled image so we can actually see what it looks like.
    resample_preview.height = 200;
    resample_preview.width = 400;

    const ctx = resample_preview.getContext('2d');

    ctx.imageSmoothingEnabled = false; // We want chunky

    ctx.drawImage(temp, 0, 0, resample_preview.width, resample_preview.height);
}

resampling.addEventListener('change', () => {
    update_preview();
})

$('cancel').addEventListener('click', () => modal.close());

$('import').addEventListener('click', () => {
    if (!loadedImage) return;

    let use_quantization = -1;

    if ($('quantization_enabled').checked) {
        use_quantization = $('quantization').value;
    }

    editor.loadImage(loadedImage, {
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        smoothing: resampling.value,
        quantization: use_quantization
    });

    modal.close();
});

window.onload = function () {
    bindRange("quantization", n => quantization_amount = n);
}

$('quantization_enabled').addEventListener('change', function() {
  if (this.checked) {
    $('hide_on_no_quantization').style.display = 'block'; // Make visible
  } else {
    $('hide_on_no_quantization').style.display = 'none';  // Make invisible
  }

  update_preview();
});











let flagDialogPromise;

async function openFlagDialog() {
    if (!flagDialogPromise) {
        flagDialogPromise = loadFlagDialog().catch(error => {
            flagDialogPromise = null; // Allow retry after a failed request.
            throw error;
        });
    }

    const dialog = await flagDialogPromise;
    if (!dialog.open) dialog.showModal();
}

async function loadFlagDialog() {
    const response = await fetch("flag_dialog.html");

    if (!response.ok) {
        throw new Error(`Could not load flag dialog: ${response.status}`);
    }

    const template = document.createElement("template");
    template.innerHTML = await response.text();

    const dialog = template.content.querySelector("dialog");
    dialog.setAttribute("aria-labelledby", "flag-dialog-title");

    document.getElementById("flag_dialog_placeholder").replaceWith(dialog);

    const preview = dialog.querySelector(".flag-preview");
    const previewImage = dialog.querySelector(".flag-selected-image");
    const previewName = dialog.querySelector(".flag-selected-name");
    const overwriteButton = dialog.querySelector('[data-action="overwrite"]');

    let selected = null;

    dialog.addEventListener("click", event => {
        const option = event.target.closest(".flag-option");

        if (option) {
            dialog.querySelectorAll(".flag-option").forEach(button => {
                button.setAttribute("aria-pressed", String(button === option));
            });

            selected = {
                index: Number(option.dataset.index),
                name: option.dataset.name,
                category: option.dataset.category,
                imageUrl: option.querySelector("img").src
            };

            previewImage.src = selected.imageUrl;
            previewImage.alt = selected.name;
            previewName.textContent = selected.name;
            preview.hidden = false;
            overwriteButton.disabled = false;
            return;
        }

        const action = event.target.closest("[data-action]")?.dataset.action;

        if (action === "cancel") {
            dialog.close();
        }

        if (action === "overwrite" && selected) {
            dialog.dispatchEvent(new CustomEvent("flag-overwrite", {
                bubbles: true,
                detail: { ...selected }
            }));

            dialog.close();
        }
    });

    dialog.addEventListener("close", () => {
        selected = null;
        preview.hidden = true;
        overwriteButton.disabled = true;
        dialog.querySelectorAll(".flag-option").forEach(button => {
            button.setAttribute("aria-pressed", "false");
        });
    });

    return dialog;
}

$('select-flag').onclick = openFlagDialog;

let flagNames = {};

async function loadFlagNames() {
    const response = await fetch('names.json');
    flagNames = await response.json();

    updateFlagList();
}

loadFlagNames();

function updateFlagList() {
    const element = $('export-area');

    element.innerHTML = '';

    for (const [key, pixels] of Object.entries(things_to_overwrite)) {
        const row = document.createElement('div');
        row.className = 'export-item';
        row.classList.add('export-tools')

        const label = document.createElement('span');
        label.textContent = (flagNames[key] ?? `Flag ${key}`) + "    ";

        const exportButton = document.createElement('button');
        exportButton.textContent = '↗';
        exportButton.title = 'Load into editor';

        exportButton.onclick = () => {
            editor.loadPixels(pixels, 64, 32);
        };

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'X';
        deleteButton.title = 'Delete';

        deleteButton.onclick = () => {
            delete things_to_overwrite[key];
            updateFlagList();
        };

        row.appendChild(label);
        row.appendChild(exportButton);
        row.appendChild(deleteButton);

        element.appendChild(row);
    }
}

document.addEventListener("flag-overwrite", event => {
    const { index, name, category } = event.detail;

    things_to_overwrite[index] = [...editor.pixels]; // Save the pixels in.

    updateFlagList();
});


async function overwrite_export_flags() {
    const img = new Image();
    img.src = "flags.png";

    await img.decode();

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext("2d");

    // Draw original flags.png
    ctx.drawImage(img, 0, 0);

    // Apply replacements
    for (const [indexStr, pixels] of Object.entries(things_to_overwrite)) {
        const index = Number(indexStr);

        const x = (index % 16) * 64;
        const y = Math.floor(index / 16) * 32;

        const data = new Uint8ClampedArray(pixels);

        const imageData = new ImageData(data, 64, 32);

        ctx.putImageData(imageData, x, y);
    }

    convert_to_txtr_and_download(canvas, 'flags.txtr');

    alert('Copy the downloaded file to the "Stormworks/rom/graphics/flags.txtr" folder or follow the modding instructions to make a mod for this.');
}

$('export_flags').onclick = overwrite_export_flags;