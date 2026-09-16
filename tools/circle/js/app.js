'use strict';

// Lookup util
const $ = id => document.getElementById(id)

// Fix zoom buttons propagating their events to the root plot.
const zoomControls = document.querySelector(".zoom");

zoomControls.addEventListener("pointerdown", e => {
    e.stopPropagation();
});

zoomControls.addEventListener("mousedown", e => {
    e.stopPropagation();
});

function integratedError(p, width, drop, circle_radius) {

    const m = -drop / width, b = p[1] - m * p[0];

    function primitive(x) {
        const q = Math.max(0, circle_radius * circle_radius - x * x), s = Math.sqrt(q);

        // Solution to error integral:
        return (circle_radius * circle_radius + b * b) * x + (m * m - 1) * x * x * x / 3 + m * b * x * x + 2 * m * q * s / 3 - b * (x * s + circle_radius * circle_radius * Math.asin(Math.max(-1, Math.min(1, x / circle_radius))));
    }

    // Evaluate the definite integral.
    return Math.max(0, primitive(p[0] + width) - primitive(p[0]));
}

function generate(diameter, weight) {

    const r = diameter / 2;
    const stop = r * Math.SQRT1_2 + .2;
    const widths = [1, 1, 2, 4];

    // Update the current position based on the type of wedge. 0 = block, 1 = 1x1 wedge, 2 = 1x2 wedge, 3 = 1x3 wedge.
    function update(p, wedge_type) {
        let dx;

        if (wedge_type === 0 || wedge_type === 1)
            dx = 1;
        else if (wedge_type === 2)
            dx = 2;
        else
            dx = 4;

        let dy = wedge_type === 0 ? 0 : -1;

        return [p[0] + dx, p[1] + dy];
    }

    function best(p) {
        const e = widths.map((w, i) => (p[0] <= r - w ? integratedError(p, w, i === 0 ? 0 : 1, r) : 99999) * (i === 0 ? weight : 1) / w);

        if (e[0] < Math.min(e[1], e[2], e[3])) {
            return 0;
        }
        if (e[1] < Math.min(e[2], e[3])) {
            return 1;
        }
        if (e[2] < e[3]) {
            return 2;
        }
        return 3;
    }

    let p = [diameter % 2 / 2, r]; // Make the starting point.
    const points = [];

    for (let n = 0; n < 200; n++) {
        points.push(p);
        const choice = best(p); // Find the best point for this position.
        const next = update(p, choice); // Update the position based on the choice.

        if (next[0] >= stop) {
            if (p[0] < stop - 1) points.push(update(p, choice - 1));
            break;
        }
        p = next;
    }

    // Transpose points to make the corner.
    const corner = points.concat(points.map(p => [p[1], p[0]]).reverse());

    // Flip points vertically to make a side.
    const side = corner.concat(corner.map(p => [p[0], -p[1]]).reverse());

    // Flip points horizontally to make the full shape.
    return side.concat(side.map(p => [-p[0], p[1]]).reverse());
}

function ellipseError(p, length, drop, a, b) {
    const m = -drop / length, c = p[1] - m * p[0], k = b / a;

    function primitive(x) {
        const q = Math.max(0, a * a - x * x), root = Math.sqrt(q);

        // Solution to error integral:
        return (b * b + c * c) * x + (m * m - k * k) * x * x * x / 3 + m * c * x * x + 2 * k * m * q * root / 3 - k * c * (x * root + a * a * Math.asin(Math.max(-1, Math.min(1, x / a))));
    }

    // Evaluate the definite integral.
    return Math.max(0, primitive(p[0] + length) - primitive(p[0]));
}

function generateEllipse(width, height, weight = 1, margin = .2) {

    const w = width / 2
    const h = height / 2;

    function solve(a, b, initial) {

        const stop = a * a / Math.hypot(a, b) + margin
        const points = []
        const lengths = [1]; // Base block

        if ($('wedge1').checked) lengths.push(1); // Add 1 x 1 wedge
        if ($('wedge2').checked) lengths.push(2); // Add 1 x 2 wedge
        if ($('wedge3').checked) lengths.push(3); // Add 1 x 3 wedge
        if ($('wedge4').checked) lengths.push(4); // Add 1 x 4 wedge

        // Update the current position based on the type of wedge. 0 = block, 1 = 1x1 wedge, 2 = 1x2 wedge, 3 = 1x3 wedge.
        function update(p, wedge_type) {

            let dx = lengths[wedge_type];
            let dy = -1;

            if (wedge_type === 0) dy = 0; // Is block. Doesnt go down.

            return [p[0] + dx, p[1] + dy];
        }

        function best(p) {
            const e = [];

            for (let block_type = 0; block_type < lengths.length; block_type ++){

                let error = 99999;

                if (p[0] <= a - lengths[block_type]) error = ellipseError(p, lengths[block_type], block_type === 0 ? 0 : 1, a, b);

                error *= (block_type === 0 ? weight : 1);

                error /= lengths[block_type];

                e.push(error);
            }

            return e.indexOf(Math.min(...e)); // Return lowest error solution.
        }

        let p = [initial, b];

        for (let n = 0; n < 200; n++) {
            points.push(p);

            // Calculate the error function for each wedge choice.
            const choice = best(p); // Find the best point for this position.
            const next = update(p, choice); // Update the position based on the choice.

            if (next[0] >= stop) {
                if (p[0] < stop - 1) points.push(update(p, choice - 1));
                break;
            }

            p = next;
        }
        return points;
    }

    // First solve the top corner.
    const top = solve(w, h, width % 2 / 2)
    // Solve the side, and transpose to get into the proper order.
    const sidePoints = solve(h, w, height % 2 / 2).map(p => [p[1], p[0]]);

    // Join the corner.
    const corner = top.concat(sidePoints.reverse())

    // Get the side by flipping the corner.
    const side = corner.concat(corner.map(p => [p[0], -p[1]]).reverse());

    // Return the full shape.
    return side.concat(side.map(p => [-p[0], p[1]]).reverse());
}

if (typeof module !== 'undefined') module.exports = { generate, integratedError, generateEllipse, ellipseError };


if (typeof document !== 'undefined') {

    // Get elements from page.
    const canvas = $('canvas')
    const ctx = canvas.getContext('2d')
    const plot = $('plot');

    // Get the mode of the page. True if we are generating ellipses.
    const ellipse = document.body.dataset.mode === 'ellipse';

    let diameter = 24;
    let shapeWidth = 26;
    let shapeHeight = 14;
    
    let weight = ellipse ? 1 : 2;
    let margin = .2;
    let points = [];
    let zoom = 1;
    let pan = [0, 0];
    let width = 0;
    let height = 0;
    let drag = null;

    // Get the dimension of the shape.
    function dimensions() {
        if (ellipse) return [shapeWidth, shapeHeight];

        return [diameter, diameter];
    }

    function scale() {
        if (drag && drag.axis) return drag.scale;
        
        const [w, h] = dimensions();
        return Math.min(width / w, height / h) * .79 * zoom; 
    }

    function screen(p) {
        const s = scale();
        return [
            width / 2 + pan[0] + p[0] * s,
            height / 2 + pan[1] - p[1] * s
        ]; 
    }

    function path(ps, fill, stroke, lineWidth = 1) {

        if (!ps.length) return;
        ctx.beginPath();
        ps.forEach((p, i) => {
            const q = screen(p);
            i ? ctx.lineTo(...q) : ctx.moveTo(...q); 
        });

        ctx.closePath();
        if (fill) {
            ctx.fillStyle = fill;
            ctx.fill(); 
        }
        
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        } 
    }

    function draw() {

        ctx.clearRect(0, 0, width, height);

        const [dw, dh] = dimensions();
        const rx = dw / 2;
        const ry = dh / 2;
        const graph_scale = scale();

        if ($('grid').checked && graph_scale >= 3) {

            // Draw the dotted grid. Assuming the size is greater than 3
            ctx.save();
            ctx.strokeStyle = '#dfe4f0';
            ctx.lineWidth = .7;
            ctx.setLineDash([3, 4]);
            ctx.beginPath(); 
            
            for (let i = 0; i <= dw; i++) {
                const v = -rx + i; ctx.moveTo(...screen([v, -ry]));
                ctx.lineTo(...screen([v, ry]));
            } 
            
            for (let i = 0; i <= dh; i++) {
                const v = -ry + i;
                ctx.moveTo(...screen([-rx, v]));
                ctx.lineTo(...screen([rx, v]));
            }
            
            ctx.stroke();
            ctx.restore();
        
        }

        path(points, 'rgba(112,80,181,.16)', '#7050b5', 1.7);

        if ($('pieces').checked) {
            // Loop over all the points, and create polygons for each segment.

            for (let i = 0; i < points.length; i++) { 

                // Get the points from the point list. 
                const from_point = points[i];
                const to_point = points[(i + 1) % points.length]; 
                
                if (from_point[0] === to_point[0] && from_point[1] === to_point[1]) continue; // Point is the same. Ignore it.
                
                let poly; // Create the polygon.

                
                // Based on the arrangement of the two points, infer the position of the remaining polygon point, and construct the polygon path.
                if (from_point[0] === to_point[0]) {
                    const offset = from_point[1] > to_point[1] ? -1 : 1;
                    poly = [[from_point[0] + offset, from_point[1]], from_point, to_point, [to_point[0] + offset, to_point[1]]];
                } 
                else if (from_point[1] === to_point[1]) {
                    const offset = from_point[0] > to_point[0] ? 1 : -1;
                    poly = [[from_point[0], from_point[1] + offset], from_point, to_point, [to_point[0], to_point[1] + offset]];
                } 
                else { 
                    const close = (a, b) => Math.abs(a) < Math.abs(b) ? a : b;
                    poly = [to_point, from_point, [close(to_point[0], from_point[0]), close(to_point[1], from_point[1])]];
                } 

                const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");

                const fillColor = colorScheme.matches
                    ? '#b99ae9'
                    : '#b9a7e1';

                const strokeColor = colorScheme.matches
                    ? '#7a67cc'
                    : '#7050b5';

                path(poly, fillColor, strokeColor, 1);
            }
        }

        if ($('circle').checked) {
            // Circle checked. Stroke the debug circle.

            ctx.save();

            // Setup style
            ctx.strokeStyle = '#ef8b36';
            ctx.lineWidth = 1.7;
            ctx.setLineDash([6, 5]);
            ctx.beginPath();

            // Make ellipse path
            ctx.ellipse(...screen([0, 0]), rx * graph_scale, ry * graph_scale, 0, 0, Math.PI * 2);

            // Stroke the path
            ctx.stroke();
            
            ctx.restore();
        }

        // Always draw main path.
        for (const p of [[rx, 0], [-rx, 0], [0, ry], [0, -ry]]){
            
            ctx.beginPath();
            
            ctx.arc(...screen(p), 6, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.strokeStyle = '#7050b5';
            ctx.lineWidth = 2;
            
            ctx.stroke(); 
        }
    }


    function fit() {
        zoom = 1;
        pan = [0, 0];
        draw();
    }

    function sync() {

        // Generate the shape, depending on whether we are making an ellipse or not.
        points = ellipse ? generateEllipse(shapeWidth, shapeHeight, weight, margin) : generate(diameter, weight);

        // Set all the text fields.
        if (ellipse) {
            $('shape-width').value = shapeWidth;
            $('shape-width-range').value = shapeWidth;
            $('shape-width-radius').textContent = 'Radius ' + shapeWidth / 2; 

            $('shape-height').value = shapeHeight;
            $('shape-height-range').value = shapeHeight;
            $('shape-height-radius').textContent = 'Radius ' + shapeHeight / 2; 
        }
        else {
            $('diameter').value = diameter;
            $('diameter-range').value = diameter;
            $('radius').textContent = 'Radius ' + diameter / 2;
        }

        $('weight-value').value = weight.toFixed(2);

        if (ellipse) {
            $('margin-value').value = margin.toFixed(2);
        }
        
        draw();
    }

    function bindDimension(id, set) {

        // Bind the input stuff to sync the graph.
        $(id + '-range').oninput = e => {
            set(+e.target.value);
            sync();
        };
        
        $(id).oninput = e => {
            const n = Number(e.target.value);
            if (e.target.value !== '' && Number.isInteger(n) && n >= 1 && n <= 100) {
                set(n); sync();
            } 
        }; 
        
        $(id).onchange = sync; 
    }

    if (ellipse) {
        bindDimension('shape-width', n => shapeWidth = n);
        bindDimension('shape-height', n => shapeHeight = n);

        // Bind margin specifically, since it doesn't have an input which we could use binddimension on.
        $('margin').oninput = e => {
            margin = +e.target.value; sync();
        }; 
    }
    else {
        // Circle. Just need to bind dimension.
        bindDimension('diameter', n => diameter = n);
    }

    // Bind shared value (currently just the block weight)
    $('weight').oninput = e => {
        weight = +e.target.value; sync();
    };
    
    $('grid').onchange = draw;
    $('pieces').onchange = draw;
    $('circle').onchange = draw;

    $('wedge1').onchange = sync;
    $('wedge2').onchange = sync;
    $('wedge3').onchange = sync;
    $('wedge4').onchange = sync;

    // Function to increment, or decrement the zoom based on a set factor
    function changeZoom(factor, x = width / 2, y = height / 2) {
        const next = Math.max(.5, Math.min(12, zoom * factor)), ratio = next / zoom;
        pan = [x - width / 2 - (x - width / 2 - pan[0]) * ratio, y - height / 2 - (y - height / 2 - pan[1]) * ratio];
        zoom = next;
        draw();
    }

    // Hookup the plus / minus zoom & fit behavior to the buttons
    $('plus').onclick = () => changeZoom(1.25);
    $('minus').onclick = () => changeZoom(.8);
    $('fit').onclick = fit;

    // Set some default values when the reset button is clicked.
    $('reset').onclick = () => { diameter = 24; shapeWidth = 26; shapeHeight = 14; weight = ellipse ? 1 : 2; margin = .2; $('weight').value = weight; if (ellipse) $('margin').value = margin; $('grid').checked = true; $('pieces').checked = true; $('circle').checked = ellipse; zoom = 1; pan = [0, 0]; sync(); };

    // Scroll zoom.
    plot.addEventListener('wheel', e => { e.preventDefault(); const b = plot.getBoundingClientRect(); changeZoom(Math.exp(-e.deltaY * .0015), e.clientX - b.left, e.clientY - b.top); }, { passive: false });

    plot.onpointerdown = e => {

        // Button was clicked.
        if (e.button !== 0 || drag) return; // We are dragging, or we pressed a different mouse button. Either way, ignore.

        const rect = plot.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
        const [dw, dh] = dimensions();

        // Check if the clicked point is close enough to one of our resize handles.
        let axis = null;
        for (const [point, name] of [[[dw / 2, 0], 'x'], [[-dw / 2, 0], 'x'], [[0, dh / 2], 'y'], [[0, -dh / 2], 'y']]) { 
            const pos = screen(point);
            if (Math.hypot(x - pos[0], y - pos[1]) <= 16){
                axis = name;
                break;
            }
        }

        // Save this as the current drag context.
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, pan: [...pan], scale: scale(), axis };

        // Set our dragging classes.
        plot.setPointerCapture(e.pointerId);
        plot.classList.add(axis ? (axis === 'x' ? 'resizing' : 'resizing-vertical') : 'dragging');
    };

    plot.onpointermove = e => {
        if (!drag || drag.id !== e.pointerId) return; // Move moved, but we aren't dragging. Ignore!
        
        if (drag.axis) {

            // We have set a resize handle, which means we are resizing.
            const rect = plot.getBoundingClientRect();

            // Calculate the resize amount, based on the axis, and the distance travelled.
            const distance = drag.axis === 'x' ? e.clientX - rect.left - width / 2 - pan[0] : e.clientY - rect.top - height / 2 - pan[1];

            // Get the new value.
            const value = Math.max(1, Math.min(100, Math.round(2 * Math.abs(distance) / drag.scale)));


            // Update the corresponding axis, depending on which type of shape we are using.
            if (ellipse) {
                if (drag.axis === 'x') {
                    shapeWidth = value;
                }
                else {
                    shapeHeight = value;
                }
            }
            else {
                diameter = value;
            }
            
            sync();
        } 
        else {
            // We are not using a resize handle. Pan instead.
            pan = [drag.pan[0] + e.clientX - drag.x, drag.pan[1] + e.clientY - drag.y]; draw();
        }
    };

    // defines an event handler function named end that triggers when a user stops dragging the plot plot
    const end = e => { if (drag && e.pointerId === drag.id) { const fixed = drag.axis ? drag.scale : null; drag = null; if (fixed) { const [w, h] = dimensions(); zoom = fixed / (Math.min(width / w, height / h) * .79); } plot.classList.remove('dragging', 'resizing', 'resizing-vertical'); draw(); } }; plot.onpointerup = end; plot.onpointercancel = end; plot.onlostpointercapture = end;

    // Define some keybinds to call the above.
    plot.onkeydown = e => { if (e.key === '+' || e.key === '=') changeZoom(1.25); else if (e.key === '-') changeZoom(.8); else if (e.key === '0') fit(); else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { pan[e.key === 'ArrowLeft' || e.key === 'ArrowRight' ? 0 : 1] += e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? 24 : -24; draw(); } else return; e.preventDefault(); };

    // Make a thing to handle the bounding client.
    new ResizeObserver(() => { const box = plot.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; width = box.width; height = box.height; canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw(); }).observe(plot); sync();
}
