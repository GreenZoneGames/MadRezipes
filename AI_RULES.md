# AI Rules for MadRezipes Application

This document outlines the core technologies used in the MadRezipes application and provides guidelines for using specific libraries.

## Tech Stack Overview

*   **React with TypeScript**: The application is built using React for the user interface, with TypeScript for type safety and improved code quality.
*   **Vite**: Used as the build tool, providing a fast development experience and optimized production builds.
*   **Tailwind CSS**: A utility-first CSS framework is used for all styling, ensuring a consistent and highly customizable design. This includes `tailwindcss-animate` for animations and `@tailwindcss/typography` for rich text.
*   **Shadcn/ui & Radix UI**: These libraries provide a collection of accessible and customizable UI components, forming the foundation of the application's visual elements.
*   **React Router**: Manages client-side routing, defining navigation paths and rendering components based on the URL.
*   **Supabase**: Serves as the backend-as-a-service, handling authentication, database operations, and serverless functions.
*   **TanStack Query (React Query)**: Used for efficient data fetching, caching, synchronization, and managing server state.
*   **Lucide React**: Provides a comprehensive set of customizable SVG icons used throughout the application.
*   **Next-themes**: Manages the application's theme (light/dark mode) preferences.
*   **JSPDF**: Enables client-side generation of PDF documents, such as shopping lists and meal calendars.
*   **React Hook Form & Zod**: Utilized for robust form management and validation, ensuring data integrity.

## Library Usage Rules

To maintain consistency, readability, and best practices, please adhere to the following rules when developing:

*   **UI Components**:
    *   Always prioritize using components from `shadcn/ui` (e.g., `Button`, `Input`, `Card`, `Dialog`, `Select`, `Toast`).
    *   If a required component is not available in `shadcn/ui` or needs significant custom functionality, create a **new component file** in `src/components/`. **Do NOT modify existing `shadcn/ui` component files.**
    *   All new components should be styled exclusively with **Tailwind CSS**.

*   **Styling**:
    *   All component styling must be done using **Tailwind CSS classes**. Avoid writing raw CSS in `.css` files for component-specific styles. Global styles are managed in `src/index.css`.

*   **Routing**:
    *   Use `react-router-dom` for all client-side navigation.
    *   Define and manage the main application routes within `src/App.tsx`.

*   **Backend Interactions**:
    *   All authentication, database queries, and interactions with server-side logic must be performed using the **Supabase client** (`@supabase/supabase-js`).

*   **Data Fetching & State Management**:
    *   For fetching, caching, and managing server-side data, use **TanStack Query** (`@tanstack/react-query`).

*   **Icons**:
    *   All icons used in the application should come from the **Lucide React** library.

*   **Forms and Validation**:
    *   Implement forms using `react-hook-form`.
    *   Use `zod` for schema-based form validation.

*   **Toasts/Notifications**:
    *   For general, non-blocking notifications (e.g., "Recipe Added!", "Friend Request Sent"), use `sonner`.
    *   For more interactive or UI-specific toasts (e.g., form submission feedback), use the `useToast` hook from `@/components/ui/use-toast` (which is built on Radix UI Toast).

*   **Theme Management**:
    *   The application's theme (light/dark mode) is managed by `next-themes` via the `ThemeProvider` component.

*   **PDF Generation**:
    *   Use the `jspdf` library for any client-side PDF generation requirements.

*   **Utility Functions**:
    *   Use `clsx` and `tailwind-merge` for conditionally applying and merging Tailwind CSS classes.

*   **File Structure**:
    *   Place all source code within the `src` folder.
    *   Pages should reside in `src/pages/`.
    *   Components should reside in `src/components/`.
    *   Every new component or hook, no matter how small, should be created in its own dedicated file.