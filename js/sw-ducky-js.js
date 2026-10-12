// JS port of a lot of the SW-Ducky functionality.

const EARTH_LAYER_MEM_ORDER = ["Land", "Grass", "Sand", "Shallows", "Snow", "Gravel", "Rock", "Sea-3", "Sea-2", "Sea-1", "Sea-0"];
const EARTH_LAYER_RENDER_ORDER = ["Sea-0", "Sea-1", "Sea-2", "Sea-3", "Land", "Grass", "Sand", "Shallows", "Snow", "Gravel", "Rock"];
const MOON_LAYER_MEM_ORDER = ["Land", "Grass", "Sand", "Shallows", "Snow", "Gravel", "Rock", "Moon-3", "Moon-2", "Moon-1", "Moon-0"];
const MOON_LAYER_RENDER_ORDER = ["Moon-0", "Moon-1", "Moon-2", "Moon-3", "Land", "Sand", "Gravel", "Rock", "Grass", "Snow", "Shallows"];
const EARTH_COLORS = { "Sea-0": [50, 121, 134], "Sea-1": [61, 142, 159], "Sea-2": [72, 163, 184], "Sea-3": [83, 185, 209], "Land": [208, 208, 198], "Grass": [164, 184, 117], "Sand": [227, 208, 141], "Shallows": [83, 185, 209], "Snow": [255, 255, 255], "Gravel": [139, 110, 92], "Rock": [88, 62, 45] };
const MOON_COLORS = { "Moon-0": [134, 137, 151], "Moon-1": [109, 112, 126], "Moon-2": [84, 87, 101], "Moon-3": [59, 62, 76], "Land": [208, 208, 198], "Grass": [164, 184, 117], "Sand": [227, 208, 141], "Shallows": [59, 62, 76], "Snow": [255, 255, 255], "Gravel": [139, 110, 92], "Rock": [88, 62, 45] };
const BASE_COLORS = { "Earth": [40, 100, 110], "Moon": [159, 162, 176] };
const LINE_COLORS = [[90, 90, 90], [140, 140, 140]];

const LINE_THICKNESS = 4;

function integer(value, min, max, label) {
    if (!Number.isInteger(value) || value < min || value > max)
        throw new RangeError(`${label} must be an integer in [${min}, ${max}]`);
    return value;
}

function finite(value, label) {
    if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite`);
    return value;
}

function point(p, label = "Coordinate") {
    if (!p || p.length !== 2 || !is_cord_valid(p))
        throw new TypeError(`${label} must contain two finite numbers`);
    return p;
}

function float32(value) {
    finite(value, "Coordinate");
    if (!Number.isFinite(Math.fround(value)))
        throw new RangeError("Coordinate exceeds the float32 range");
    return value;
}

function bytes(data) {
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (ArrayBuffer.isView(data))
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    throw new TypeError("Expected an ArrayBuffer, Buffer, or typed array view");
}

function concat(chunks) {
    const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let offset = 0;
    for (const c of chunks) { out.set(c, offset); offset += c.length; }
    return out;
}

function is_cord_valid(coord) {
    return !!coord && Number.isFinite(coord[0]) && Number.isFinite(coord[1]);
}

function is_poly_valid(coords) {
    return coords.every(is_cord_valid);
}

class Reader {
    constructor(data, offset) {
        const b = bytes(data);
        this.view = new DataView(b.buffer, b.byteOffset, b.byteLength);
        this.pos = integer(offset, 0, b.byteLength, "Byte offset");
    }

    need(n) {
        if (n > this.view.byteLength - this.pos) {
            throw new RangeError(`Truncated binary data at byte ${this.pos}: need ${n} bytes`);
        }
    }

    skip(n) {
        this.need(n);
        this.pos += n;
    }

    u16() {
        this.need(2);
        const v = this.view.getUint16(this.pos, true);
        this.pos += 2;
        return v;
    }

    f32() {
        this.need(4);
        const v = this.view.getFloat32(this.pos, true);
        this.pos += 4;
        return v;
    }
}

class Writer {
    constructor(size) {
        this.data = new Uint8Array(size);
        this.view = new DataView(this.data.buffer);
        this.pos = 0;
    }

    u16(v) {
        integer(v, 0, 65535, "Unsigned 16-bit value");
        this.view.setUint16(this.pos, v, true);
        this.pos += 2;
    }

    f32(v) {
        this.view.setFloat32(this.pos, float32(v), true);
        this.pos += 4;
    }

    download(filename = "output.bin") {
        const blob = new Blob(
            [this.data.subarray(0, this.pos)],
            { type: "application/octet-stream" }
        );

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);
    }
}

class Mesh {
    constructor(reader = null) {

        this.num_positions = 0;
        this.verts = [];
        this.num_tris = 0;
        this.tris = [];

        if (reader === null) return;

        this.num_positions = reader.u16();
        for (let i = 0; i < this.num_positions; i++) {
            let x = reader.f32();
            reader.skip(4); // Skip an ignored float.
            let z = reader.f32();

            this.verts.push([x, z]);
        }

        this.num_tris = reader.u16();
        for (let i = 0; i < this.num_tris; i = i + 3) {
            let e1 = reader.u16();
            let e2 = reader.u16();
            let e3 = reader.u16();

            this.tris.push([e1, e2, e3]);
        }
    }

    export(writer) {

        if (this.verts.length >  32767) {
            throw new RangeError("Too many verts to export.");
        }

        if (this.tris.length > 10922) {
            throw new RangeError("Too many tris to export.");
        }

        // I am just gonna manually correct the num positions and num tris here. Cause I am lazy. If you have an issue with this: dont!
        this.num_positions = this.verts.length;
        this.num_tris = this.tris.length * 3;

        writer.u16(this.num_positions);

        for (const vert of this.verts) {
            writer.f32(vert[0]);
            writer.f32(0); // Pack irrelevant Y cord.
            writer.f32(vert[1]);
        }

        writer.u16(this.num_tris);

        for (const tri of this.tris) {
            writer.u16(tri[0]);
            writer.u16(tri[1]);
            writer.u16(tri[2]);
        }
    }
}

class LineGroup {
    constructor(reader = null) {

        this.num_segments = 0;
        this.segments = [];

        if (reader === null) return;

        this.num_segments = reader.u16();

        for (let i = 0; i < this.num_segments; i = i + 4) {

            let x1 = reader.f32();
            reader.skip(4); // Skip an ignored float.
            let z1 = reader.f32();
            reader.skip(8); // Skip useless (?) bytes.

            let x2 = reader.f32();
            reader.skip(4); // Skip an ignored float.
            let z2 = reader.f32();
            reader.skip(8); // Skip useless (?) bytes.

            let x3 = reader.f32();
            reader.skip(4); // Skip an ignored float.
            let z3 = reader.f32();
            reader.skip(8); // Skip useless (?) bytes.

            let x4 = reader.f32();
            reader.skip(4); // Skip an ignored float.
            let z4 = reader.f32();
            reader.skip(8); // Skip useless (?) bytes.

            // Calculate rendered line start and end. (Note that this will flatten the quad data to a line segment. This might not be a good thing. But for simplicity, (and since artifacts will likely be rare) I think its the best option)
            let m1x = (x1 + x2) / 2;
            let m1z = (z1 + z2) / 2;

            let m2x = (x3 + x4) / 2;
            let m2z = (z3 + z4) / 2;

            if (isNaN(m1x) || isNaN(m2x) || isNaN(m1z) || isNaN(m2z)) {
                continue; // Not sure why nans crop up?
            }

            this.segments.push([m1x, m1z, m2x, m2z]);
        }
    }

    export(writer) {
        // I am just gonna manually correct the nums. Cause I am lazy. If you have an issue with this: dont!
        this.num_segments = this.segments.length * 4;

        if (this.num_segments.length > 8191) {
            throw new RangeError("Too many line segments to export.");
        }

        writer.u16(this.num_segments);

        for (const segment of this.segments) {

            // We need to convert this from a line segment back into a quad, with the correct winding order. 
            // I am just gonna copy this solution over from sw-ducky.

            let dy = segment[3] - segment[1];
            let dx = segment[2] - segment[0];

            let angle = Math.atan2(dy, dx);

            let a1 = angle + Math.PI / 2;
            let a2 = angle - Math.PI / 2;

            function offset_with_angle(x, y, angle) {
                return [x + LINE_THICKNESS * Math.cos(angle), y + LINE_THICKNESS * Math.sin(angle)];
            }

            // Use the offset angles to determine a quad which preserves the CCW rotation
            let c1 = offset_with_angle(segment[0], segment[1], a2);
            let c2 = offset_with_angle(segment[0], segment[1], a1);
            let c3 = offset_with_angle(segment[2], segment[3], a1);
            let c4 = offset_with_angle(segment[2], segment[3], a2);

            // Now we just need to pack all the data we just calculated.
            writer.f32(c1[0]);
            writer.f32(0); // Irrelevant Y.
            writer.f32(c1[1]);
            writer.f32(0); // Unknown BS. No effect as far as I can tell.
            writer.f32(1); // 1,0,0,1 pattern.

            writer.f32(c2[0]);
            writer.f32(0); // Irrelevant Y.
            writer.f32(c2[1]);
            writer.f32(0); // Unknown BS. No effect as far as I can tell.
            writer.f32(0); // 1,0,0,1 pattern.

            writer.f32(c3[0]);
            writer.f32(0); // Irrelevant Y.
            writer.f32(c3[1]);
            writer.f32(0); // Unknown BS. No effect as far as I can tell.
            writer.f32(0); // 1,0,0,1 pattern.

            writer.f32(c4[0]);
            writer.f32(0); // Irrelevant Y.
            writer.f32(c4[1]);
            writer.f32(0); // Unknown BS. No effect as far as I can tell.
            writer.f32(1); // 1,0,0,1 pattern.
        }

    }
}


function convert_axis_value(size, value, flip = false) {
    const v = size * ((value + 500) / 1000);
    return flip ? size - v : v;
}

function convert_coord(size, coord) {
    return [convert_axis_value(size, coord[0]), convert_axis_value(size, coord[1], true)];
}

function convert_coords(size, coords) {
    return coords.map(c => convert_coord(size, c));
}

function cssColor(color) {
    return typeof color === "string" ? color : `rgb(${color[0]},${color[1]},${color[2]})`;
}

function stroke(ctx, start, end) {
    // Canvas does not paint zero-length butt-capped lines. Preserve a visible dot.
    if (start[0] === end[0] && start[1] === end[1]) {
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillRect(start[0] - ctx.lineWidth / 2, start[1] - ctx.lineWidth / 2, ctx.lineWidth, ctx.lineWidth);
    } else {
        ctx.beginPath(); ctx.moveTo(...start); ctx.lineTo(...end); ctx.stroke();
    }
}

// Canvas counterpart of Pillow draw_dashed_line. options: {fill, width}.
function draw_dashed_line(ctx, start, end, dash_length = 10, gap = 5, options = {}) {

    // Check our data.
    point(start);
    point(end);
    finite(dash_length, "Dash length");
    finite(gap, "Gap");
    
    if (dash_length <= 0 || gap < 0) throw new RangeError("Dash length must be positive and gap nonnegative");

    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const dist = Math.hypot(dx, dy);

    ctx.save();

    if (options.fill !== undefined) {
        ctx.strokeStyle = cssColor(options.fill);
    
    }

    if (options.width !== undefined) {
        ctx.lineWidth = options.width;
    }

    ctx.setLineDash([]);
    ctx.lineCap = "butt";

    if (dist === 0) {
        stroke(ctx, start, end);
        return;
    }

    const steps = Math.floor(dist / (dash_length + gap));

    for (let i = 0; i <= steps; i++) {
        const a = i * (dash_length + gap) / dist;
        const b = Math.min(a + dash_length / dist, 1);

        stroke(ctx, [start[0] + dx * a, start[1] + dy * a], [start[0] + dx * b, start[1] + dy * b]);
    }
    
    ctx.restore();
}


class TileCanvas {
    constructor(size, back_color, canvas = null) {

        integer(size, 1, 32767, "Image size");

        if (!canvas) {
            if (typeof document !== "undefined") canvas = document.createElement("canvas");
            else if (typeof OffscreenCanvas !== "undefined") canvas = new OffscreenCanvas(size, size);
            else throw new Error("Canvas unavailable: supply a Canvas-compatible object as the third argument");
        }

        // canvas.width = size; canvas.height = size;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("A Canvas 2D context is required");
        
        this.size = size;
        this.tile_img = canvas;
        this.tile_draw = ctx;
        
        ctx.fillStyle = cssColor(back_color);
        ctx.fillRect(0, 0, size, size);
    }

    triangle(coords, color) {
        if (coords.length !== 3) throw new TypeError("Triangle needs three coordinates");

        coords.forEach(c => point(c)); // Affirm the cords are valid.

        // Convert the coords to the image space.
        const pts = convert_coords(this.size, coords), ctx = this.tile_draw;

        // Setup.
        ctx.fillStyle = cssColor(color);
        ctx.beginPath();

        // Path
        ctx.moveTo(...pts[0]);
        ctx.lineTo(...pts[1]);
        ctx.lineTo(...pts[2]);

        // Close
        ctx.closePath();
        ctx.fill();
    }

    draw_line(cord_1, cord_2, color, dashed = false) {

        const a = convert_coord(this.size, point(cord_1));
        const b = convert_coord(this.size, point(cord_2));

        const ctx = this.tile_draw;

        if (dashed) draw_dashed_line(ctx, a, b, 4, 4, { fill: color, width: 2 });

        else {
            ctx.save();
            
            ctx.strokeStyle = cssColor(color);
            ctx.lineWidth = 2;
            ctx.lineCap = "butt"; 
            ctx.setLineDash([]);

            stroke(ctx, a, b);

            ctx.restore();
        }
    }
}

class MapGeometry {
    constructor(file_buffer = null, moon = false) {

        if (typeof moon !== "boolean") throw new TypeError("moon must be a boolean");
        this.moon = moon;
        
        this.meshes = [];
        this.lines = [];

        this.memory_order = [...(moon ? MOON_LAYER_MEM_ORDER : EARTH_LAYER_MEM_ORDER)];
        this.render_order = [...(moon ? MOON_LAYER_RENDER_ORDER : EARTH_LAYER_RENDER_ORDER)];

        this.base_color = moon ? BASE_COLORS['Moon'] : BASE_COLORS['Earth'];

        this.layer_colors = [];
        for (let i = 0; i < 11; i ++) {
            this.layer_colors.push(moon ? MOON_COLORS[this.render_order[i]] : EARTH_COLORS[this.render_order[i]]);
        }

        if (file_buffer === null) {
            for (let i = 0; i < 11; i++) {
                this.meshes.push(new Mesh());
            }
            for (let i = 0; i < 10; i++) {
                this.lines.push(new LineGroup());
            }

            return;
        }

        for (let i = 0; i < 11; i++) {
            this.meshes.push(new Mesh(file_buffer));
        }
        for (let i = 0; i < 10; i++) {
            this.lines.push(new LineGroup(file_buffer));
        }
    }

    export() {

        const max_size = 32767 * (3 * 4) + (11 * 2 * 2) + (10922 * 2) + (11 * 8191 * 5 * 4);

        let writer = new Writer(max_size);

        for (let i = 0; i < 11; i ++) {
            this.meshes[i].export(writer);
        }
        for (let i = 0; i < 10; i ++) {
            this.lines[i].export(writer);
        }

        return writer;
    }

    render_to_image(size, canvas = null) {
        const tc = new TileCanvas(size, this.base_color, canvas);
        for (let i = 0; i < 11; i ++) {

            const mesh = this.meshes[i];

            for (const tri of mesh.tris) {
                tc.triangle(tri.map(k => mesh.verts[k]), this.layer_colors[i]);
            }
        }

        for (let i = 0; i < 10; i ++) {

            const line_group = this.lines[i];

            for (const line of line_group.segments) {
                tc.draw_line([line[0], line[1]], [line[2], line[3]], LINE_COLORS[i % 2], i % 2 === 1);
            }

        }

        return tc.tile_img;
    }

}