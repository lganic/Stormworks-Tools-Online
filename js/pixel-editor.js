'use strict';

// Pixel editor logic.

function colorsEqual(color_a, color_b){
    return (
        color_a[0] === color_b[0] &&
        color_a[1] === color_b[1] &&
        color_a[2] === color_b[2]
    );
}

class PixelEditor {
    constructor(options = {}) {
        const {
            plot,
            canvas,
            width = 32,
            height = 32,
            palette = PixelEditor.defaultPalette,
            toolButtons = [],
            paletteContainer = null,
            customColorInput = null,
            clearButton = null,
            undoButton = null,
            redoButton = null,
            zoomButtons = {},
            maxUndo = 40,
            onChange = null
        } = options;

        if (!plot || !canvas) throw new Error('PixelEditor requires a plot element and a canvas element.');

        this.plot = plot;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onChange = onChange;
        this.maxUndo = maxUndo;

        this.offscreen = document.createElement('canvas');
        this.offCtx = this.offscreen.getContext('2d');
        this.checker = PixelEditor.makeCheckerPattern(this.ctx);

        this.tool = 'pencil';
        this.zoom = 1;
        this.pan = [0, 0];
        this.viewWidth = 0;
        this.viewHeight = 0;
        this.drag = null;
        this.undoStack = [];
        this.redoStack = [];
        this.swatchEls = [];

        this.toolButtons = toolButtons;
        this.paletteContainer = paletteContainer;
        this.customColorInput = customColorInput;
        this.clearButton = clearButton;
        this.undoButton = undoButton;
        this.redoButton = redoButton;
        this.zoomButtons = zoomButtons;

        this.color = PixelEditor.hexToRGBA(palette[0] || '#000000');

        this.resizeGrid(width, height, { fill: [255, 255, 255, 255], preserve: false });
        this.buildPalette(palette);
        this.bindToolButtons();
        this.bindActions();
        this.bindPointer();

        this.resizeObserver = new ResizeObserver(() => this.handleResize());
        this.resizeObserver.observe(this.plot);
        this.handleResize();
        this.updateButtons();
    }

    // ---- grid / pixel data ----------------------------------------------

    resizeGrid(width, height, { fill = [0, 0, 0, 0], preserve = true } = {}) {
        width = Math.max(1, Math.round(width));
        height = Math.max(1, Math.round(height));

        const next = new Uint8ClampedArray(width * height * 4);
        for (let i = 0; i < width * height; i++) {
            next[i * 4] = fill[0];
            next[i * 4 + 1] = fill[1];
            next[i * 4 + 2] = fill[2];
            next[i * 4 + 3] = fill[3];
        }

        if (preserve && this.pixels) {
            const w = Math.min(width, this.gridWidth), h = Math.min(height, this.gridHeight);
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const src = (y * this.gridWidth + x) * 4, dst = (y * width + x) * 4;
                    next[dst] = this.pixels[src];
                    next[dst + 1] = this.pixels[src + 1];
                    next[dst + 2] = this.pixels[src + 2];
                    next[dst + 3] = this.pixels[src + 3];
                }
            }
        }

        this.gridWidth = width;
        this.gridHeight = height;
        this.pixels = next;
        this.offscreen.width = width;
        this.offscreen.height = height;
        this.dirty = true;
        this.undoStack = [];
        this.redoStack = [];
        this.updateButtons();
        this.draw();
    }

    loadPixels(pixels, width, height) {
        if (pixels.length !== width * height * 4) {
            throw new Error(
                `Invalid pixel data: got ${pixels.length} values, expected ${width * height * 4}`
            );
        }

        this.pushUndo();

        this.gridWidth = width;
        this.gridHeight = height;

        this.pixels = new Uint8ClampedArray(pixels);

        this.offscreen.width = width;
        this.offscreen.height = height;

        this.dirty = true;

        this.emitChange();
        this.draw();
    }

    // Draw `image` into the grid at (optionally new) dimensions, resampling
    // the same way the import modal's resize step does.
    loadImage(image, { width = this.gridWidth, height = this.gridHeight, smoothing = 'medium', quantization = -1} = {}) {
        this.resizeGrid(width, height, { preserve: false });

        const temp = document.createElement('canvas');
        temp.width = width;
        temp.height = height;
        const tctx = temp.getContext('2d');

        if (smoothing === 'nearest') {
            tctx.imageSmoothingEnabled = false;
        } else {
            tctx.imageSmoothingEnabled = true;
            tctx.imageSmoothingQuality = smoothing;
        }

        const sw = image.naturalWidth || image.width, sh = image.naturalHeight || image.height;
        tctx.drawImage(image, 0, 0, sw, sh, 0, 0, width, height);

        if (quantization > 0) {
            quantize(temp, quantization);
        }

        this.pixels.set(tctx.getImageData(0, 0, width, height).data);
        this.dirty = true;
        this.undoStack = [];
        this.redoStack = [];
        this.emitChange();
        this.draw();
    }

    setPixel(x, y, [r, g, b, a]) {
        const i = (y * this.gridWidth + x) * 4;
        this.pixels[i] = r;
        this.pixels[i + 1] = g;
        this.pixels[i + 2] = b;
        this.pixels[i + 3] = a;
    }

    getPixelAt(x, y) {
        const i = (y * this.gridWidth + x) * 4;
        return [this.pixels[i], this.pixels[i + 1], this.pixels[i + 2], this.pixels[i + 3]];
    }

    inBounds(x, y) {
        return x >= 0 && y >= 0 && x < this.gridWidth && y < this.gridHeight;
    }

    floodFill(sx, sy, color) {
        const target = this.getPixelAt(sx, sy);
        if (colorsEqual(target, color)) return;

        const stack = [[sx, sy]];
        while (stack.length) {
            const [x, y] = stack.pop();
            if (!this.inBounds(x, y)) continue;
            if (!colorsEqual(this.getPixelAt(x, y), target)) continue;
            this.setPixel(x, y, color);
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
    }

    getImageData() {
        return new ImageData(this.pixels.slice(), this.gridWidth, this.gridHeight);
    }

    toDataURL(type = 'image/png') {
        const out = document.createElement('canvas');
        out.width = this.gridWidth;
        out.height = this.gridHeight;
        out.getContext('2d').putImageData(this.getImageData(), 0, 0);
        return out.toDataURL(type);
    }

    // ---- undo / redo -------------------------------------------------

    pushUndo() {
        this.undoStack.push(this.pixels.slice());
        if (this.undoStack.length > this.maxUndo) this.undoStack.shift();
        this.redoStack = [];
        this.updateButtons();
    }

    undo() {
        if (!this.undoStack.length) return;
        this.redoStack.push(this.pixels.slice());
        this.pixels = this.undoStack.pop();
        this.dirty = true;
        this.emitChange();
        this.updateButtons();
        this.draw();
    }

    redo() {
        if (!this.redoStack.length) return;
        this.undoStack.push(this.pixels.slice());
        this.pixels = this.redoStack.pop();
        this.dirty = true;
        this.emitChange();
        this.updateButtons();
        this.draw();
    }

    emitChange() {
        if (this.onChange) this.onChange(this);
    }

    // ---- color palette -------------------------------------------------

    buildPalette(colors) {
        this.palette = colors.slice();
        this.swatchEls = [];

        if (!this.paletteContainer) return;
        this.paletteContainer.innerHTML = '';

        const addSwatch = (hex, { transparent = false, label } = {}) => {
            const color = transparent ? [0, 0, 0, 0] : PixelEditor.hexToRGBA(hex);

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'swatch' + (transparent ? ' transparent' : '');
            if (!transparent) btn.style.background = hex;
            btn.title = label || hex;
            btn.setAttribute('aria-label', label || hex);
            btn.onclick = () => this.setColor(color);

            this.paletteContainer.appendChild(btn);
            this.swatchEls.push({ el: btn, color });
        };

        addSwatch(null, { transparent: true, label: 'Transparent / erase' });
        this.palette.forEach(hex => addSwatch(hex));

        if (this.customColorInput) {
            this.customColorInput.oninput = () => this.setColor(PixelEditor.hexToRGBA(this.customColorInput.value));
        }
    }

    setColor(rgba) {
        this.color = rgba;
        this.updateButtons();
    }

    // ---- toolbar / buttons -------------------------------------------------

    bindToolButtons() {
        this.toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.tool = btn.dataset.tool;
                this.drag = null;
                this.updateButtons();
                this.draw();
            });
        });
    }

    bindActions() {
        if (this.clearButton) {
            this.clearButton.onclick = () => {
                this.pushUndo();
                this.pixels.fill(0);
                this.dirty = true;
                this.emitChange();
                this.draw();
            };
        }

        if (this.undoButton) this.undoButton.onclick = () => this.undo();
        if (this.redoButton) this.redoButton.onclick = () => this.redo();

        const { plus, minus, fit } = this.zoomButtons;
        if (plus) plus.onclick = () => this.changeZoom(1.25);
        if (minus) minus.onclick = () => this.changeZoom(0.8);
        if (fit) fit.onclick = () => this.fit();
    }

    updateButtons() {
        this.swatchEls.forEach(({ el, color }) => el.classList.toggle('active', colorsEqual(color, this.color)));
        this.toolButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tool === this.tool));
        if (this.undoButton) this.undoButton.disabled = this.undoStack.length === 0;
        if (this.redoButton) this.redoButton.disabled = this.redoStack.length === 0;
    }

    // ---- view transform -------------------------------------------------

    baseFit() {
        return Math.min(this.viewWidth / this.gridWidth, this.viewHeight / this.gridHeight) * 0.92;
    }

    scale() {
        return this.baseFit() * this.zoom;
    }

    origin() {
        const s = this.scale();
        return [
            this.viewWidth / 2 - this.gridWidth * s / 2 + this.pan[0],
            this.viewHeight / 2 - this.gridHeight * s / 2 + this.pan[1]
        ];
    }

    toScreen(gx, gy) {
        const [ox, oy] = this.origin(), s = this.scale();
        return [ox + gx * s, oy + gy * s];
    }

    toGrid(sx, sy) {
        const [ox, oy] = this.origin(), s = this.scale();
        return [(sx - ox) / s, (sy - oy) / s];
    }

    changeZoom(factor, x = this.viewWidth / 2, y = this.viewHeight / 2) {
        const next = Math.max(0.25, Math.min(48, this.zoom * factor)), ratio = next / this.zoom;
        this.pan = [
            x - this.viewWidth / 2 - (x - this.viewWidth / 2 - this.pan[0]) * ratio,
            y - this.viewHeight / 2 - (y - this.viewHeight / 2 - this.pan[1]) * ratio
        ];
        this.zoom = next;
        this.draw();
    }

    fit() {
        this.zoom = 1;
        this.pan = [0, 0];
        this.draw();
    }

    handleResize() {
        const box = this.plot.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.viewWidth = box.width;
        this.viewHeight = box.height;
        this.canvas.width = Math.round(box.width * dpr);
        this.canvas.height = Math.round(box.height * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.draw();
    }

    // ---- pointer / keyboard input -------------------------------------------------

    bindPointer() {
        this.plot.addEventListener('contextmenu', e => e.preventDefault());

        this.plot.addEventListener('wheel', e => {
            e.preventDefault();
            const rect = this.plot.getBoundingClientRect();
            this.changeZoom(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
        }, { passive: false });

        this.plot.onpointerdown = e => this.handlePointerDown(e);
        this.plot.onpointermove = e => this.handlePointerMove(e);

        const end = e => this.handlePointerUp(e);
        this.plot.onpointerup = end;
        this.plot.onpointercancel = end;
        this.plot.onlostpointercapture = end;

        this.plot.onkeydown = e => this.handleKeyDown(e);
    }

    handlePointerDown(e) {
        if (this.drag) return;

        const rect = this.plot.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const isPanButton = e.button === 1 || e.button === 2;

        if (this.tool === 'pan' || isPanButton) {
            this.drag = { id: e.pointerId, mode: 'pan', x: e.clientX, y: e.clientY, pan: [...this.pan] };
            this.plot.setPointerCapture(e.pointerId);
            this.plot.classList.add('dragging');
            return;
        }

        if (e.button !== 0) return;

        const [gx, gy] = this.toGrid(x, y);
        const cell = [Math.floor(gx), Math.floor(gy)];

        if (this.tool === 'fill') {
            if (this.inBounds(...cell)) {
                this.pushUndo();
                this.floodFill(cell[0], cell[1], this.color);
                this.dirty = true;
                this.emitChange();
                this.draw();
            }
            return;
        }

        this.pushUndo();
        this.plot.setPointerCapture(e.pointerId);

        if (this.tool === 'line') {
            this.drag = { id: e.pointerId, mode: 'line', start: cell, end: cell };
        } else {
            this.drag = { id: e.pointerId, mode: 'pencil', last: cell };
            if (this.inBounds(...cell)) this.setPixel(cell[0], cell[1], this.color);
            this.dirty = true;
        }

        this.draw();
    }

    handlePointerMove(e) {
        if (!this.drag || this.drag.id !== e.pointerId) return;

        const rect = this.plot.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;

        if (this.drag.mode === 'pan') {
            this.pan = [this.drag.pan[0] + e.clientX - this.drag.x, this.drag.pan[1] + e.clientY - this.drag.y];
            this.draw();
            return;
        }

        const [gx, gy] = this.toGrid(x, y);
        const cell = [Math.floor(gx), Math.floor(gy)];

        if (this.drag.mode === 'pencil') {
            for (const [px, py] of PixelEditor.linePoints(this.drag.last[0], this.drag.last[1], cell[0], cell[1])) {
                if (this.inBounds(px, py)) this.setPixel(px, py, this.color);
            }
            this.drag.last = cell;
            this.dirty = true;
            this.draw();
        } else if (this.drag.mode === 'line') {
            this.drag.end = cell;
            this.draw();
        }
    }

    handlePointerUp(e) {
        if (!this.drag || this.drag.id !== e.pointerId) return;

        if (this.drag.mode === 'line') {
            for (const [px, py] of PixelEditor.linePoints(this.drag.start[0], this.drag.start[1], this.drag.end[0], this.drag.end[1])) {
                if (this.inBounds(px, py)) this.setPixel(px, py, this.color);
            }
            this.dirty = true;
        }

        if (this.drag.mode !== 'pan') this.emitChange();

        this.plot.classList.remove('dragging');
        this.drag = null;
        this.updateButtons();
        this.draw();
    }

    handleKeyDown(e) {
        const tag = document.activeElement && document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        const keyTool = { p: 'pencil', l: 'line', f: 'fill', h: 'pan' }[e.key.toLowerCase()];
        if (keyTool) {
            this.tool = keyTool;
            this.updateButtons();
            this.draw();
            e.preventDefault();
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            e.shiftKey ? this.redo() : this.undo();
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            this.redo();
            return;
        }

        if (e.key === '+' || e.key === '=') this.changeZoom(1.25);
        else if (e.key === '-') this.changeZoom(0.8);
        else if (e.key === '0') this.fit();
        else return;

        e.preventDefault();
    }

    // ---- rendering -------------------------------------------------

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);

        const [ox, oy] = this.origin();
        const s = this.scale();
        const w = this.gridWidth * s, h = this.gridHeight * s;

        ctx.save();
        ctx.fillStyle = this.checker;
        ctx.fillRect(ox, oy, w, h);
        ctx.restore();

        if (this.dirty) {
            this.offCtx.putImageData(new ImageData(this.pixels, this.gridWidth, this.gridHeight), 0, 0);
            this.dirty = false;
        }

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.offscreen, ox, oy, w, h);

        if (s >= 10) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0,0,0,.12)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x <= this.gridWidth; x++) {
                ctx.moveTo(ox + x * s, oy);
                ctx.lineTo(ox + x * s, oy + h);
            }
            for (let y = 0; y <= this.gridHeight; y++) {
                ctx.moveTo(ox, oy + y * s);
                ctx.lineTo(ox + w, oy + y * s);
            }
            ctx.stroke();
            ctx.restore();
        }

        ctx.strokeStyle = '#7050b5';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(ox, oy, w, h);

        if (this.drag && this.drag.mode === 'line') {
            const [sx, sy] = this.toScreen(this.drag.start[0] + 0.5, this.drag.start[1] + 0.5);
            const [ex, ey] = this.toScreen(this.drag.end[0] + 0.5, this.drag.end[1] + 0.5);

            ctx.save();
            ctx.strokeStyle = '#ef8b36';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            ctx.restore();
        }
    }
}

PixelEditor.defaultPalette = [
    '#ffffff', '#c4c4c4', '#808080', '#404040', '#000000',
    '#ff2b2b', '#ff8c1a', '#ffd400', '#3ac74a', '#137a4b',
    '#1e88e5', '#1a3f8b', '#8e44ad', '#d13ba0', '#8b5a2b', '#f2c9a1'
];

PixelEditor.hexToRGBA = (hex, alpha = 255) => {
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
    const bigint = parseInt(full, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255, alpha];
};

// Bresenham's line algorithm; used both to commit the line tool and to
// fill gaps between pointermove samples while freehand drawing.
PixelEditor.linePoints = (x0, y0, x1, y1) => {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);

    const points = [];
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;

    while (true) {
        points.push([x0, y0]);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
    }

    return points;
};

PixelEditor.makeCheckerPattern = (ctx, size = 8) => {
    const p = document.createElement('canvas');
    p.width = p.height = size * 2;
    const pctx = p.getContext('2d');
    pctx.fillStyle = '#ffffff';
    pctx.fillRect(0, 0, size * 2, size * 2);
    pctx.fillStyle = '#d7d7e2';
    pctx.fillRect(0, 0, size, size);
    pctx.fillRect(size, size, size, size);
    return ctx.createPattern(p, 'repeat');
};

if (typeof window !== 'undefined') window.PixelEditor = PixelEditor;
if (typeof module !== 'undefined') module.exports = PixelEditor;
