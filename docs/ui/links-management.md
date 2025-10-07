# Links Management Feature

## Overview

Complete CRUD (Create, Read, Update, Delete) interface for managing shortened links with search, filters, and bulk actions.

## Page

### Links Management Page

**Location:** `src/app/dashboard/links/page.tsx`

**Route:** `/dashboard/links`

**Features:**

- Full links table with all link details
- Search functionality
- Status filtering (All/Active/Inactive)
- Quick stats summary
- Create new link dialog
- Edit link dialog
- Delete confirmation
- Responsive layout

---

## Components

### 1. Links Table

**Location:** `src/components/links/links-table.tsx`

**Purpose:** Display all links with actions and information

**Props:**

```typescript
{
  links: Link[];
}

interface Link {
  id: string;
  shortCode: string;
  originalUrl: string;
  title?: string | null;
  clicks: number;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string | null;
}
```

**Features:**

- **Table Columns:**
  - Short Link (with copy button)
  - Destination (title + URL)
  - Clicks (with chart icon)
  - Status badge (Active/Inactive/Expired)
  - Created date
  - Actions dropdown

- **Link Actions:**
  - Visit Link (opens in new tab)
  - View Analytics
  - Generate QR Code
  - Edit
  - Toggle Active/Inactive
  - Delete (with confirmation)

- **Visual Indicators:**
  - Expiration date display
  - Expired status in red
  - Active/Inactive badges
  - Truncated long URLs with title

- **Empty State:**
  - Shows when no links match filters
  - Helpful message with suggestions

**User Interactions:**

- Click copy icon → Copy link to clipboard
- Click row actions → Open dropdown menu
- Select delete → Open confirmation dialog
- Select edit → Open edit dialog

---

### 2. Create Link Dialog

**Location:** `src/components/links/create-link-dialog.tsx`

**Purpose:** Modal dialog for creating new links

**Props:**

```typescript
{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**Form Fields:**

1. **Destination URL** (required)
   - Full URL validation
   - Placeholder: "https://example.com/very-long-url"

2. **Custom Short Code** (optional)
   - Alphanumeric, hyphens, underscores only
   - Random generator button
   - Auto-generated if left blank

3. **Title** (optional)
   - Friendly name for identification
   - Placeholder: "My Campaign Link"

4. **Expiration Date** (optional)
   - DateTime picker (native HTML5)
   - Auto-deactivates after date

5. **Active Toggle** (default: true)
   - Switch component
   - Controls immediate activation

**Validation:**

```typescript
{
  originalUrl: z.string().url('Please enter a valid URL'),
  shortCode: z.string()
    .optional()
    .refine((val) => !val || /^[a-zA-Z0-9_-]+$/.test(val), {
      message: 'Only letters, numbers, hyphens and underscores allowed'
    }),
  title: z.string().optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean().default(true)
}
```

**Features:**

- Random code generator (sparkles button)
- Real-time validation
- Loading state during submission
- Success toast notification
- Auto-close on success
- Form reset after creation

---

### 3. Edit Link Dialog

**Location:** `src/components/links/edit-link-dialog.tsx`

**Purpose:** Modal dialog for editing existing links

**Props:**

```typescript
{
  link: Link;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**Form Fields:**

1. **Short Code Display** (read-only)
   - Shows current short code
   - Cannot be changed
   - Muted background

2. **Destination URL** (required)
   - Pre-filled with current URL
   - Can be updated

3. **Title** (optional)
   - Pre-filled with current title
   - Can be updated

4. **Expiration Date** (optional)
   - Pre-filled if exists
   - Can be updated or removed

5. **Active Toggle**
   - Pre-filled with current status
   - Can be toggled

**Additional Info Display:**

- Total clicks (read-only)
- Created date (read-only)
- Link statistics summary

**Features:**

- Pre-populated with current values
- Updates on link prop change
- Validation same as create
- Loading state during save
- Success toast on update
- Auto-close on success

---

## Page Features

### Search Functionality

- Search input with icon
- Searches across:
  - Short code
  - Original URL
  - Title
- Real-time filtering
- Case-insensitive

### Status Filter

- Dropdown select
- Options:
  - All Links
  - Active Only
  - Inactive Only
- Updates table immediately

### Quick Stats Summary

Three stat cards displaying:

1. **Total Links** - Count of all links
2. **Active Links** - Count of active links
3. **Total Clicks** - Sum of all clicks

### Empty States

- **No links found:** When filters return no results
- **No links created:** When user has no links yet

---

## Link Status Logic

### Status Types

1. **Active** - Link is working and clickable
2. **Inactive** - Link is disabled by user
3. **Expired** - Link passed expiration date

### Status Priority

```
Expired (highest priority)
  ↓
Inactive
  ↓
Active (lowest priority)
```

### Badge Colors

- **Active:** Primary/Default (blue)
- **Inactive:** Secondary (gray)
- **Expired:** Destructive (red)

---

## Actions Menu

### Available Actions

1. **Visit Link**
   - Opens `/{shortCode}` in new tab
   - Icon: ExternalLink

2. **View Analytics**
   - Navigates to `/dashboard/analytics?link={shortCode}`
   - Icon: BarChart2

3. **Generate QR**
   - Navigates to `/dashboard/qr?link={shortCode}`
   - Icon: QrCode

4. **Edit** (separator)
   - Opens edit dialog
   - Icon: Pencil

5. **Toggle Status**
   - Activates/deactivates link
   - Icon: ToggleLeft/ToggleRight
   - Shows appropriate action text

6. **Delete** (separator, destructive)
   - Opens confirmation dialog
   - Icon: Trash2
   - Red text color

---

## Delete Confirmation

### Alert Dialog

- Title: "Delete Link?"
- Description: Shows shortcode and warning
- Warning: "cannot be undone and all analytics data will be lost"
- Actions:
  - Cancel (secondary)
  - Delete (destructive)

### Flow

1. User clicks delete in actions menu
2. Confirmation dialog opens
3. User confirms or cancels
4. On confirm: API call → Success toast → Table updates
5. On cancel: Dialog closes, no action

---

## Mock Data

### Sample Links (8 items)

```typescript
[
  {
    id: '1',
    shortCode: 'summer24',
    originalUrl: 'https://example.com/summer-sale-2024',
    title: 'Summer Sale Campaign',
    clicks: 342,
    isActive: true,
    createdAt: '2024-10-01T10:00:00Z',
    expiresAt: null,
  },
  // ... 7 more items
];
```

**Data includes:**

- Active and inactive links
- Links with and without titles
- Links with expiration dates
- Various click counts
- Different creation dates

---

## Responsive Design

### Breakpoints

- **Mobile (<768px):**
  - Single column layout
  - Stacked filters
  - Horizontal scroll for table
  - Full-width dialogs

- **Tablet (768px-1024px):**
  - Two-column stats
  - Side-by-side filters
  - Responsive table

- **Desktop (>1024px):**
  - Three-column stats
  - Horizontal filter bar
  - Full table display

---

## API Integration (TODO)

### Endpoints Needed

```typescript
// Get all links
GET /links?search={query}&status={filter}&page={n}&limit={n}
Response: {
  data: Link[];
  total: number;
  page: number;
  totalPages: number;
}

// Create link
POST /links
Request: CreateLinkFormValues
Response: Link

// Update link
PATCH /links/{id}
Request: EditLinkFormValues
Response: Link

// Delete link
DELETE /links/{id}
Response: { success: boolean }

// Toggle status
PATCH /links/{id}/toggle
Response: Link
```

---

## User Flows

### Create New Link

1. Click "Create Link" button
2. Dialog opens
3. Fill in destination URL (required)
4. Optionally add short code, title, expiration
5. Toggle active status if needed
6. Click "Create Link"
7. Loading state shows
8. On success: Toast + dialog closes + table updates
9. On error: Toast with error message

### Edit Existing Link

1. Click actions menu on link row
2. Select "Edit"
3. Dialog opens with pre-filled data
4. Update any fields
5. Click "Save Changes"
6. Loading state shows
7. On success: Toast + dialog closes + table updates
8. On error: Toast with error message

### Delete Link

1. Click actions menu on link row
2. Select "Delete"
3. Confirmation dialog opens
4. Read warning message
5. Click "Delete" to confirm
6. On success: Toast + table updates
7. On cancel: Dialog closes

### Search Links

1. Type in search box
2. Table filters in real-time
3. Shows matching links only
4. Empty state if no matches

### Filter by Status

1. Click status dropdown
2. Select filter option
3. Table updates immediately
4. Shows filtered links

---

## Copy to Clipboard

### Implementation

- Uses `navigator.clipboard.writeText()`
- Copies full URL: `{origin}/{shortCode}`
- Shows success toast
- Icon button next to short code

### Browser Compatibility

- Modern browsers supported
- Fallback for older browsers (optional)

---

## Icons Used (lucide-react)

- `Plus` - Create button
- `Search` - Search input
- `Filter` - Filter dropdown
- `Copy` - Copy to clipboard
- `ExternalLink` - Visit link
- `BarChart2` - Analytics
- `QrCode` - QR code generation
- `Pencil` - Edit action
- `Trash2` - Delete action
- `ToggleLeft/Right` - Status toggle
- `MoreHorizontal` - Actions menu
- `Sparkles` - Random generator

---

## Styling

### Table Design

- Bordered table
- Hover effect on rows
- Muted text for secondary info
- Primary color for short codes
- Badge colors for status
- Icon buttons for actions

### Dialog Design

- Max width: 2xl
- Scrollable content
- Form spacing: 4 (1rem)
- Footer with action buttons
- Muted background for read-only fields

### Form Inputs

- Consistent spacing
- Helper text below inputs
- Error messages inline
- Switch toggle for boolean
- Datetime picker for expiration

---

## Performance

### Optimizations

- Client-side filtering for small datasets
- Debounced search (if large dataset)
- Memoized table rows
- Virtual scrolling (future)
- Pagination (future)

### Future Improvements

- Server-side search and filtering
- Infinite scroll
- Bulk operations
- Export functionality
- Import from CSV

---

## Accessibility

### Features

- Semantic HTML table
- ARIA labels on buttons
- Keyboard navigation
- Focus indicators
- Screen reader text for icons
- Confirmation dialogs for destructive actions

### Improvements

- Keyboard shortcuts (Cmd+K search)
- Announce live region updates
- Skip to table content

---

## File Structure

```
src/app/dashboard/links/
└── page.tsx                        # Links management page

src/components/links/
├── links-table.tsx                 # Main links table
├── create-link-dialog.tsx          # Create link modal
└── edit-link-dialog.tsx            # Edit link modal
```

---

## Testing Checklist

### Links Page

- [ ] Page loads without errors
- [ ] Search filters correctly
- [ ] Status filter works
- [ ] Stats display correctly
- [ ] Create dialog opens
- [ ] Responsive on all devices

### Links Table

- [ ] All columns display
- [ ] Copy button works
- [ ] Status badges correct
- [ ] Dates format properly
- [ ] Actions menu opens
- [ ] Edit dialog opens
- [ ] Delete dialog opens
- [ ] Toggle status works
- [ ] Empty state shows
- [ ] Expired links show red

### Create Dialog

- [ ] Opens and closes properly
- [ ] All fields validate
- [ ] Random generator works
- [ ] Form submits
- [ ] Loading state shows
- [ ] Success toast appears
- [ ] Dialog closes on success
- [ ] Form resets

### Edit Dialog

- [ ] Opens with correct data
- [ ] All fields pre-filled
- [ ] Short code is read-only
- [ ] Stats display correctly
- [ ] Form validates
- [ ] Saves changes
- [ ] Loading state shows
- [ ] Success toast appears

### Delete Confirmation

- [ ] Opens with correct link
- [ ] Warning message clear
- [ ] Cancel works
- [ ] Delete confirms
- [ ] Link removed from table

---

## Future Enhancements

### Planned Features

- [ ] Bulk operations (select multiple)
- [ ] Bulk delete
- [ ] Bulk status toggle
- [ ] Export to CSV
- [ ] Import from CSV
- [ ] Link templates
- [ ] Duplicate link
- [ ] Archive instead of delete
- [ ] Restore deleted links
- [ ] Link tags/categories
- [ ] Link folders
- [ ] Advanced filters
- [ ] Sort by columns
- [ ] Pagination
- [ ] Custom columns display

### UX Improvements

- [ ] Inline editing
- [ ] Drag to reorder
- [ ] Quick QR preview
- [ ] Analytics preview on hover
- [ ] Keyboard shortcuts
- [ ] Undo delete
- [ ] Batch QR generation

---

**Created:** October 6, 2025
**Status:** ✅ Complete
**Next Feature:** Analytics
