const $ = id => document.getElementById(id);

let base_data = null;
let line_data = null;

let export_data = null;

function load_to_dest(data, destination_name) {

    r = new Reader(data, 0);

    let mg = new MapGeometry(r);

    mg.render_to_image(512, $(`${destination_name}-canvas`));

    if (destination_name === 'base') {
        base_data = mg;
    }
    if (destination_name === 'line') {
        line_data = mg;
    }
}

$('base-button').addEventListener('change', () => {
    const file = $('base-button').files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
        const contents = e.target.result; // The actual text content
        load_to_dest(contents, 'base');
    };

    reader.readAsArrayBuffer(file);
});

$('line-button').addEventListener('change', () => {
    const file = $('line-button').files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
        const contents = e.target.result; // The actual text content
        load_to_dest(contents, 'line');
    };

    reader.readAsArrayBuffer(file);
});

function export_map_data() {

    export_data = new MapGeometry();

    // Paste the map geometry from the base tile.
    for (let i = 0; i < 11; i ++) {
        const base_mesh = base_data.meshes[i];
        const export_mesh = export_data.meshes[i];

        export_mesh.verts = [...base_mesh.verts];
        export_mesh.tris = [...base_mesh.tris];
    }

    for (let i = 0; i < 10; i ++) {
        const base_lines = base_data.lines[i];
        const line_lines = line_data.lines[i];
        const export_lines = export_data.lines[i];

        if ($('erase-old-lines').checked) {
            export_lines.segments = [...line_lines.segments];
        } else {
            export_lines.segments = [...base_lines.segments, ...line_lines.segments];
        }
    }

    export_data.render_to_image(512, $('export-canvas'));

    $('output-area').style.display = 'block';
}

$('convert-button').onclick = export_map_data;

$('download-button').onclick = () => {
    let w = export_data.export();
    w.download('merged.bin');
}