# New Improvement Plan

This plan outlines a phased approach to enhance the Admin CMS, focusing on mobile responsiveness, spacing consistency, and adding missing functionalities.

## Phase 1: Foundational Improvements

This phase addresses critical and high-impact areas to stabilize the application and improve core user experience.

1.  **Enhance Mobile Sidebar Behavior:**
    *   **File:** `src/components/layout/DashboardPage.jsx`, `src/index.css`
    *   **Description:** Implement a mechanism to prevent body scrolling when the mobile sidebar is open, ensuring a single scrollbar experience. This typically involves adding/removing an `overflow: hidden` class to the `body` element.

2.  **Implement Comprehensive Form Validation:**
    *   **Files:** `src/features/dashboard/create-content/CreateContentPage.jsx`, `src/features/dashboard/create-product/CreateProductPage.jsx`, `src/features/auth/LoginPage.jsx`, `src/features/dashboard/admin/UserManagementPage.jsx` (UserEditForm)
    *   **Description:** Review and strengthen client-side form validation for all input fields, providing clear and immediate feedback to the user. Ensure all required fields are properly validated.

3.  **Strengthen Backend Input Validation:**
    *   **Files:** `netlify/functions/admin-content.cjs`, `netlify/functions/admin-product.cjs`, `netlify/functions/admin-blog.cjs`, `netlify/functions/admin-users.cjs`, `netlify/functions/import-content.cjs`, `netlify/functions/import-products.cjs`
    *   **Description:** Add robust server-side input validation for all incoming data to prevent invalid data from being processed and stored. This includes type checking, range validation, and format validation.

4.  **Implement User Registration and Password Reset:**
    *   **Files:** `src/features/auth/LoginPage.jsx` (and potentially new files for registration/reset forms), Firebase Authentication setup.
    *   **Description:** Add a user registration flow to allow new users to sign up. Implement a "Forgot Password" feature to enable users to reset their passwords.

5.  **Add User Deletion Functionality (Admin):**
    *   **Files:** `src/features/dashboard/admin/UserManagementPage.jsx`, `netlify/functions/admin-users.cjs`
    *   **Description:** Implement the ability for admin users to delete other user accounts, including associated data in Firestore and Storage. This will require adding a DELETE method to the `admin-users.cjs` Netlify Function.

6.  **Improve DataTable Mobile Experience:**
    *   **File:** `src/components/shared/DataTable.jsx`
    *   **Description:** For smaller screens, consider implementing a "cards" view where each row transforms into a vertical layout, or provide options to hide less critical columns to improve readability.

7.  **Refine Spacing Consistency:**
    *   **Files:** `src/index.css`, `tailwind.config.js` (and various component files)
    *   **Description:** Audit all custom CSS spacing values in `src/index.css` and align them with Tailwind's utility classes or define them within `tailwind.config.js` to ensure a unified spacing system. Review vertical rhythm across the application.

## Phase 2: Advanced Enhancements

This phase focuses on enriching the application's features, improving user experience, and optimizing performance.

1.  **Implement Advanced Filtering and Sorting for Data Tables:**
    *   **Files:** `src/components/shared/DataTable.jsx`, `src/features/dashboard/manage-content/ManageContentPage.jsx`, `src/features/dashboard/manage-products/ManageProductsPage.jsx`
    *   **Description:** Add advanced filtering options (e.g., by category, tag, status, date range) and more sophisticated sorting capabilities to the content and product management tables.

2.  **Enhance Analytics Visualizations:**
    *   **File:** `src/features/dashboard/analytics/AnalyticsPage.jsx`
    *   **Description:** Integrate charting libraries (e.g., Chart.js, Recharts) to visualize analytics data (e.g., line graphs for daily views, pie charts for traffic sources) for better insights.

3.  **Expand File Storage Management:**
    *   **File:** `src/features/dashboard/storage/FileStoragePage.jsx`
    *   **Description:** Add functionalities to create new folders, rename files/folders, and move files between folders within the file storage interface.

4.  **Implement Bulk Actions for Content and Products:**
    *   **Files:** `src/features/dashboard/manage-content/ManageContentPage.jsx`, `src/features/dashboard/manage-products/ManageProductsPage.jsx`, `netlify/functions/admin-content.cjs`, `netlify/functions/admin-product.cjs`
    *   **Description:** Add bulk delete, bulk publish, and bulk unpublish actions for selected content and product items. This will require modifications to both frontend and backend functions.

5.  **Enhance Public API with Query Parameters:**
    *   **Files:** `netlify/functions/content-api.cjs`, `netlify/functions/product-api.cjs`
    *   **Description:** Implement query parameters for filtering (e.g., by category, tag, status), pagination (limit, offset), and sorting (by date, title) for the public content and product APIs.

6.  **Implement API Rate Limiting:**
    *   **Files:** `netlify/functions/content-api.cjs`, `netlify/functions/product-api.cjs`
    *   **Description:** Add basic rate limiting to public API endpoints to prevent abuse and ensure fair usage.

7.  **Improve User Profile Editing:**
    *   **File:** `src/features/dashboard/settings/AccountSettingsPage.jsx`
    *   **Description:** Allow users to update their display name and potentially other profile information (excluding email/password, which would require separate flows).

8.  **Optimize Image Loading and Display:**
    *   **Files:** `src/components/shared/ImageUploader.jsx`, `src/preview/ContentPreviewPage.jsx`, `src/preview/ProductPreviewPage.jsx`
    *   **Description:** Implement lazy loading for images in preview pages and galleries. Ensure images are displayed efficiently to minimize load times.
