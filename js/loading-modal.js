let loadingModal = null;

function start_loading_modal(title, tasks) {
    // Remove an existing modal if one somehow exists
    if (loadingModal) {
        close_loading_modal();
    }

    const overlay = document.createElement("div");
    overlay.className = "loading-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "loading-modal";

    const heading = document.createElement("h2");
    heading.textContent = title;

    const loadingGif = document.createElement("img");
    loadingGif.className = "loading-modal-gif";
    loadingGif.src = "/loading.gif";
    loadingGif.alt = "Loading";

    loadingGif.style.height = "500px";
    loadingGif.style.width = "500px";

    const taskContainer = document.createElement("div");
    taskContainer.className = "loading-modal-tasks";

    // Map lets us find a task immediately by name
    const taskElements = new Map();

    for (const task of tasks) {
        const taskElement = document.createElement("div");
        taskElement.className = "loading-modal-task";

        const icon = document.createElement("span");
        icon.className = "loading-modal-task-icon";
        icon.textContent = "○";

        const text = document.createElement("span");
        text.textContent = task;

        taskElement.append(icon, text);
        taskContainer.appendChild(taskElement);

        taskElements.set(task, {
            element: taskElement,
            icon: icon
        });
    }

    modal.append(
        heading,
        loadingGif,
        taskContainer
    );

    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    loadingModal = {
        overlay,
        modal,
        heading,
        taskElements
    };
}


function update_loading_modal(task) {
    if (!loadingModal) {
        console.warn("No loading modal is currently open.");
        return;
    }

    const taskData = loadingModal.taskElements.get(task);

    if (!taskData) {
        console.warn(`Loading modal task "${task}" does not exist.`);
        return;
    }

    taskData.element.classList.remove("failed");
    taskData.element.classList.add("complete");

    taskData.icon.textContent = "✓";
}


function fail_loading_modal(task) {
    if (!loadingModal) {
        return;
    }

    const taskData = loadingModal.taskElements.get(task);

    if (!taskData) {
        console.warn(`Loading modal task "${task}" does not exist.`);
        return;
    }

    taskData.element.classList.remove("complete");
    taskData.element.classList.add("failed");

    taskData.icon.textContent = "✕";
}


function close_loading_modal() {
    if (!loadingModal) {
        return;
    }

    loadingModal.overlay.remove();
    loadingModal = null;
}