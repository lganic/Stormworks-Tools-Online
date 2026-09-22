function getRandomIntInclusive(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1)) + minCeiled; 
}

function dist3d(c1, c2) {
    return Math.sqrt(Math.pow(c1[0] - c2[0], 2) + Math.pow(c1[1] - c2[1], 2) + Math.pow(c1[2] - c2[2], 2));
}

function rcc(val) {
    // Round and clamp value.
    return Math.min(255, Math.max(0, Math.round(val)));
}

function quantize(canvas, depth){

    // This is a bit of a naive approach. I am simply going to have the depth be the number of centroids for now.
    // Then we are going to just do a k-means clustering.

    let pixels = [];

    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    let p_index = 0;

    for (let y = 0; y < canvas.height; y ++ ) {
        for (let x = 0; x < canvas.width; x ++ ) {

            const pixel = [
                imageData.data[p_index],
                imageData.data[p_index + 1],
                imageData.data[p_index + 2]
            ];
            p_index += 4;

            pixels.push(pixel);
        }   
    }

    //https://en.wikipedia.org/wiki/K-means%2B%2B

    let centroids = [];

    // First centroid is just a random point.
    centroids.push(pixels[getRandomIntInclusive(0, pixels.length - 1)]);

    // Choose remaining k - 1 centroids.
    while (centroids.length < depth) {

        let distancesSquared = [];
        let total = 0;
        
        // For each point, compute squared distance to nearest selected centroid
        for (let i = 0; i < pixels.length; i ++) {
            let point = pixels[i];
            let minDistance = dist3d(point, centroids[0]);

            for (let j = 1; j < centroids.length; j ++) {
                minDistance = Math.min(minDistance, dist3d(point, centroids[j]));
            }

            let dsquare = minDistance * minDistance

            distancesSquared.push(dsquare);
            total += dsquare;
        }

        // Choose next centroid with probability proportional to D(x)^2
        let threshold = Math.random() * total; // random number from 0 to total
        let cumulative = 0;

        for (let i = 0; i < pixels.length;  i ++) {
            cumulative = cumulative + distancesSquared[i];
            if (cumulative >= threshold) {
                centroids.push(pixels[i]);
                break;
            }
        }
    }

    // Centroids defined. Run K-Means.
    let changed = true;

    let old_classifications = [];

    while (changed) { // This is safe. K-means guaranteed to converge.

        changed = false;

        let classifications = [];

        for (let i = 0; i < pixels.length; i ++) {

            let point = pixels[i];

            let best_class = 0;
            let best_dist = dist3d(centroids[0], point);

            for (j = 1; j < centroids.length; j ++) {

                let this_dist = dist3d(centroids[j], point);

                if (this_dist < best_dist) {
                    best_class = j;
                    best_dist = this_dist;
                }
            }

            classifications.push(best_class);
        }

        // Points classified. Adjust centroids.

        for (let j = 0; j < centroids.length; j ++) {
            let r_tot = 0;
            let g_tot = 0;
            let b_tot = 0;

            let tot = 0;

            for (let i = 0; i < pixels.length; i ++){
                if (classifications[i] != j) continue;

                let point = pixels[i];
                r_tot += point[0];
                g_tot += point[1];
                b_tot += point[2];
                tot += 1
            }

            centroids[j] = [r_tot / tot, g_tot / tot, b_tot / tot];
        }

        if (classifications.length != old_classifications.length) {
            old_classifications = [...classifications]; // copy
            continue
        }

        for (i = 0; i < classifications.length; i ++) {
            if (classifications[i] != old_classifications[i]) {
                changed = true;
                break;
            }
        }

        old_classifications = [...classifications]; // copy.
    }

    // Round the centroids, and clamp to the right color range.
    for (let j = 0; j < centroids.length; j ++) {
        const centroid = centroids[j];

        centroids[j] = [rcc(centroid[0]), rcc(centroid[1]), rcc(centroid[2])];
    }

    // okay lets just apply this directly to the canvas. 

    // Loop over classification, lookup centroid. Keep alpha untouched.
    p_index = 0;
    for (i = 0; i < old_classifications.length; i ++) {

        let centroid = centroids[old_classifications[i]];

        imageData.data[p_index] = centroid[0];
        imageData.data[p_index + 1] = centroid[1];
        imageData.data[p_index + 2] = centroid[2];

        p_index += 4;
    }

    ctx.putImageData(imageData, 0, 0);
}