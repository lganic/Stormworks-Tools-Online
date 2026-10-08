'use strict';

const $ = id => document.getElementById(id);

const DEFAULT_WIDTH = 5 * 9; // Default size is 5x5 blocks.
const DEFAULT_HEIGHT = 5 * 9;

const imageInput = $('imageInput');
const modal = $('resizeModal');
const preview = $('preview');
const widthInput = $('width');
const heightInput = $('height');
const resampling = $('resampling');
const resample_preview = $('resample-preview');

let quantization_amount = 0;

let loadedImage = null;

let target_front_pixels = null;
let target_back_pixels = null;

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

    const out_width = $('sign-width-2').value * 9;
    const out_height = $('sign-height-2').value * 9

    temp.width = out_width;
    temp.height = out_height;

    const tctx = temp.getContext('2d');

    const smoothing = resampling.value;
    if (smoothing === 'nearest') {
        tctx.imageSmoothingEnabled = false;
    } else {
        tctx.imageSmoothingEnabled = true;
        tctx.imageSmoothingQuality = smoothing;
    }

    tctx.drawImage(loadedImage, 0, 0, out_width, out_height);

    if ($('quantization_enabled').checked) {
        // At this point, we perform our quantization operation on the tctx surface
        quantize(temp, quantization_amount);
    }

    // Now we can scale up the resampled image so we can actually see what it looks like.
    // For this, we will enforce a max height of 200, but we will calculate the width based on aspect ratio of the blocks.
    resample_preview.height = 200;
    resample_preview.width = 200 * (out_width / out_height);

    // adjust the actual html object.
    resample_preview.style.height = `${resample_preview.height}px`;
    resample_preview.style.width = `${resample_preview.width}px`;

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

    $('sign-width').value = $('sign-width-2').value;
    $('sign-height').value = $('sign-height-2').value;

    editor.loadImage(loadedImage, {
        width: $('sign-width').value * 9,
        height: $('sign-height').value * 9,
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


function handle_resize() {

    // Resizes the canvas to the new size.

    editor.resizeGrid($('sign-width').value * 9, $('sign-height').value * 9);

}

$('sign-width').oninput = e => {
    const n = Number(e.target.value);

    if (e.target.value !== '' && Number.isInteger(n) && n >= 1 && n <= 100) {
        $('sign-width-2').value = e.target.value;
    } 

    handle_resize();
}; 

$('sign-width-2').oninput = e => {
    // const n = Number(e.target.value);

    // if (e.target.value !== '' && Number.isInteger(n) && n >= 1 && n <= 100) {
    //     $('sign-width').value = e.target.value;
    // } 
    
    update_preview();
}; 

$('sign-height').oninput = e => {
    const n = Number(e.target.value);

    if (e.target.value !== '' && Number.isInteger(n) && n >= 1 && n <= 100) {
        $('sign-height-2').value = e.target.value;
    } 

    handle_resize();
}; 

$('sign-height-2').oninput = e => {
    // const n = Number(e.target.value);

    // if (e.target.value !== '' && Number.isInteger(n) && n >= 1 && n <= 100) {
    //     $('sign-height').value = e.target.value;
    // } 
    
    update_preview();
}; 


async function export_sign() {

    create_and_download_double_sign(target_front_pixels, target_back_pixels, 'output_double_sign.xml', $('use_glow').checked);
}

$('export_sign').onclick = export_sign;


const PREVIEW_MAX_W = 110; // CSS px; one preview gets roughly half the sidebar
const PREVIEW_MAX_H = 72;

// Snapshots of each side, kept for the double-sign export later.
const sides = { front: null, back: null };

function draw_side_preview(canvas, imageData) {
    const { width: w, height: h } = imageData;

    // Fit inside the fixed box while keeping the sign's aspect ratio.
    const scale = Math.min(PREVIEW_MAX_W / w, PREVIEW_MAX_H / h);
    const css_w = Math.round(w * scale);
    const css_h = Math.round(h * scale);

    // Backing store at device resolution so it stays sharp on HiDPI screens.
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${css_w}px`;
    canvas.style.height = `${css_h}px`;
    canvas.width = Math.round(css_w * dpr);
    canvas.height = Math.round(css_h * dpr);

    // putImageData ignores scaling, so draw at 1:1 on a temp canvas first.
    const temp = document.createElement('canvas');
    temp.width = w;
    temp.height = h;
    temp.getContext('2d').putImageData(imageData, 0, 0);

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false; // We want chunky
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(temp, 0, 0, canvas.width, canvas.height);
}

function set_side(name) {
    sides[name] = editor.getImageData(); // already returns a copy
    draw_side_preview($(`${name}-canvas`), sides[name]);
}

$('set-front-canvas').onclick = () => {set_side('front'); target_front_pixels = [...editor.pixels]};
$('set-back-canvas').onclick = () => {set_side('back'); target_back_pixels = [...editor.pixels]};

// Initialize the side previews as blank.
const blank = new ImageData(editor.gridWidth, editor.gridHeight);
draw_side_preview($('front-canvas'), blank);
draw_side_preview($('back-canvas'), blank);