

# idic-facial-emotion-detector

Brief project description goes here.

## Table of Contents

- [Project Overview](#project-overview)
- [Demo](#demo)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
- [Folder Structure](#folder-structure)
- [License](#license)

## Project Overview

This web application is designed to record your level of focus on tasks and possible distractions in your environment as you go about your daily activities. This data is securely stored in our remote database and associated with your Google user ID.

## Demo

| ![Image 1](images/Screenshot%202023-10-02%20at%209.34.50 AM.png) | ![Image 2](images/Screenshot%202023-10-02%20at%209.35.55 AM.png) |
|:-----------------------:|:-----------------------:|
|   *Login*    |   *emotion and focus detection*    |


## Getting Started

Explain how to get the project up and running on a local machine.

### Prerequisites

List any software or tools that need to be installed before running the project. Include versions if necessary.

```
- Node.js (v14 or higher)
- npm (v6 or higher)
```

### Installation

1. Clone the repository to your local machine:

```bash
git clone https://github.com/ulima-ailab/idic-facial-emotion-detector
```

2. Navigate to the project directory:

```bash
cd idic-facial-emotion-detector
```

3. Install project dependencies:

```bash
npm install
```

4. Start the development server:

```bash
npm start
```

## Usage

Provide instructions on how to use the project. Include code examples or screenshots if it's helpful.

## Folder Structure

Explain the organization of your project's directories and key files.

```
├── node_modules/        # Dependencies and packages installed by npm or yarn
├── public/              # Public assets and HTML template
│   ├── index.html       # HTML entry point for your app
│   ├── favicon.ico      # Favicon icon (replace with your own)
│   ├── models/          # Model for face detection

│   └── ...              # Other static assets (e.g., images, fonts)
├── src/                 # Source code for your React application
│   ├── components/      # React components
│   │   ├── App.js       # Main application component
│   │   └── ...
│   ├── App.css          # CSS styles for the main application
│   ├── index.js         # JavaScript entry point for the React app
│   ├── index.css        # Global CSS styles
│   ├── serviceWorker.js # Optional service worker for progressive web apps
│   └── ...
├── package.json         # Project configuration, including dependencies
├── package-lock.json    # Version locking for project dependencies
├── README.md            # Project documentation
└── ...                  # Other configuration files and directories
```


## License

<!-- This project is licensed under the [License Name] License - see the [LICENSE.md](LICENSE.md) file for details. -->

## Acknowledgments

### Packages Used

- **@mediapipe/tasks-vision** (Version: ^0.10.6)
  - *Description*: This package is used for proces a video to get focus level in your project.

- **@testing-library/jest-dom** (Version: ^5.16.5)
  - *Description*: This package is used for Jest DOM testing in your project.

- **@testing-library/react** (Version: ^13.4.0)
  - *Description*: This package is used for React testing using the Testing Library.

- **@testing-library/user-event** (Version: ^13.5.0)
  - *Description*: This package provides user interaction utilities for React testing.

- **face-api.js** (Version: ^0.22.2)
  - *Description*: Describe what functionality or features this package provides related to face recognition or processing.

- **firebase** (Version: ^9.23.0)
  - *Description*: Firebase is used for [briefly explain how Firebase is used in your project, e.g., authentication, database, hosting, etc.].

- **react** (Version: ^18.2.0)
  - *Description*: React is the core library used for building the user interface of your application.

- **react-dom** (Version: ^18.2.0)
  - *Description*: React DOM is used for rendering React components in the browser.

- **react-router** (Version: ^6.13.0)
  - *Description*: React Router is used for handling routing in your application.

- **react-router-dom** (Version: ^6.13.0)
  - *Description*: React Router DOM provides the binding for React Router in a web application.

- **react-scripts** (Version: 5.0.1)
  - *Description*: React Scripts is used for various scripts to start, build, test, and eject the React application.

- **web-vitals** (Version: ^2.1.4)
  - *Description*: Web Vitals is used for measuring the performance of your web application.



Replace the placeholders (e.g., `Project Name`, `Brief project description goes here`, etc.) with your specific project information. This README template should serve as a starting point to document your React.js project effectively.

# Creación de Reconocimiento Facial en Tiempo Real con JavaScript
Hacemos una aplicación de reconocimiento facial usando la librería [face-api](https://github.com/justadudewhohacks/face-api.js/)

## Tutorial de cómo crearlo
1. [Vídeo de Youtube](https://youtu.be/XJRL4XFJ9d8)
2. [Explicación Blog](https://urimarti.com/frontend/creacion-de-reconocimiento-facial-en-tiempo-real/)
