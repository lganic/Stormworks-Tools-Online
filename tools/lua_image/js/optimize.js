const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');

const gcdCache = new Map();

// To ensure that our async process doesn't freeze the page. 
function yield_to_browser() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

async function convert_to_hex_matrix(pixels) {

    const width = $('monitor-width').value * 32;
    const height = $('monitor-height').value * 32;

    let output_matrix = []

    let base_index = 0;

    for (let y = 0; y < height; y ++) {
        let row = []

        for (let x = 0; x < width; x ++) {
            const r = pixels[base_index];
            const g = pixels[base_index + 1];
            const b = pixels[base_index + 2];

            base_index = base_index + 4;

            row.push(rgbToHex(r, g, b))
        }

        output_matrix.push([...row]);
    }

    return output_matrix;
}

async function get_groups(hex_matrix) {

    counts = {};

    for (let y = 0; y < hex_matrix.length; y ++) {
        for (let x = 0; x < hex_matrix[y].length; x ++) {
            counts[hex_matrix[y][x]] = counts[hex_matrix[y][x]] ? counts[hex_matrix[y][x]] + 1 : 1;
        }
    }

    return counts;
}

function check_accounted_or_eq(current, target) {
    if (current === "$") {
        return true;
    }

    return current === target;
}

// def edge(A: Point, B: Point, P: Point):
//     return (B.x - A.x) * (P.y - A.y) - (B.y - A.y) * (P.x - A.x)

function edge(ax, ay, bx, by, px, py) {
    return (bx - ax) * (py - ay) - (by - ay) * (px - ax);
}

function gcd(a, b) {
    // Normalize order, since gcd(a,b) === gcd(b,a)
    if (a < b) [a, b] = [b, a];

    const key = `${a},${b}`;

    if (gcdCache.has(key)) {
        return gcdCache.get(key);
    }

    let x = a, y = b;

    while (y !== 0) {
        const temp = y;
        y = x % y;
        x = temp;
    }

    gcdCache.set(key, x);
    return x;
}

function trianglePointCount(x1, y1, x2, y2, x3, y3) {
    const twiceArea = Math.abs(edge(
        x1, y1, x2, y2, x3, y3
    ));

    const B =
        gcd(Math.abs(x2-x1), Math.abs(y2-y1)) +
        gcd(Math.abs(x3-x2), Math.abs(y3-y2)) +
        gcd(Math.abs(x1-x3), Math.abs(y1-y3));

    return (twiceArea + B) / 2 + 1;
}

async function get_optimized(groups, hex_matrix) {

    const height = hex_matrix.length;
    const width = hex_matrix[0].length;

    const sortedEntries = Object.entries(groups).sort((a, b) => a[1] - b[1]);

    objects = [];

    for (let [color, quantity] of sortedEntries) {
        console.log(`${color}: ${quantity}`);

        // Now we need to find a way to optimally represent each part of this. 

        // Loop while we still have pixels to deal with.
        while (quantity > 0) {

            // Lets do an optimization step first so we can prune our search space a little. 
            // We will do this by finding the min and max of the pixels we are looking for.

            let min_x = width + 1;
            let max_x = -1;
            let min_y = height + 1;
            let max_y = -1;

            for (let y = 0; y < height; y ++) {
                for (let x = 0; x < width; x ++) {

                    if (hex_matrix[y][x] == color) {
                        min_x = Math.min(min_x, x);
                        max_x = Math.max(max_x, x);

                        min_y = Math.min(min_y, y);
                        max_y = Math.max(max_y, y);
                    }

                }
            }

            let delta_x = max_x - min_x + 1;
            let delta_y = max_y - min_y + 1;

            // Find the best line we can find.

            let best_line_x1 = 0;
            let best_line_y1 = 0;
            let best_line_x2 = 0;
            let best_line_y2 = 0;
            let best_line_area = -1;

            for (let p1y = min_y; p1y <= max_y; p1y ++) {

                await yield_to_browser();

                for (let p1x = min_x; p1x <= max_x; p1x ++) {

                    if (!check_accounted_or_eq(hex_matrix[p1y][p1x], color)) continue;

                    // Yes we have to do it this way, since the lines are not the same when drawn forward vs backward.
                    for (let p2y = min_y; p2y < max_y; p2y ++) {
                        for (let p2x = min_x; p2x < max_x; p2x ++) {
                            if (p2x == p1x && p2y == p1y) continue;

                            // Rasterize and check
                            
                            let dx = Math.abs(p2x - p1x);
                            let dy = Math.abs(p2y - p1y);

                            let line_pixels = Math.max(dx, dy);
                            if (line_pixels < best_line_area) continue; // Not worth checking.

                            let sx = (p1x < p2x) ? 1 : -1;
                            let sy = (p1y < p2y) ? 1 : -1;

                            let good = true;
                            let this_line_pixel_area = 0;

                            // if (dx === 0 && dy === 0) continue; // Not needed. Already checked.

                            if (dy >= dx) {
                                // X is dominant
                                for (let i = 0; i < dx; i ++) {
                                    let x = p1x + i * sx;
                                    let y = Math.floor(.5 + p1y + (p2y - p1y) * i / dx);

                                    if (!check_accounted_or_eq(hex_matrix[y][x], color)) {
                                        good = false;
                                        break;
                                    }
                                    if (hex_matrix[y][x] === color) {
                                        this_line_pixel_area ++; // Accounts for pixels which are being deliberately ignored.
                                    }
                                }
                            }
                            else {
                                // Y is dominant
                                for (let i = 0; i < dy; i ++) {
                                    let y = p1y + i * sy;
                                    let x = Math.floor(.5 + p1x + (p2x - p1x) * i / dy);

                                    if (!check_accounted_or_eq(hex_matrix[y][x], color)) {
                                        good = false;
                                        break;
                                    }
                                    if (hex_matrix[y][x] === color) {
                                        this_line_pixel_area ++; // Accounts for pixels which are being deliberately ignored.
                                    }
                                }
                            }

                            if (good && this_line_pixel_area > best_line_area) {
                                best_line_x1 = p1x;
                                best_line_y1 = p1y;
                                best_line_x2 = p2x;
                                best_line_y2 = p2y;
                                best_line_area = this_line_pixel_area;
                            }
                        }
                    }
                }
            }

            console.log("LINE", best_line_area, best_line_x1, best_line_y1, best_line_x2, best_line_y2);

            // Find the best rectangle we can find.

            let best_rect_x = 0;
            let best_rect_y = 0;
            let best_rect_w = 0;
            let best_rect_h = 0;
            let best_rect_area = -1;
            
            // Holy mother of big O complexity. May god forgive me.
            for (let ry = min_y; ry <= max_y; ry ++) {

                await yield_to_browser();

                for (let rx = min_x; rx <= max_x; rx ++) {

                    if (!check_accounted_or_eq(hex_matrix[ry][rx], color)) continue;

                    for (let rh = 1; rh < delta_y - (ry - min_y) + 1; rh ++){
                        for (let rw = 1; rw < delta_x - (rx - min_x) + 1; rw ++) {

                            if ((rh * rw) < Math.max(best_line_area, best_rect_area)) continue; // Not worth checking.

                            // TODO: There is an optimization to be had here, where we limit following scans based on a the length of the last scan.
                            // I.e:
                            // S0000000000000000
                            // 000000000
                            // 000000000XXXXXXXXXX
                            // 00000
                            // 00000XXXXXXXXXX

                            // If S is the root, and 0 and X match the color of S, we can skip all the X 
                            // Need to do that later though. 

                            // Scan 
                            let good = true;
                            let this_rect_pixel_area = 0;
                            for (let sy = ry; sy < ry + rh; sy ++) {
                                for (let sx = rx; sx < rx + rw; sx ++) {
                                    if (!check_accounted_or_eq(hex_matrix[sy][sx], color)) {
                                        good = false;
                                        break;
                                    }
                                    if (hex_matrix[sy][sx] === color) {
                                        this_rect_pixel_area ++; // Accounts for pixels which are being deliberately ignored.
                                    }
                                }

                                if (!good) break;
                            }

                            if (!good) break; // Stop scanning horizontally at least. This is where the optimization from earlier should be implemented.

                            if (this_rect_pixel_area > best_rect_area) {
                                best_rect_area = this_rect_pixel_area;
                                best_rect_x = rx;
                                best_rect_y = ry;
                                best_rect_w = rw;
                                best_rect_h = rh;
                            }
                        }
                    }
                }
            }
            
            
            console.log("RECT", best_rect_area, best_rect_x, best_rect_y, best_rect_w, best_rect_h);

            // if (quantity > 20) break;

            // Find the best triangle
            let best_tri_1_x = 0;
            let best_tri_1_y = 0;
            let best_tri_2_x = 0;
            let best_tri_2_y = 0;
            let best_tri_3_x = 0;
            let best_tri_3_y = 0;
            let best_tri_area = -1;

            for (let i = 0; i <= (delta_x + 1) * (delta_y + 1); i++){
                
                await yield_to_browser();

                let p1x = min_x + (i % (delta_x + 1));
                let p1y = min_y + Math.floor(i / (delta_x + 1));

                if (p1x < 0 || p1x >= width) continue;
                if (p1y < 0 || p1y >= height) continue;
                
                // These don't work, since we cannot guarantee (Based on the tri alg) that the endpoints are in the shape.
                // if (!check_accounted_or_eq(hex_matrix[p1y][p1x], color)) continue;

                for (let j = i + 1; j <= (delta_x + 1) * (delta_y + 1); j++){
                    let p2x = min_x + (j % (delta_x + 1));
                    let p2y = min_y + Math.floor(j / (delta_x + 1));

                    if (p2x < 0 || p2x >= width) continue;
                    if (p2y < 0 || p2y >= height) continue;
                    
                    // These don't work, since we cannot guarantee (Based on the tri alg) that the endpoints are in the shape.
                    // if (!check_accounted_or_eq(hex_matrix[p2y][p2x], color)) continue;

                    for (let k = j + 1; k <= (delta_x + 1) * (delta_y + 1); k++){

                        let p3x = min_x + (k % (delta_x + 1));
                        let p3y = min_y + Math.floor(k / (delta_x + 1));

                        if (p3x < 0 || p3x >= width) continue;
                        if (p3y < 0 || p3y >= height) continue;

                        if ((p1x == p2x) && (p1x == p3x) && (p2x == p3x)) continue; // Can be expressed as line.
                        if ((p1y == p2y) && (p1y == p3y) && (p2y == p3y)) continue; // Can be expressed as line.
                        
                        // These don't work, since we cannot guarantee (Based on the tri alg) that the endpoints are in the shape.
                        // if (!check_accounted_or_eq(hex_matrix[p3y][p3x], color)) continue;

                        let area = edge(p1x, p1y, p2x, p2y, p3x, p3y);
                        
                        if (area === 0) continue;

                        let pixel_count = trianglePointCount(p1x, p1y, p2x, p2y, p3x, p3y);

                        if (pixel_count <= Math.max(best_line_area, best_rect_area, best_tri_area)) continue; // Not worth checking.


                        console.log("SCAN");

                        let good = true;

                        let this_tri_pixel_area = 0;

                        for (let sy = Math.min(p1y, p2y, p3y); sy <= Math.max(p1y, p2y, p3y); sy ++) {
                            for (let sx = Math.min(p1x, p2x, p3x); sx <= Math.max(p1x, p2x, p3x); sx ++) {
                                let px = sx + .01;
                                let py = sy + 1;

                                let e0 = edge(p1x, p1y, p2x, p2y, px, py);
                                let e1 = edge(p2x, p2y, p3x, p3y, px, py);
                                let e2 = edge(p3x, p3y, p1x, p1y, px, py);

                                let inside = false;
                                
                                if (area > 0) {
                                    inside = (e0 >=0 && e1 >= 0 && e2 >= 0);
                                }
                                else {
                                    inside = (e0 <= 0 && e1 <= 0 && e2 <= 0);
                                }

                                if (inside) {
                                    if (!check_accounted_or_eq(hex_matrix[sy][sx], color)) {
                                        good = false;
                                        break;
                                    }
                                    if (hex_matrix[sy][sx] === color) {
                                        this_tri_pixel_area ++; // Accounts for pixels which are being deliberately ignored.
                                    }
                                    // TODO: We can do a check here pretty easily to see if the number of deliberately ignored pixels means this one can no longer be an effective candidate, and we can skip it.
                                }
                            }

                            if (!good) break;
                        }

                        if (good) {
                            if (this_tri_pixel_area > best_tri_area) {
                                best_tri_area = this_tri_pixel_area;

                                best_tri_1_x = p1x;
                                best_tri_1_y = p1y;

                                best_tri_2_x = p2x;
                                best_tri_2_y = p2y;

                                best_tri_3_x = p3x;
                                best_tri_3_y = p3y;
                            }
                        }
                    }
                }   
            }

            console.log("TRI", best_tri_area, best_tri_1_x, best_tri_1_y, best_tri_2_x, best_tri_2_y, best_tri_3_x, best_tri_3_y);

            if (best_line_area > Math.max(best_rect_area, best_tri_area)) {
                objects.push({"LINE": [best_line_x1, best_line_y1, best_line_x2, best_line_y2]});
                quantity -= best_line_area;

                // We now need to shade in the line. I will copy paste the alg from earlier. (All these could be a function, but keeping it monolith allows for more optimizations.)

                let dx = Math.abs(best_line_x2 - best_line_x1);
                let dy = Math.abs(best_line_y2 - best_line_y1);

                let sx = (best_line_x1 < best_line_x2) ? 1 : -1;
                let sy = (best_line_y1 < best_line_y2) ? 1 : -1;

                if (dy >= dx) {
                    // X is dominant
                    for (let i = 0; i < dx; i ++) {
                        let x = best_line_x1 + i * sx;
                        let y = Math.floor(.5 + best_line_y1 + (best_line_y2 - best_line_y1) * i / dx);
                        
                        hex_matrix[y][x] = "$";
                    }
                }
                else {
                    // Y is dominant
                    for (let i = 0; i < dy; i ++) {
                        let y = best_line_y1 + i * sy;
                        let x = Math.floor(.5 + p1x + (best_line_x2 - best_line_x1) * i / dy);
                        
                        hex_matrix[y][x] = "$";
                    }
                }
            }
            else if (best_rect_area > best_tri_area) {
                objects.push({"RECT": [best_rect_x, best_rect_y, best_rect_w, best_rect_h]});
                quantity -= best_rect_area;

                for (let sy = best_rect_y; sy < best_rect_y + best_rect_h; sy ++) {
                    for (let sx = best_rect_x; sx < best_rect_x + best_rect_w; sx ++) {
                        hex_matrix[sy][sx] = "$";
                    }
                }
            }
            else {
                objects.push({"TRI": [best_tri_1_x, best_tri_1_y, best_tri_2_x, best_tri_2_y, best_tri_3_x, best_tri_3_y]});
                quantity -= best_tri_area;

                let area = edge(best_tri_1_x, best_tri_1_y, best_tri_2_x, best_tri_2_y, best_tri_3_x, best_tri_3_y);
                        
                for (let sy = Math.min(best_tri_1_y, best_tri_2_y, best_tri_3_y); sy <= Math.max(best_tri_1_y, best_tri_2_y, best_tri_3_y); sy ++) {
                    for (let sx = Math.min(best_tri_1_x, best_tri_2_x, best_tri_3_x); sx <= Math.max(best_tri_1_x, best_tri_2_x, best_tri_3_x); sx ++) {
                        let px = sx + .01;
                        let py = sy + 1;

                        let e0 = edge(best_tri_1_x, best_tri_1_y, best_tri_2_x, best_tri_2_y, px, py);
                        let e1 = edge(best_tri_2_x, best_tri_2_y, best_tri_3_x, best_tri_3_y, px, py);
                        let e2 = edge(best_tri_3_x, best_tri_3_y, best_tri_1_x, best_tri_1_y, px, py);

                        let inside = false;
                        
                        if (area > 0) {
                            inside = (e0 >=0 && e1 >= 0 && e2 >= 0);
                        }
                        else {
                            inside = (e0 <= 0 && e1 <= 0 && e2 <= 0);
                        }

                        if (inside) {
                            hex_matrix[sy][sx] = "$";
                        }
                    }
                }
            }

            console.log(quantity);
        }

    }
    return objects;
}