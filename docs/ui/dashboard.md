# Dashboard Feature

## Overview

Main dashboard home page displaying key metrics, statistics, quick actions, and recent links overview.

## Page

### Dashboard Home

**Location:** `src/app/dashboard/page.tsx`

**Route:** `/dashboard`

**Features:**

- Overview statistics with trend indicators
- Quick link creation form
- Recent links table
- Responsive grid layout
- Real-time stats (mock data for now)

---

## Components

### 1. Stats Card

**Location:** `src/components/dashboard/stats-card.tsx`

**Purpose:** Display individual metric with icon, value, description, and trend

**Props:**

```typescript
{
  title: string;              // Card title (e.g., "Total Links")
  value: string | number;     // Main value to display
  description?: string;       // Optional subtitle
  icon: LucideIcon;          // Icon component from lucide-react
  trend?: {                  // Optional trend indicator
    value: number;           // Percentage change
    isPositive: boolean;     // Up or down trend
  };
}
```

**Features:**

- Icon in header
- Large bold value
- Optional description text
- Trend indicator with color coding
  - Green ↑ for positive trends
  - Red ↓ for negative trends
- Responsive design

**Usage Example:**

```tsx
<StatsCard
  title="Total Clicks"
  value={1543}
  description="All time"
  icon={MousePointerClick}
  trend={{ value: 8.5, isPositive: true }}
/>
```

---

### 2. Quick Create Link

**Location:** `src/components/dashboard/quick-create-link.tsx`

**Purpose:** Fast link creation form directly from dashboard

**Features:**

- URL input with validation
- Optional custom short code
- Random code generator button
- Form validation with Zod
- Loading states
- Toast notifications
- Auto-reset on success

**Form Fields:**

- **Long URL** (required)
  - Must be valid URL format
  - Placeholder: "https://example.com/very-long-url"

- **Custom Short Code** (optional)
  - Alphanumeric, hyphens, underscores only
  - Random generator button (sparkles icon)
  - Placeholder: "my-link"

**Validation Rules:**

```typescript
{
  originalUrl: z.string().url('Please enter a valid URL'),
  shortCode: z.string()
    .optional()
    .refine((val) => !val || /^[a-zA-Z0-9_-]+$/.test(val), {
      message: 'Only letters, numbers, hyphens and underscores allowed'
    })
}
```

**User Flow:**

1. User enters long URL
2. Optionally enters custom short code or clicks random generator
3. Submits form
4. On success: Toast notification + form resets
5. On error: Toast with error message

---

### 3. Recent Links Table

**Location:** `src/components/dashboard/recent-links-table.tsx`

**Purpose:** Display recent links with quick actions

**Props:**

```typescript
{
  links: Link[];  // Array of link objects
}

interface Link {
  id: string;
  shortCode: string;
  originalUrl: string;
  title?: string;
  clicks: number;
  isActive: boolean;
  createdAt: string;
}
```

**Features:**

- Responsive table layout
- Copy link to clipboard
- Link status badges
- Action dropdown menu
- Empty state message
- Date formatting
- Click count display

**Table Columns:**

1. **Short Link** - Short code with copy button
2. **Original URL** - Title or URL (truncated)
3. **Clicks** - Click count with chart icon
4. **Status** - Active/Inactive badge
5. **Created** - Formatted date
6. **Actions** - Dropdown menu

**Actions Menu:**

- Visit Link
- View Analytics
- Generate QR
- Edit
- Delete (destructive)

**Empty State:**
Shows message when no links exist: "No links created yet. Create your first link to get started!"

---

## Layout

### Dashboard Home Layout

```
┌─────────────────────────────────────────────┐
│ Header (Title + Create Link Button)         │
├─────────────────────────────────────────────┤
│ Stats Cards (4 columns)                     │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│
│ │Links   │ │Clicks  │ │Views   │ │Rate    ││
│ └────────┘ └────────┘ └────────┘ └────────┘│
├─────────────────────────────────────────────┤
│ Main Content Grid (3 columns)              │
│ ┌──────────┐ ┌─────────────────────────────┐│
│ │Quick     │ │Recent Links Table           ││
│ │Create    │ │                             ││
│ │Form      │ │                             ││
│ └──────────┘ └─────────────────────────────┘│
└─────────────────────────────────────────────┘
```

### Responsive Breakpoints

- **Mobile (<768px):** Single column, stacked layout
- **Tablet (768px-1024px):** 2-column stats, stacked main content
- **Desktop (>1024px):** 4-column stats, 3-column main content

---

## Statistics Displayed

### Current Metrics (Mock Data)

1. **Total Links**: 24
   - All-time count
   - Trend: +12%

2. **Total Clicks**: 1,543
   - All-time count
   - Trend: +8.5%

3. **Total Views**: 2,108
   - All-time count
   - Trend: -3.2%

4. **Click Rate**: 73.2%
   - Average click-through rate
   - Trend: +5.1%

### Future Metrics

- Active links count
- Links created this month
- Top performing link
- Geographic distribution
- Device breakdown
- Time-based analytics

---

## Mock Data

### Recent Links (5 items)

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
  },
  // ... 4 more items
];
```

**Data will be replaced with:**

- API call to `/stats` endpoint for metrics
- API call to `/links?limit=5&sort=createdAt:desc` for recent links

---

## User Interactions

### Copy to Clipboard

- Click copy button next to short code
- Copies full URL to clipboard
- Shows success toast
- URL format: `{window.location.origin}/{shortCode}`

### Quick Create

- Enter URL and optional short code
- Click "Create Short Link" button
- Loading state during API call
- Success: Toast + form reset
- Error: Toast with error message

### View All Links

- Click "View All" button
- Navigate to `/dashboard/links` (full links management)

### Create Link (Header)

- Click "Create Link" button in header
- Navigate to full link creation page or open modal

---

## Styling

### Color Scheme

- Stats cards: Card background
- Trend indicators: Green (#10b981) / Red (#ef4444)
- Primary actions: Primary color
- Secondary text: Muted foreground
- Badges: Default (active) / Secondary (inactive)

### Typography

- Page title: 3xl bold
- Card titles: sm medium
- Stats values: 2xl bold
- Trend text: xs medium
- Table text: Base

### Spacing

- Page padding: 6 (1.5rem)
- Section gaps: 6 (1.5rem)
- Card gaps: 4 (1rem)
- Component spacing: Consistent with design system

---

## Icons Used (lucide-react)

- `Link2` - Links metric & branding
- `MousePointerClick` - Clicks metric
- `Eye` - Views metric
- `TrendingUp` - Click rate metric
- `Sparkles` - Random code generator
- `Copy` - Copy to clipboard
- `BarChart2` - Analytics actions
- `QrCode` - QR code actions
- `ExternalLink` - Visit link
- `MoreHorizontal` - Actions menu

---

## API Integration (TODO)

### Endpoints Needed

```typescript
// Get dashboard stats
GET /stats
Response: {
  totalLinks: number;
  totalClicks: number;
  totalViews: number;
  clickRate: number;
  trends: {
    links: number;
    clicks: number;
    views: number;
    clickRate: number;
  };
}

// Get recent links
GET /links?limit=5&sort=createdAt:desc
Response: {
  data: Link[];
  total: number;
}

// Create link (already exists)
POST /links
Request: {
  originalUrl: string;
  shortCode?: string;
}
Response: Link
```

---

## Performance Considerations

### Optimizations

- Client-side rendering for interactivity
- Optimistic UI updates for quick actions
- Debounced search/filter inputs
- Pagination for large datasets
- Memoized components to prevent re-renders

### Future Improvements

- Server-side rendering for initial stats
- React Query for data caching
- Skeleton loaders for loading states
- Virtual scrolling for large tables
- Real-time updates via WebSockets

---

## Accessibility

### Current Features

- Semantic HTML
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus indicators
- Screen reader friendly

### Future Enhancements

- Keyboard shortcuts
- Skip navigation links
- High contrast mode
- Reduced motion support

---

## File Structure

```
src/app/dashboard/
└── page.tsx                        # Dashboard home page

src/components/dashboard/
├── stats-card.tsx                  # Individual stat card
├── quick-create-link.tsx           # Quick link creation form
├── recent-links-table.tsx          # Recent links table
├── sidebar.tsx                     # Navigation sidebar
└── header.tsx                      # Top header
```

---

## Testing Checklist

### Dashboard Page

- [ ] Page loads without errors
- [ ] All stats display correctly
- [ ] Stats cards show trend indicators
- [ ] Quick create form validates input
- [ ] Recent links table renders
- [ ] Copy to clipboard works
- [ ] Empty state shows when no links
- [ ] Responsive on mobile/tablet/desktop

### Stats Card

- [ ] Icon displays correctly
- [ ] Value formats properly
- [ ] Trend shows correct color
- [ ] Description text visible

### Quick Create

- [ ] URL validation works
- [ ] Custom code validation works
- [ ] Random generator creates code
- [ ] Form submits successfully
- [ ] Loading state shows
- [ ] Success toast appears
- [ ] Form resets after success

### Recent Links Table

- [ ] Table displays all columns
- [ ] Copy button works
- [ ] Status badges correct
- [ ] Dates format properly
- [ ] Actions menu opens
- [ ] All menu items clickable
- [ ] Empty state shows

---

## Future Enhancements

### Planned Features

- [ ] Time range selector for stats (7d, 30d, 90d, all)
- [ ] Export dashboard data
- [ ] Customizable dashboard widgets
- [ ] Drag-and-drop widget layout
- [ ] Quick filters for recent links
- [ ] Bulk actions for links
- [ ] Chart visualizations
- [ ] Activity feed/timeline

### UX Improvements

- [ ] Animated stat transitions
- [ ] Confetti on milestones
- [ ] Inline editing for link titles
- [ ] Drag to reorder recent links
- [ ] Preview link before creating
- [ ] Link templates/presets

---

**Created:** October 6, 2025
**Status:** ✅ Complete
**Next Feature:** Links Management
