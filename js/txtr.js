function convert_to_txtr_and_download(canvas, filename) {

// struct Txtr {
//     char name[4];
//     u32 flag;
//     u32 format;
//     u8 pad;
//     u16 height;
//     u16 width;
//     u16 mipmapcount;
//     u32 unknown;
    
//     u32 RGBA[width * height];
    
//     u16 padding_zero;

// };

    // Calculate the total file size.
    const header_size = 23;
    const padding_size = 2;

    const width = canvas.width;
    const height = canvas.height;

    const data_size = width * height * 4;

    const file_size = header_size + data_size + padding_size;

    const buffer = new ArrayBuffer(file_size);
    const view = new DataView(buffer);

    // Write the "TXTR" header
    view.setUint8(0, 0x54);
    view.setUint8(1, 0x58);
    view.setUint8(2, 0x54);
    view.setUint8(3, 0x52);

    // Set the file flag.
    view.setUint32(4, 3, true); 

    // Set the file format.
    view.setUint32(8, 2, true);

    // set the height and width
    view.setUint16(13, height, true);
    view.setUint16(15, width, true);

    // Mip map stuff. (No clue what this does yet.)
    view.setUint16(17, 1, true);
    view.setUint32(19, 4194304, true);

    // Now we need to loop over the image array, and write out the data.
    // We need to start from the bottom up. To do this, we will keep two 
    // seperate pointers, one to the index in the canvas data, the other to the file.

    let file_pointer = 23; // Starting at the front of the file.
    let image_pointer = width * (height - 1) * 4; // Starting at the start of the last row.

    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    for (let y = height - 1; y >= 0; y --) {
        for (let pixel_channel = 0; pixel_channel < width * 4; pixel_channel ++) {

            // Loop over one row.
            view.setUint8(file_pointer, imageData.data[image_pointer]);

            file_pointer ++;
            image_pointer ++;
        }

        // Image pointer now points to the end of the row one row ahead
        // so we decrement by two rows to put it at the start of the right row

        image_pointer -= 2 * width * 4;
    }

    const blob = new Blob([buffer], {
        type: "application/octet-stream"
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}