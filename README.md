# Stormworks-Tools-Online

A collection of online tools for Stormworks, providing various utilities for creators and players.

## Current Tools

- **Circle/Ellipse Generator:** Create circles and ellipses for your creations.
- **Flag Editor:** Import, design, and export custom flags.
- **Sign Editor:** Import, design, and export custom signs.

## Installation

The site is hosted here [stormworks-tools.com](https://stormworks-tools.com).

This project is designed to run only on the client side, for security and simplicity. 

For local development or running the tools offline:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/lganic/Stormworks-Tools-Online.git
    cd Stormworks-Tools-Online
    ```

2.  **Generate `tools.json`:**
    Run the Python script to create the tool index file.
    ```bash
    python util/tools_gen.py
    ```

3.  **Serve the files:**
    You can then serve the files using a simple HTTP server (e.g., Python's `http.server`):
    ```bash
    python -m http.server
    ```
    Or configure a web server like Nginx or Apache to serve the static files.

## Contributing

Contributions are welcome! Please follow these guidelines:

1.  **Fork the repository** and create your branch: `git checkout -b feature/your-feature`.
2.  **Make your changes** and commit them: `git commit -m 'Add some feature'`.
3.  **Push to the branch**: `git push origin feature/your-feature`.
4.  **Open a Pull Request**.

This project is licensed under the **MIT License**. See the `LICENSE` file for more details.

Built with ❤️ by the Stormworks community. 

Fork this project, star it on GitHub ⭐, or [report any issues](https://github.com/lganic/Stormworks-Tools-Online/issues) if you encounter any problems!