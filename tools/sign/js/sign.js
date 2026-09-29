function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function valToBytes2(val) {
    if (val < 0 || val > 255) {
        throw new Error("val must be between 0 and 255");
    }

    return val.toString(16).padStart(2, '0');
}

function toStringColor(color) {
    color = color.slice(0, 3);

    if (color[0] === 255 && color[1] === 255 && color[2] === 255) {
        return 'x';
    }

    let outputString = color.map(val => valToBytes2(val)).join('');

    for (let i = 0; i < 3; i++) {
        if (outputString.startsWith('00')) {
            outputString = outputString.slice(2);
        } else {
            break;
        }
    }

    return outputString;
}

function toPosition(x, y) {
    if (x === 0 && y === 0) {
        return "";
    }

    let x_str = "";
    let y_str = "";
    if (x !== 0) x_str = `x="${x}" `;
    if (y !== 0) y_str = `z="${y}" `;

    return `<vp ${x_str}${y_str} />`;
}

function create_and_download_sign(pixels, filename, use_indicator) {

    const x_tiles = $('sign-width').value;
    const y_tiles = $('sign-height').value;

    const width = x_tiles * 9;
    const height = y_tiles * 9;

    let sign_string = 'sign_na';
    if (use_indicator) sign_string = 'sign';


    let output = '<?xml version="1.0" encoding="UTF-8"?><vehicle data_version="3" bodies_id="2"><authors /><bodies><body unique_id="2"><components>';

    // Loop over each tile.
    for (let y_tile = 0; y_tile < y_tiles; y_tile ++) {
        for (let x_tile = 0; x_tile < x_tiles; x_tile++) {

            // Add some boilerplate.
            output += `<c d="${sign_string}"><o r="1,,,,1,,,,1" sc="6" gc="`

            let started = false;

            // Loop over each pixel, of each tile.
            for (let y_pixel = 0; y_pixel < 9; y_pixel ++) {
                for (let x_pixel = 0; x_pixel < 9; x_pixel ++) {

                    if (started) output += ',';
                    started = true;

                    // Calculate the buffer start coordinate.
                    let x_absolute = width - (9 * x_tile + x_pixel) - 1;
                    let y_absolute = 9 * y_tile + y_pixel;
                    let b_p = 4 * (y_absolute * width + x_absolute);

                    output += toStringColor([
                        pixels[b_p],
                        pixels[b_p + 1],
                        pixels[b_p + 2],
                    ]);
                }
            }

            // Finish gc data
            output += '"';

            if (use_indicator){
                output += 'gca=",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,"'
            }

            // Finish o group data.
            output += '>';

            // Center tile, and add position
            output += toPosition(x_tile - Math.floor(x_tiles / 2), y_tile - Math.floor(y_tiles / 2));

            // Finish up object boilerplate
            // output += '<logic_slots><slot /></logic_slots></o></c>';
            output += '</o></c>';
        }
    }

    output += '</components></body></bodies><logic_node_links /></vehicle>';

    download(filename, output);
};
