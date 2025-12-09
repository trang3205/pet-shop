## Unread Contact Messages Feature - Setup Instructions

### 1. Database Migration

Run this SQL in your Supabase SQL Editor to add the `is_read` column to the contacts table:

```sql
ALTER TABLE contacts ADD COLUMN is_read BOOLEAN DEFAULT false NOT NULL;
```

### 2. Features Added:

✅ **Unread Badge in Sidebar**: Contact menu shows number of unread messages
✅ **Unread Row Highlighting**: Unread messages have yellow background and red border
✅ **New Badge**: "New" badge appears next to unread message names
✅ **Mark as Read**: Clicking the eye icon marks a message as read
✅ **Animated Badge**: Unread count badge pulses to grab attention
✅ **Fade Animation**: Rows smoothly transition when marked as read

### 3. How It Works:

- New contact form submissions are saved with `is_read = false`
- Admin dashboard shows unread count in the sidebar
- Clicking the eye icon on a message marks it as read
- Visual styling immediately updates to show it's been read
- Dashboard automatically refreshes to show updated unread count

### 4. Components Modified:

- `routes/admin.route.js` - Added `/contacts/:id/read` PUT route, added unreadCount query
- `routes/home.route.js` - Contact form now saves with `is_read: false`
- `views/vwAdmin/contacts.handlebars` - Added unread indicator, badge, animations
- `views/partials/adminSidebar.handlebars` - Shows unread count badge
- `middlewares/auth.js` - New `getUnreadContactCount` middleware
- `app.js` - Import and use new middleware

### 5. Styling & Animations:

- Pulse animation on unread badge (2s cycle)
- Smooth fade out when marking as read
- Yellow highlight (#fff3cd) for unread rows
- Red border on left side of unread rows
- Red and danger badges for unread status

### 6. Testing:

1. Submit a contact form from the public site
2. Check admin dashboard - unread count should appear
3. Go to Contact page - message should be highlighted
4. Click eye icon to view - message marks as read
5. Row styling updates immediately
6. Unread badge disappears from sidebar when all read
