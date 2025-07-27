# Multi-Blog Feature Implementation Plan

This document outlines the phased approach to enable multiple blogs per user, including a user management system to control access to this premium feature.

## Phase 1: Core Multi-Blog Functionality (Technical Foundation)

**Objective:** To modify the existing application to inherently support multiple blogs per user, ensuring all data operations and API endpoints correctly handle a `blogId` distinct from the `userId`. At the end of this phase, the application will be technically capable of managing multiple blogs, but the user interface for creating/selecting multiple blogs will not yet be exposed to all users.

**Key Principle:** Every data operation related to content or products must explicitly use a `blogId` parameter.

### Tasks:

1.  **Update Firebase Service Functions:**
    *   **File:** `src/services/contentService.js`
    *   **Changes:**
        *   Modify `getUserContentRef(userId, blogId)`, `fetchContentById(userId, id, blogId)`, `getContentStats(userId, blogId)`, and `initializeContentAnalytics(userId, contentId, blogId)` to remove any default fallback for `blogId` (e.g., `blogId || userId`). The `blogId` parameter must be explicitly passed and used.
    *   **File:** `src/services/productsService.js`
    *   **Changes:**
        *   Modify `getUserProductsRef(userId, blogId)`, `fetchProductById(userId, id, blogId)`, and `getProductStats(userId, blogId)` to remove any default fallback for `blogId`. The `blogId` parameter must be explicitly passed and used.
    *   **File:** `src/services/analyticsService.js`
    *   **Changes:**
        *   Modify `trackPageView(contentId, slug, userId, blogId, userAgent, referrer)`, `trackInteraction(contentId, interactionType, userId, blogId, metadata)`, `getContentAnalytics(userId, contentId, blogId, days)`, `getSiteAnalytics(userId, blogId, days)`, and `getBackendUsage(userId, blogId)` to ensure the `blogId` parameter is used directly without defaulting to `userId`.
    *   **File:** `src/services/settingsService.js`
    *   **Changes:**
        *   Modify `getPublicCustomDomain(userId)`, `setPublicCustomDomain(userId, domain)`, `getPublicAppSettings(userId)`, and `setPublicAppSettings(userId, settings)` to accept an optional `blogId` parameter if custom domains or app settings are to be blog-specific rather than user-specific. For now, these can remain user-specific.

2.  **Update Netlify Admin Functions:**
    *   **File:** `netlify/functions/admin-content.cjs`
    *   **Changes:**
        *   Remove the line `const blogId = userId;`.
        *   Modify the `POST`, `PUT`, and `DELETE` request handling to explicitly extract `blogId` from the incoming request body (e.g., `const { id, blogId, ...updateData } = data;`).
        *   Update the Firestore collection reference (`contentRef`) to use the extracted `blogId` (e.g., `db.collection('users').doc(userId).collection('blogs').doc(blogId).collection('content');`).
        *   Ensure the `contentData` object for `POST` and `PUT` operations includes the `blogId` field.
        *   Add validation to return a 400 status if `blogId` is missing from the request body.
    *   **File:** `netlify/functions/admin-product.cjs`
    *   **Changes:**
        *   Remove the line `const blogId = userId;`.
        *   Modify the `POST`, `PUT`, and `DELETE` request handling to explicitly extract `blogId` from the incoming request body.
        *   Update the Firestore collection reference (`productsRef`) to use the extracted `blogId`.
        *   Ensure the `productData` object for `POST` and `PUT` operations includes the `blogId` field.
        *   Add validation to return a 400 status if `blogId` is missing from the request body.
    *   **File:** `netlify/functions/content-api.cjs`
    *   **Changes:**
        *   Ensure `blogId` is correctly extracted from the path or query parameters and used in the Firestore query.
        *   Update `getContentUrl` to correctly use the `blogId` parameter.
    *   **File:** `netlify/functions/product-api.cjs`
    *   **Changes:**
        *   Ensure `blogId` is correctly extracted from the path or query parameters and used in the Firestore query.

3.  **Introduce `activeBlogId` in Dashboard Context:**
    *   **File:** `src/components/layout/DashboardPage.jsx`
    *   **Changes:**
        *   Import `useAuth`.
        *   Introduce a new state variable `activeBlogId` (e.g., `const [activeBlogId, setActiveBlogId] = useState(currentUser?.uid);`). Initially, this can default to the `userId` to maintain current behavior for single-blog users.
        *   Pass `activeBlogId` as a prop to all nested `Route` components that render dashboard pages (e.g., `<OverviewPage activeBlogId={activeBlogId} />`).

4.  **Update UI Components to Pass and Use `activeBlogId`:**
    *   **Files:**
        *   `src/features/dashboard/overview/OverviewPage.jsx`
        *   `src/features/dashboard/manage-content/ManageContentPage.jsx`
        *   `src/features/dashboard/create-content/CreateContentPage.jsx`
        *   `src/features/dashboard/manage-products/ManageProductsPage.jsx`
        *   `src/features/dashboard/create-product/CreateProductPage.jsx`
        *   `src/features/dashboard/analytics/AnalyticsPage.jsx`
        *   `src/features/dashboard/documentation/DocumentationPage.jsx`
    *   **Changes:**
        *   For each of these components, accept `activeBlogId` as a prop.
        *   Modify all calls to Firebase service functions (e.g., `useContent`, `useProducts`, `contentService`, `productsService`, `analyticsService`) to pass the `activeBlogId` where a `blogId` is required.
        *   For `CreateContentPage` and `CreateProductPage`, ensure the `blogId` is included in the `finalFormData` object sent to the Netlify admin functions.
        *   Update any hardcoded `currentUser?.uid` references for `blogId` in API endpoint URLs (e.g., in `OverviewPage` and `DocumentationPage`) to use `activeBlogId`.

5.  **Update Preview Pages (Verification):**
    *   **Files:** `src/preview/ContentPreviewPage.jsx`, `src/preview/ProductPreviewPage.jsx`
    *   **Changes:** Verify that these pages correctly extract `uid` and `blogId` from `useParams()` and use them in their `fetch` calls. No changes are expected here as they already rely on URL parameters.

## Phase 2: User Management & Multi-Blog Access Control (Premium Feature)

**Objective:** To implement an administrative interface and underlying logic that allows specific users to be granted "multi-blog" capabilities, enabling them to create and manage more than one blog.

### Tasks:

1.  **Extend User Data Model:**
    *   **Firebase Firestore:** Add a new field to the user's document (e.g., `users/{userId}/userSettings/preferences` or a new `users/{userId}/profile` document) to store a boolean flag like `canManageMultipleBlogs: true` or an array of `blogIds` they own.
    *   **Firebase Security Rules:** Update Firestore rules to allow administrators to modify this field.

2.  **Create Admin User Management Page:**
    *   **New Component:** `src/features/dashboard/admin/UserManagementPage.jsx`
    *   **Functionality:**
        *   Display a list of all users (requires a new Firebase function or service to fetch user list, as client-side Firebase SDK cannot list all users directly).
        *   For each user, show their email, UID, and current `canManageMultipleBlogs` status.
        *   Provide a toggle or button to change the `canManageMultipleBlogs` status for a user.
        *   Implement a Netlify function (`/.netlify/functions/admin-users`) that can be called by an authenticated administrator to update a user's `canManageMultipleBlogs` status in Firestore. This function will require Firebase Admin SDK for user management.

3.  **Integrate Admin Page into Dashboard:**
    *   **File:** `src/components/layout/DashboardPage.jsx`
    *   **Changes:** Add a new `Route` for the `UserManagementPage`.
    *   **File:** `src/components/layout/Sidebar.jsx`
    *   **Changes:** Add a new navigation link to the `UserManagementPage`, visible only to users with an "admin" role (requires implementing role-based access control).

4.  **Implement Role-Based Access Control (RBAC):**
    *   **Firebase Firestore:** Add a `role` field (e.g., `admin`, `user`) to user documents.
    *   **Firebase Security Rules:** Update rules to restrict access to the `admin-users` Netlify function and the `UserManagementPage` data based on the user's `role`.
    *   **Frontend:** Modify `ProtectedRoute.jsx` or similar logic to check for the `admin` role before rendering the `UserManagementPage` link or component.

5.  **Develop Blog Creation/Selection UI for Multi-Blog Users:**
    *   **New Component:** `src/components/shared/BlogSelector.jsx`
    *   **Functionality:**
        *   For users with `canManageMultipleBlogs: true`, display a dropdown or modal to select the `activeBlogId`.
        *   Provide an option to "Create New Blog" (which would create a new `blogs/{blogId}` subcollection for the user).
        *   Update the `activeBlogId` state in `DashboardPage` based on user selection.
    *   **Integration:** Place the `BlogSelector` component prominently in the `DashboardPage` (e.g., in the header or sidebar).
    *   **Conditional Rendering:** Ensure the "Create New Blog" option is only visible if the user has the `canManageMultipleBlogs` permission and has not reached a predefined limit of blogs (if any).

6.  **Update Blog Creation Logic:**
    *   **File:** `src/features/dashboard/create-content/CreateContentPage.jsx` (and `CreateProductPage.jsx`)
    *   **Changes:** When creating new content/products, ensure the `blogId` used is the `activeBlogId` selected by the user, not just their `userId`.

## Future Considerations:

*   **Blog Naming/Metadata:** Allow users to name their blogs and add other metadata (e.g., description, custom domain per blog).
*   **Blog Deletion:** Implement functionality for users to delete their blogs (and all associated content/products).
*   **Blog Limits:** Enforce limits on the number of blogs a premium user can create.
*   **Subscription Management:** Integrate with a payment gateway (e.g., Stripe) to manage premium subscriptions and automatically update `canManageMultipleBlogs` status.