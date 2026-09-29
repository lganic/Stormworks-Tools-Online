// Logic for the base index.html page.

'use strict';

const $ = id => document.getElementById(id);


function update_tools() {

    fetch("data/tools.json")
        .then(response => response.json())
        .then(data => {
    
            const tools_div = $('tools');
    
            tools_div.innerHTML = ''; // Clear the existing div.
    
            let started = false;

            for (const [category, items] of Object.entries(data)) {
    
                if (started) tools_div.append(document.createElement('hr'));

                started = true;

                let h_element = document.createElement('h2');
                h_element.innerText = category;

                tools_div.appendChild(h_element);
    
                let grid = document.createElement('div');
                grid.classList.add('grid');
                grid.style.margin = '16px';
    
                let grid_sizer = document.createElement('div');
                grid_sizer.classList.add('grid-sizer');
                grid.appendChild(grid_sizer);
    
                for (const item of items) {
    
                    let wrapper_element = document.createElement('a');
                    wrapper_element.href = item.path;

                    let grid_element = document.createElement('div');
                    grid_element.classList.add('grid-item');
                    grid_element.classList.add('item_css');
    
                    let img_element = document.createElement('img');
                    img_element.src = `${item.path}/${item.image}`;
    
                    let h3_element = document.createElement('h3');
                    h3_element.innerText = item.name;

                    wrapper_element.appendChild(img_element);
                    wrapper_element.appendChild(h3_element);

                    grid_element.appendChild(wrapper_element);

                    grid.appendChild(grid_element);
                }
    
                tools_div.appendChild(grid);
            }

            const grids = document.querySelectorAll('.grid');

            grids.forEach(grid => {

                const images = [...grid.querySelectorAll('img')];

                Promise.all(
                    images.map(img => {
                        if (img.complete) {
                            return Promise.resolve();
                        }

                        return new Promise(resolve => {
                            img.addEventListener('load', resolve);
                            img.addEventListener('error', resolve);
                        });
                    })
                ).then(() => {
                    new Masonry(grid, {
                        itemSelector: '.grid-item',
                        columnWidth: 300,
                        gutter: 16
                    });
                });

            });
    
        });
}

update_tools();